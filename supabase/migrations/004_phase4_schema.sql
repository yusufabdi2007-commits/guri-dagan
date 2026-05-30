-- ============================================================
-- PHASE 4 SCHEMA — Deployment, Automation & Operations
-- ============================================================

-- ============================================================
-- VIDEO PERFORMANCE TRACKING
-- Add analytics columns to the existing videos table
-- ============================================================
alter table public.videos
  add column if not exists views integer default 0,
  add column if not exists likes integer default 0,
  add column if not exists saves integer default 0,
  add column if not exists comments integer default 0,
  add column if not exists performance_notes text;

-- Index for sorting by performance
create index if not exists idx_videos_views on public.videos(user_id, views desc);

-- ============================================================
-- PUSH NOTIFICATION SUBSCRIPTIONS
-- Stores Web Push API subscription objects per user/device
-- ============================================================
create table if not exists public.push_subscriptions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz default now() not null,
  unique(user_id, endpoint)
);

alter table public.push_subscriptions enable row level security;
create policy "Own push_subscriptions" on public.push_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists idx_push_subscriptions_user on public.push_subscriptions(user_id);
