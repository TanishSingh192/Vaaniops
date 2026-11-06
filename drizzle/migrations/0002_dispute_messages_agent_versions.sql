create table public.dispute_messages (
  id uuid primary key default gen_random_uuid(),
  dispute_id text not null references public.disputes(id) on delete cascade,
  sender text not null default 'operator' check (sender in ('operator','customer')),
  author uuid,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
grant select, insert on public.dispute_messages to authenticated;
grant all on public.dispute_messages to service_role;
alter table public.dispute_messages enable row level security;
create policy "staff read messages" on public.dispute_messages for select to authenticated using (true);
create policy "operators write messages" on public.dispute_messages for insert to authenticated with check (public.can_operate(auth.uid()) and author = auth.uid());
create index on public.dispute_messages (dispute_id, created_at);

create table public.agent_versions (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents(id) on delete cascade,
  version int not null,
  nodes jsonb not null default '[]'::jsonb,
  notes text,
  created_by uuid,
  created_at timestamptz not null default now(),
  unique (agent_id, version)
);
grant select, insert on public.agent_versions to authenticated;
grant all on public.agent_versions to service_role;
alter table public.agent_versions enable row level security;
create policy "staff read versions" on public.agent_versions for select to authenticated using (true);
create policy "operators save versions" on public.agent_versions for insert to authenticated with check (public.can_operate(auth.uid()) and created_by = auth.uid());