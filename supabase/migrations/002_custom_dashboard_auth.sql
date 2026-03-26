alter table public.profiles drop constraint if exists profiles_id_fkey;

alter table public.profiles alter column id set default uuid_generate_v4();

alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists password_hash text;
alter table public.profiles add column if not exists created_at timestamptz default now();

create unique index if not exists idx_profiles_username on public.profiles (lower(username));

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();