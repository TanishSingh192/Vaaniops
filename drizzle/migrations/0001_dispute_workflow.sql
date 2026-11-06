alter table public.disputes
  add column if not exists assigned_to uuid,
  add column if not exists assigned_at timestamptz,
  add column if not exists resolved_at timestamptz,
  add column if not exists closed_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

create table public.dispute_events (
  id uuid primary key default gen_random_uuid(),
  dispute_id text not null references public.disputes(id) on delete cascade,
  actor uuid not null,
  kind text not null,
  from_status text,
  to_status text,
  note text,
  created_at timestamptz not null default now()
);
grant select, insert on public.dispute_events to authenticated;
grant all on public.dispute_events to service_role;
alter table public.dispute_events enable row level security;
create policy "staff read" on public.dispute_events for select to authenticated using (true);
create policy "operators insert own" on public.dispute_events for insert to authenticated
  with check (public.can_operate(auth.uid()) and actor = auth.uid());

-- Operators directory (names only) for assignment
create or replace function public.list_operators()
returns table (id uuid, display_name text, email text)
language sql stable security definer set search_path = public
as $$
  select p.id, p.display_name, p.email from public.profiles p
  where public.can_operate(auth.uid())
    and exists (select 1 from public.user_roles r where r.user_id = p.id and r.role in ('admin','operator'))
$$;
grant execute on function public.list_operators() to authenticated;

-- Admins can manage roles
create policy "admins manage roles" on public.user_roles for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
grant insert, delete on public.user_roles to authenticated;
create policy "admins read profiles" on public.profiles for select to authenticated using (public.has_role(auth.uid(),'admin'));