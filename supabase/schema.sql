create table if not exists public.player_accounts (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  display_name text not null,
  password_hash text not null,
  created_at timestamptz not null default now()
);

alter table public.player_accounts enable row level security;

drop policy if exists "Allow public game account read" on public.player_accounts;
drop policy if exists "Allow public game account insert" on public.player_accounts;

create policy "Allow public game account read"
on public.player_accounts
for select
to anon
using (true);

create policy "Allow public game account insert"
on public.player_accounts
for insert
to anon
with check (true);

create table if not exists public.game_saves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.player_accounts(id) on delete cascade,
  slot_number integer not null check (slot_number between 1 and 5),
  game_state_json jsonb not null,
  updated_at timestamptz not null default now(),
  unique (user_id, slot_number)
);

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'game_saves'
      and column_name = 'player_id'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'game_saves'
      and column_name = 'user_id'
  ) then
    alter table public.game_saves rename column player_id to user_id;
  end if;
end $$;

create unique index if not exists game_saves_user_id_slot_number_idx
on public.game_saves (user_id, slot_number);

alter table public.game_saves enable row level security;

drop policy if exists "Allow public game save read" on public.game_saves;
drop policy if exists "Allow public game save insert" on public.game_saves;
drop policy if exists "Allow public game save update" on public.game_saves;
drop policy if exists "Allow public game save delete" on public.game_saves;

create policy "Allow public game save read"
on public.game_saves
for select
to anon
using (true);

create policy "Allow public game save insert"
on public.game_saves
for insert
to anon
with check (true);

create policy "Allow public game save update"
on public.game_saves
for update
to anon
using (true)
with check (true);

create policy "Allow public game save delete"
on public.game_saves
for delete
to anon
using (true);

create table if not exists public.records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.player_accounts(id) on delete cascade,
  playtime integer,
  clear_floor integer,
  advisor_id text,
  final_capital numeric,
  credit_grade text,
  profit_turns integer,
  loss_turns integer,
  max_share numeric,
  bankruptcy_count integer,
  external_events integer,
  event_success_rate numeric,
  rival_dominated integer,
  created_at timestamptz not null default now()
);

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'records'
      and column_name = 'player_id'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'records'
      and column_name = 'user_id'
  ) then
    alter table public.records rename column player_id to user_id;
  end if;
end $$;

alter table public.records enable row level security;

drop policy if exists "Allow public records read" on public.records;
drop policy if exists "Allow public records insert" on public.records;

create policy "Allow public records read"
on public.records
for select
to anon
using (true);

create policy "Allow public records insert"
on public.records
for insert
to anon
with check (true);
