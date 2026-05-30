-- Phase 14A: Real Social Intelligence
-- platform_connections: canonical hub for all platform connection states
create table if not exists platform_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  platform text not null,
  -- platform: 'youtube' | 'tiktok' | 'instagram' | 'facebook'
  status text not null default 'disconnected',
  -- status: 'connected' | 'disconnected' | 'error'
  channel_id text,
  channel_name text,
  last_synced_at timestamptz,
  video_count integer default 0,
  error_message text,
  unique(user_id, platform)
);

alter table platform_connections enable row level security;
create policy "Users manage their own connections"
  on platform_connections for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- content_performance: normalized cross-platform performance snapshots
create table if not exists content_performance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  platform text not null,
  -- platform: 'youtube' | 'tiktok'
  external_id text not null,
  -- youtube_video_id or tiktok post id
  title text not null,
  category text not null default 'Other',
  -- category: one of the 7 parenting categories
  views integer default 0,
  likes integer default 0,
  comments integer default 0,
  published_at timestamptz,
  synced_at timestamptz default now() not null,
  thumbnail_url text,
  unique(user_id, platform, external_id)
);

alter table content_performance enable row level security;
create policy "Users manage their own performance data"
  on content_performance for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index content_performance_user_platform_idx on content_performance(user_id, platform, published_at desc);
create index content_performance_category_idx on content_performance(user_id, category);

-- sync_logs: audit trail for all sync operations
create table if not exists sync_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  platform text not null,
  started_at timestamptz default now() not null,
  completed_at timestamptz,
  status text not null,
  -- status: 'success' | 'error' | 'partial'
  videos_synced integer default 0,
  videos_created integer default 0,
  error_message text
);

alter table sync_logs enable row level security;
create policy "Users view their own sync logs"
  on sync_logs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index sync_logs_user_idx on sync_logs(user_id, started_at desc);
