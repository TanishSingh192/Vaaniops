create type public.app_role as enum ('admin','operator','viewer');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  email text,
  created_at timestamptz not null default now()
);
grant select, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "own profile read" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "own profile update" on public.profiles for update to authenticated using (auth.uid() = id);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id = _user_id and role = _role) $$;

create or replace function public.can_operate(_user_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id = _user_id and role in ('admin','operator')) $$;

create policy "own roles read" on public.user_roles for select to authenticated using (auth.uid() = user_id or public.has_role(auth.uid(),'admin'));

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)), new.email);
  if not exists (select 1 from public.user_roles where role = 'admin') then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  else
    insert into public.user_roles (user_id, role) values (new.id, 'viewer');
  end if;
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- BFSI domain
create table public.customers (
  id text primary key,
  name text not null,
  masked_account text not null,
  phone text, email text,
  preferred_language text not null default 'hi-IN',
  verification_status text not null default 'unverified',
  account_status text not null default 'active',
  created_at timestamptz not null default now()
);
create table public.cards (
  id uuid primary key default gen_random_uuid(),
  customer_id text not null references public.customers(id) on delete cascade,
  card_type text not null, last_four text not null,
  status text not null default 'active',
  created_at timestamptz not null default now()
);
create table public.transactions (
  id text primary key,
  customer_id text not null references public.customers(id) on delete cascade,
  upi_reference text, amount numeric(12,2) not null, merchant text not null,
  txn_type text not null default 'debit', status text not null,
  payment_method text not null default 'UPI', reversal_status text not null default 'none',
  occurred_at timestamptz not null default now()
);
create table public.disputes (
  id text primary key default ('DSP-' || upper(substr(md5(random()::text),1,8))),
  customer_id text not null references public.customers(id) on delete cascade,
  transaction_id text references public.transactions(id),
  category text not null, amount numeric(12,2) not null, description text,
  priority text not null default 'medium', status text not null default 'submitted',
  assigned_team text default 'Disputes Ops', resolution_notes text,
  idempotency_key text unique,
  created_at timestamptz not null default now()
);
create table public.voice_sessions (
  id uuid primary key default gen_random_uuid(),
  customer_id text references public.customers(id),
  language text, status text not null default 'active',
  workflow text, outcome text, avg_latency_ms int,
  started_at timestamptz not null default now(), ended_at timestamptz,
  is_demo boolean not null default false
);
create table public.tools (
  name text primary key, description text not null,
  input_schema jsonb not null default '{}', output_schema jsonb not null default '{}',
  risk text not null default 'low', requires_verification boolean not null default false,
  timeout_ms int not null default 5000, retries int not null default 1,
  enabled boolean not null default true
);
create table public.tool_executions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.voice_sessions(id) on delete cascade,
  tool_name text not null, arguments jsonb, result jsonb,
  status text not null, latency_ms int,
  created_at timestamptz not null default now()
);
create table public.agents (
  id uuid primary key default gen_random_uuid(),
  name text not null, description text, industry text default 'BFSI',
  system_instructions text, languages text[] default '{hi-IN,en-IN,mr-IN}',
  tools text[] default '{}', version int not null default 1,
  status text not null default 'draft', created_at timestamptz not null default now()
);
create table public.workflows (
  id uuid primary key default gen_random_uuid(),
  key text unique not null, name text not null, description text,
  nodes jsonb not null default '[]', version int not null default 1,
  status text not null default 'draft', created_at timestamptz not null default now()
);
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor text not null, action text not null, entity text, entity_id text,
  details jsonb, created_at timestamptz not null default now()
);
create table public.security_events (
  id uuid primary key default gen_random_uuid(),
  severity text not null, event text not null, details jsonb,
  created_at timestamptz not null default now()
);

do $$ declare t text; begin
  foreach t in array array['customers','cards','transactions','disputes','voice_sessions','tools','tool_executions','agents','workflows','audit_logs','security_events'] loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "staff read" on public.%I for select to authenticated using (true)', t);
    execute format('create policy "operators insert" on public.%I for insert to authenticated with check (public.can_operate(auth.uid()))', t);
    execute format('create policy "operators update" on public.%I for update to authenticated using (public.can_operate(auth.uid()))', t);
    execute format('create policy "admins delete" on public.%I for delete to authenticated using (public.has_role(auth.uid(),''admin''))', t);
  end loop;
end $$;
-- audit log is append-only
drop policy "operators update" on public.audit_logs;
drop policy "admins delete" on public.audit_logs;

-- Seed demo data
insert into public.customers (id,name,masked_account,phone,email,preferred_language,verification_status) values
('CUST-1001','Rohan Mehta','XXXX XXXX 4821','+91 98XXX XX201','rohan.m@example.in','hi-IN','verified'),
('CUST-1002','Priya Deshpande','XXXX XXXX 7734','+91 97XXX XX455','priya.d@example.in','mr-IN','verified'),
('CUST-1003','Arjun Nair','XXXX XXXX 1190','+91 99XXX XX812','arjun.n@example.in','en-IN','unverified'),
('CUST-1004','Sneha Kulkarni','XXXX XXXX 3302','+91 96XXX XX067','sneha.k@example.in','mr-IN','verified'),
('CUST-1005','Vikram Singh','XXXX XXXX 9058','+91 95XXX XX390','vikram.s@example.in','hi-IN','verified');

insert into public.cards (customer_id,card_type,last_four,status) values
('CUST-1001','Virtual Debit','4821','active'),('CUST-1002','Credit','7734','active'),
('CUST-1003','Virtual Debit','1190','active'),('CUST-1004','Debit','3302','frozen'),('CUST-1005','Credit','9058','active');

insert into public.transactions (id,customer_id,upi_reference,amount,merchant,status,occurred_at) values
('TXN-DEMO-001','CUST-1001','UPI4021558731',4000,'Sharma Electronics','failed', now()-interval '2 days'),
('TXN-DEMO-002','CUST-1001','UPI4021559012',1250,'Swiggy','successful', now()-interval '3 days'),
('TXN-DEMO-003','CUST-1002','UPI4021560044',899,'Amazon Pay','successful', now()-interval '1 day 2 hours'),
('TXN-DEMO-004','CUST-1002','UPI4021560045',899,'Amazon Pay','successful', now()-interval '1 day 1 hour 58 minutes'),
('TXN-DEMO-005','CUST-1003','UPI4021561200',15000,'Unknown Merchant 7X','successful', now()-interval '6 hours'),
('TXN-DEMO-006','CUST-1004','UPI4021561877',2300,'BigBasket','pending', now()-interval '5 hours'),
('TXN-DEMO-007','CUST-1005','UPI4021562230',540,'Uber India','reversed', now()-interval '4 days'),
('TXN-DEMO-008','CUST-1005','UPI4021562990',7800,'Croma','under_investigation', now()-interval '1 day');

insert into public.disputes (id,customer_id,transaction_id,category,amount,description,priority,status) values
('DSP-DEMO-0001','CUST-1005','TXN-DEMO-008','failed_payment',7800,'Amount debited, merchant reports not received','high','under_investigation');

insert into public.tools (name,description,risk,requires_verification) values
('get_customer_profile','Fetch masked customer profile','low',false),
('verify_customer','Verify customer identity via OTP/KBA','medium',false),
('get_transaction','Fetch a transaction by reference','low',true),
('search_transactions','Search customer transactions by filters','low',true),
('check_transaction_status','Get current transaction status','low',true),
('check_dispute_eligibility','Apply dispute rules to a transaction','low',true),
('create_dispute_ticket','Create a dispute ticket (idempotent)','medium',true),
('get_dispute_status','Get status of a dispute','low',true),
('freeze_virtual_card','Freeze a virtual card — requires explicit confirmation','high',true),
('initiate_refund_review','Open a simulated refund review','high',true),
('send_customer_notification','Send a simulated SMS/email notification','medium',true),
('trigger_webhook','Call a pre-registered allowlisted webhook','high',true),
('escalate_to_human','Hand session to a human agent','low',false);

insert into public.agents (name,description,system_instructions,tools,status) values
('Vaani Banking Assistant','Handles UPI failures, duplicates and card fraud for retail banking','You are a concise, polite banking assistant. Reply in the customer''s language. Never claim real money movement.', '{get_customer_profile,verify_customer,get_transaction,search_transactions,check_dispute_eligibility,create_dispute_ticket,freeze_virtual_card,escalate_to_human}','published');

insert into public.workflows (key,name,description,status,nodes) values
('upi_dispute_investigation','Failed UPI payment','Investigate a failed UPI debit and raise a dispute if eligible','published','["voice_input","transcription","intent_detection","authentication","get_transaction","check_dispute_eligibility","create_dispute_ticket","tts","end"]'),
('duplicate_transaction','Duplicate transaction','Detect duplicate debits and raise a dispute','published','["voice_input","transcription","intent_detection","authentication","search_transactions","conditional_branch","create_dispute_ticket","tts","end"]'),
('card_fraud_freeze','Suspicious card activity','Verify, confirm and freeze a virtual card','published','["voice_input","transcription","intent_detection","authentication","human_approval","freeze_virtual_card","send_customer_notification","tts","end"]');