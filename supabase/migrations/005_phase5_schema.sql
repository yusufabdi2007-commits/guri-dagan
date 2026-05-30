-- ============================================================
-- PHASE 5 SCHEMA — Go-Live + Real Creator Intelligence
-- ============================================================

-- ============================================================
-- TIKTOK POSTS — Manual performance tracking
-- ============================================================
create table if not exists public.tiktok_posts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  posted_at date not null,
  views integer not null default 0,
  likes integer not null default 0,
  shares integer not null default 0,
  saves integer not null default 0,
  comments integer not null default 0,
  completion_rate numeric(5, 2) default 0, -- percentage 0-100
  emotional_tag text check (emotional_tag in ('inspiring', 'funny', 'educational', 'emotional', 'practical', 'story')),
  topic_category text,
  hook_text text,
  notes text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.tiktok_posts enable row level security;
create policy "Own tiktok_posts" on public.tiktok_posts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists idx_tiktok_posts_user_date on public.tiktok_posts(user_id, posted_at desc);
create index if not exists idx_tiktok_posts_views on public.tiktok_posts(user_id, views desc);

create trigger handle_tiktok_posts_updated_at
  before update on public.tiktok_posts
  for each row execute procedure public.handle_updated_at();

-- ============================================================
-- WEEKLY REPORTS — Cached AI-generated creator insights
-- ============================================================
create table if not exists public.weekly_reports (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  week_start date not null,
  week_end date not null,
  posts_this_week integer not null default 0,
  posts_last_week integer not null default 0,
  streak_at_generation integer not null default 0,
  top_category text,
  ai_summary text,
  ai_wins text,
  ai_warnings text,
  ai_next_week jsonb default '[]'::jsonb, -- array of action strings
  created_at timestamptz default now() not null,
  unique(user_id, week_start)
);

alter table public.weekly_reports enable row level security;
create policy "Own weekly_reports" on public.weekly_reports
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists idx_weekly_reports_user on public.weekly_reports(user_id, week_start desc);

-- ============================================================
-- YOUTUBE CONFIG — Per-user YouTube channel connection
-- ============================================================
create table if not exists public.youtube_config (
  id uuid references auth.users(id) on delete cascade primary key,
  channel_id text,
  channel_name text,
  last_synced_at timestamptz,
  sync_enabled boolean not null default false,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.youtube_config enable row level security;
create policy "Own youtube_config" on public.youtube_config
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- ============================================================
-- VIDEOS table upgrades — favorites + emotional tags + archive
-- ============================================================
alter table public.videos
  add column if not exists is_favorite boolean not null default false,
  add column if not exists emotional_tags text[] default '{}',
  add column if not exists archived boolean not null default false,
  add column if not exists youtube_video_id text; -- extracted YouTube video ID for API sync

create index if not exists idx_videos_favorites on public.videos(user_id, is_favorite) where is_favorite = true;
create index if not exists idx_videos_youtube_id on public.videos(youtube_video_id) where youtube_video_id is not null;

-- ============================================================
-- MOMENTUM LOGS — Daily creator momentum tracking
-- ============================================================
create table if not exists public.momentum_logs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  log_date date not null default current_date,
  mode text not null default 'normal' check (mode in ('normal', 'low_energy', 'quick_win')),
  suggestion text not null,
  completed boolean not null default false,
  created_at timestamptz default now() not null,
  unique(user_id, log_date)
);

alter table public.momentum_logs enable row level security;
create policy "Own momentum_logs" on public.momentum_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists idx_momentum_logs_user_date on public.momentum_logs(user_id, log_date desc);

-- ============================================================
-- CONTENT MEMORY upgrades — track performance per topic
-- ============================================================
alter table public.content_memory
  add column if not exists avg_views integer default 0,
  add column if not exists avg_engagement numeric(5, 2) default 0,
  add column if not exists emotional_style text,
  add column if not exists best_performing boolean not null default false;

-- ============================================================
-- TEAM ROLES FOUNDATION — future multi-user support (schema only)
-- ============================================================
create table if not exists public.team_roles (
  id uuid default uuid_generate_v4() primary key,
  owner_user_id uuid references auth.users(id) on delete cascade not null,
  member_email text not null,
  role text not null default 'viewer' check (role in ('admin', 'editor', 'viewer')),
  invited_at timestamptz default now() not null,
  accepted_at timestamptz,
  unique(owner_user_id, member_email)
);

alter table public.team_roles enable row level security;
create policy "Own team_roles" on public.team_roles
  for all using (auth.uid() = owner_user_id) with check (auth.uid() = owner_user_id);

-- ============================================================
-- ENV VARS for Phase 5 (documented, not schema):
-- YOUTUBE_API_KEY — Google Cloud Console → YouTube Data API v3
-- YOUTUBE_API_KEY is stored server-side only (not NEXT_PUBLIC_)
-- ============================================================
