-- Weekly Backup System
-- Stores snapshots of weekly_batches + batch_posts before any overwrite.
-- Allows one-click restore of a previous week's plan.

create table if not exists weekly_backups (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  week_start date not null,
  label text not null default '',
  batch_data jsonb not null default '{}',
  posts_data jsonb not null default '[]',
  post_count integer not null default 0,
  created_at timestamptz default now(),
  restored_at timestamptz
);

create index if not exists weekly_backups_user_week
  on weekly_backups (user_id, week_start, created_at desc);

alter table weekly_backups enable row level security;

create policy "Users manage own backups"
  on weekly_backups for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
