-- Weekly Content Batching System
-- Run this in the Supabase SQL editor

-- weekly_batches: one per week per user
create table if not exists weekly_batches (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  week_start date not null,           -- Monday of the week
  theme text not null,
  youtube_title text,
  youtube_notes text,
  status text default 'planned' check (status in ('planned', 'recording', 'editing', 'live')),
  recording_completed boolean default false,
  created_at timestamptz default now(),
  unique(user_id, week_start)
);

-- batch_posts: individual scheduled posts from the batch
create table if not exists batch_posts (
  id uuid default gen_random_uuid() primary key,
  batch_id uuid references weekly_batches(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  scheduled_date date not null,
  platform text not null check (platform in ('youtube', 'tiktok')),
  title text not null,
  angle_notes text,
  sort_order integer default 0,
  status text default 'scheduled' check (status in ('scheduled', 'editing', 'ready', 'posted', 'overdue')),
  posted_at timestamptz,
  created_at timestamptz default now()
);

-- RLS
alter table weekly_batches enable row level security;
alter table batch_posts enable row level security;

create policy "Users own their weekly batches"
  on weekly_batches for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users own their batch posts"
  on batch_posts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Indexes for fast lookups
create index if not exists idx_weekly_batches_user_week
  on weekly_batches(user_id, week_start desc);

create index if not exists idx_batch_posts_batch_id
  on batch_posts(batch_id);

create index if not exists idx_batch_posts_user_date
  on batch_posts(user_id, scheduled_date);
