-- player_accounts 테이블
create table if not exists public.player_accounts (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  display_name text,
  password_hash text not null,
  user_type text not null default 'general',
  achievements jsonb default '[]'::jsonb,
  education_progress jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- game_saves 테이블
create table if not exists public.game_saves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.player_accounts(id) on delete cascade,
  slot_number integer not null check (slot_number between 1 and 5),
  game_state_json jsonb not null,
  updated_at timestamptz default now(),
  unique(user_id, slot_number)
);

-- records 테이블
create table if not exists public.records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.player_accounts(id) on delete cascade,
  result_type text not null default 'CLEAR',
  clear_grade text,
  advisor_id text,
  final_capital bigint,
  clear_floor integer,
  playtime integer,
  profit_turns integer,
  loss_turns integer,
  max_share float,
  bankruptcy_count integer,
  external_events integer,
  event_success_rate float,
  rival_dominated integer,
  monopol_clears jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

-- RLS 정책
alter table public.player_accounts enable row level security;
alter table public.game_saves enable row level security;
alter table public.records enable row level security;

create policy "본인 계정 접근" on public.player_accounts
  for all using (true);

create policy "본인 저장 데이터 접근" on public.game_saves
  for all using (true);

create policy "본인 기록 접근" on public.records
  for all using (true);
