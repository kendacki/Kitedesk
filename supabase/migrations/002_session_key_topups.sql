-- Track verified session key top-ups
create table if not exists public.session_key_topups (
  id uuid not null default gen_random_uuid(),
  user_smart_wallet text not null,
  session_key_id text not null,
  tx_hash text not null unique,
  amount_usdt numeric not null,
  verified_at timestamp not null default now(),
  created_at timestamp not null default now(),
  primary key (id),
  foreign key (user_smart_wallet, session_key_id) references public.session_keys(user_smart_wallet, key_id) on delete cascade
);

create index if not exists session_key_topups_user_wallet_idx on public.session_key_topups(user_smart_wallet);
create index if not exists session_key_topups_key_id_idx on public.session_key_topups(session_key_id);
create index if not exists session_key_topups_tx_hash_idx on public.session_key_topups(tx_hash);
