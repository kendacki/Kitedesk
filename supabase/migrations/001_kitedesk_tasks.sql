-- KiteDesk | Run in Supabase SQL editor or via CLI migrate
create table if not exists public.kitedesk_tasks (
  payment_tx_hash text primary key,
  user_address text not null,
  status text not null check (status in ('pending', 'completed')),
  task_id text,
  task_type text,
  prompt_preview text,
  attestation_url text,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists kitedesk_tasks_user_completed_idx
  on public.kitedesk_tasks (user_address, completed_at desc)
  where status = 'completed';

alter table public.kitedesk_tasks enable row level security;

-- No public policies: only service role (server) accesses this table.

-- =============================================================================
-- V2 Future Architecture (optional follow-up; keep commented until adopted)
-- Realtime fan-out + authenticated client reads for lighter API usage.
-- =============================================================================
-- alter publication supabase_realtime add table kitedesk_tasks;
-- create policy "Users can view own tasks" on kitedesk_tasks for select using (lower(user_address) = lower(auth.jwt() ->> 'wallet_address'));
