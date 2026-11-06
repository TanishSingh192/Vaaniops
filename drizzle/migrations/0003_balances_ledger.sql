alter table public.customers add column if not exists balance numeric not null default 0;
alter table public.customers add column if not exists is_demo boolean not null default true;
alter table public.transactions add column if not exists is_demo boolean not null default true;

create table public.ledger_entries (
  id uuid primary key default gen_random_uuid(),
  customer_id text not null references public.customers(id) on delete cascade,
  kind text not null check (kind in ('import_opening','dispute_reversal','manual_adjustment')),
  amount numeric not null,
  balance_after numeric not null,
  dispute_id text references public.disputes(id),
  actor uuid,
  note text,
  created_at timestamptz not null default now()
);
grant select on public.ledger_entries to authenticated;
grant all on public.ledger_entries to service_role;
alter table public.ledger_entries enable row level security;
create policy "staff read ledger" on public.ledger_entries for select to authenticated using (true);
create unique index ledger_one_reversal_per_dispute on public.ledger_entries (dispute_id) where kind = 'dispute_reversal';

-- Atomic credit: only callable by operators; one reversal per dispute.
create or replace function public.apply_dispute_reversal(_dispute_id text, _note text)
returns numeric language plpgsql security definer set search_path = public as $$
declare d record; nb numeric;
begin
  if not public.can_operate(auth.uid()) then raise exception 'Not allowed'; end if;
  select * into d from public.disputes where id = _dispute_id;
  if d is null then raise exception 'Dispute not found'; end if;
  if exists (select 1 from public.ledger_entries where dispute_id = _dispute_id and kind = 'dispute_reversal') then
    select balance into nb from public.customers where id = d.customer_id; return nb;
  end if;
  update public.customers set balance = balance + d.amount where id = d.customer_id returning balance into nb;
  insert into public.ledger_entries (customer_id, kind, amount, balance_after, dispute_id, actor, note)
    values (d.customer_id, 'dispute_reversal', d.amount, nb, _dispute_id, auth.uid(), _note);
  if d.transaction_id is not null then update public.transactions set reversal_status = 'reversed' where id = d.transaction_id; end if;
  return nb;
end; $$;
revoke all on function public.apply_dispute_reversal(text, text) from public, anon;
grant execute on function public.apply_dispute_reversal(text, text) to authenticated;

-- Admin CSV import: upsert customers with opening balance, then transactions.
create or replace function public.import_bank_data(_customers jsonb, _transactions jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare c jsonb; t jsonb; nc int := 0; nt int := 0;
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Only admins can import'; end if;
  for c in select * from jsonb_array_elements(coalesce(_customers,'[]'::jsonb)) loop
    insert into public.customers (id, name, masked_account, phone, email, preferred_language, verification_status, balance, is_demo)
    values (c->>'id', c->>'name', c->>'masked_account', nullif(c->>'phone',''), nullif(c->>'email',''),
            coalesce(nullif(c->>'preferred_language',''),'hi-IN'), coalesce(nullif(c->>'verification_status',''),'unverified'),
            coalesce(nullif(c->>'balance','')::numeric,0), false)
    on conflict (id) do update set name = excluded.name, masked_account = excluded.masked_account, phone = excluded.phone, email = excluded.email,
      preferred_language = excluded.preferred_language, verification_status = excluded.verification_status, balance = excluded.balance, is_demo = false;
    insert into public.ledger_entries (customer_id, kind, amount, balance_after, actor, note)
      values (c->>'id', 'import_opening', coalesce(nullif(c->>'balance','')::numeric,0), coalesce(nullif(c->>'balance','')::numeric,0), auth.uid(), 'CSV import');
    nc := nc + 1;
  end loop;
  for t in select * from jsonb_array_elements(coalesce(_transactions,'[]'::jsonb)) loop
    insert into public.transactions (id, customer_id, upi_reference, amount, merchant, txn_type, status, payment_method, occurred_at, is_demo)
    values (t->>'id', t->>'customer_id', nullif(t->>'upi_reference',''), (t->>'amount')::numeric, t->>'merchant',
            coalesce(nullif(t->>'txn_type',''),'debit'), t->>'status', coalesce(nullif(t->>'payment_method',''),'UPI'),
            coalesce(nullif(t->>'occurred_at','')::timestamptz, now()), false)
    on conflict (id) do update set amount = excluded.amount, merchant = excluded.merchant, status = excluded.status,
      upi_reference = excluded.upi_reference, occurred_at = excluded.occurred_at, is_demo = false;
    nt := nt + 1;
  end loop;
  insert into public.audit_logs (actor, action, entity, details) values (auth.uid()::text, 'import_bank_data', 'import', jsonb_build_object('customers', nc, 'transactions', nt));
  return jsonb_build_object('customers', nc, 'transactions', nt);
end; $$;
revoke all on function public.import_bank_data(jsonb, jsonb) from public, anon;
grant execute on function public.import_bank_data(jsonb, jsonb) to authenticated;