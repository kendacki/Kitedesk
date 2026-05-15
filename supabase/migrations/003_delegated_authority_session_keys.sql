-- Add delegated-authority fields to the existing session_keys table without changing contract code.
-- This keeps the current session key flow intact while exposing the main wallet and delegation signature
-- needed by the new Supabase Edge Function relayer.

alter table public.session_keys
  add column if not exists main_wallet_address text,
  add column if not exists delegation_signature text;

-- Backfill existing rows so legacy session-key records still have a main wallet address.
update public.session_keys
set main_wallet_address = coalesce(main_wallet_address, user_smart_wallet)
where main_wallet_address is null
  and user_smart_wallet is not null;

create index if not exists session_keys_main_wallet_address_idx
on public.session_keys (main_wallet_address);

create index if not exists session_keys_session_key_address_idx
on public.session_keys (session_key_address);

-- Keep the delegated main-wallet address aligned with the existing user_smart_wallet field for new inserts.
create or replace function public.session_keys_sync_main_wallet_address()
returns trigger
language plpgsql
as $$
begin
  if new.main_wallet_address is null or length(trim(new.main_wallet_address)) = 0 then
    new.main_wallet_address := new.user_smart_wallet;
  end if;

  return new;
end;
$$;

drop trigger if exists session_keys_sync_main_wallet_address on public.session_keys;

create trigger session_keys_sync_main_wallet_address
before insert or update on public.session_keys
for each row
execute function public.session_keys_sync_main_wallet_address();

alter table public.session_keys enable row level security;
