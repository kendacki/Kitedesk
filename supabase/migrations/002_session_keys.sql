create table if not exists public.session_keys (
  id uuid primary key default gen_random_uuid(),
  user_smart_wallet text not null,
  session_key_private_key_encrypted text not null,
  session_key_address text not null,
  max_amount_usdt numeric(10, 2) not null,
  daily_limit_usdt numeric(10, 2) not null,
  max_per_tx_usdt numeric(10, 2) not null,
  expires_at timestamptz not null,
  key_id text not null,
  whitelisted_recipients text[] not null,
  revoked boolean not null default false,
  created_at timestamptz not null default now(),
  used_count integer not null default 0,
  
  constraint session_key_per_user_unique unique (user_smart_wallet, key_id),
  constraint valid_max_per_tx check (max_per_tx_usdt <= daily_limit_usdt)
);

create index if not exists session_keys_user_active_idx
  on public.session_keys (user_smart_wallet, revoked, expires_at desc)
  where revoked = false and expires_at > now();

create table if not exists public.session_key_usage (
  id uuid primary key default gen_random_uuid(),
  user_smart_wallet text not null,
  session_key_id text not null,
  amount_usdt numeric(10, 2) not null,
  used_at timestamptz not null default now()
);

create index if not exists session_key_usage_key_id_idx
  on public.session_key_usage (session_key_id, used_at desc);

alter table public.session_keys enable row level security;
alter table public.session_key_usage enable row level security;
