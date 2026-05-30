-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- CONTENT IDEAS TABLE
-- ============================================================
create table if not exists public.content_ideas (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  hook text not null,
  platform text not null check (platform in ('TikTok', 'YouTube', 'Instagram', 'Facebook')),
  category text not null default 'Parenting Tips',
  status text not null default 'Idea' check (status in ('Idea', 'Recorded', 'Edited', 'Posted')),
  notes text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- ============================================================
-- VIDEOS TABLE
-- ============================================================
create table if not exists public.videos (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  status text not null default 'Recorded' check (status in ('Recorded', 'Editing', 'Edited', 'Posted')),
  platform text not null check (platform in ('TikTok', 'YouTube', 'Instagram', 'Facebook')),
  url text,
  thumbnail_url text,
  recorded_at timestamptz,
  edited_at timestamptz,
  posted_at timestamptz,
  notes text,
  idea_id uuid references public.content_ideas(id) on delete set null,
  created_at timestamptz default now() not null
);

-- ============================================================
-- CALENDAR ITEMS TABLE
-- ============================================================
create table if not exists public.calendar_items (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  idea_id uuid references public.content_ideas(id) on delete set null,
  title text not null,
  scheduled_date timestamptz not null,
  status text not null default 'Idea' check (status in ('Idea', 'Recorded', 'Edited', 'Posted')),
  platform text not null check (platform in ('TikTok', 'YouTube', 'Instagram', 'Facebook')),
  created_at timestamptz default now() not null
);

-- ============================================================
-- DAILY COMPLETIONS TABLE (streak tracking)
-- ============================================================
create table if not exists public.daily_completions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  completed_date date not null,
  platform text not null check (platform in ('TikTok', 'YouTube', 'Instagram', 'Facebook')),
  video_id uuid references public.videos(id) on delete set null,
  notes text,
  created_at timestamptz default now() not null,
  -- One completion per user per day per platform
  unique(user_id, completed_date, platform)
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
alter table public.content_ideas enable row level security;
alter table public.videos enable row level security;
alter table public.calendar_items enable row level security;
alter table public.daily_completions enable row level security;

-- Content Ideas Policies
create policy "Users can view their own ideas"
  on public.content_ideas for select
  using (auth.uid() = user_id);

create policy "Users can insert their own ideas"
  on public.content_ideas for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own ideas"
  on public.content_ideas for update
  using (auth.uid() = user_id);

create policy "Users can delete their own ideas"
  on public.content_ideas for delete
  using (auth.uid() = user_id);

-- Videos Policies
create policy "Users can view their own videos"
  on public.videos for select
  using (auth.uid() = user_id);

create policy "Users can insert their own videos"
  on public.videos for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own videos"
  on public.videos for update
  using (auth.uid() = user_id);

create policy "Users can delete their own videos"
  on public.videos for delete
  using (auth.uid() = user_id);

-- Calendar Items Policies
create policy "Users can view their own calendar items"
  on public.calendar_items for select
  using (auth.uid() = user_id);

create policy "Users can insert their own calendar items"
  on public.calendar_items for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own calendar items"
  on public.calendar_items for update
  using (auth.uid() = user_id);

create policy "Users can delete their own calendar items"
  on public.calendar_items for delete
  using (auth.uid() = user_id);

-- Daily Completions Policies
create policy "Users can view their own completions"
  on public.daily_completions for select
  using (auth.uid() = user_id);

create policy "Users can insert their own completions"
  on public.daily_completions for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own completions"
  on public.daily_completions for update
  using (auth.uid() = user_id);

create policy "Users can delete their own completions"
  on public.daily_completions for delete
  using (auth.uid() = user_id);

-- ============================================================
-- INDEXES
-- ============================================================
create index if not exists idx_content_ideas_user_id on public.content_ideas(user_id);
create index if not exists idx_content_ideas_status on public.content_ideas(status);
create index if not exists idx_videos_user_id on public.videos(user_id);
create index if not exists idx_calendar_items_user_id on public.calendar_items(user_id);
create index if not exists idx_calendar_items_date on public.calendar_items(scheduled_date);
create index if not exists idx_daily_completions_user_id on public.daily_completions(user_id);
create index if not exists idx_daily_completions_date on public.daily_completions(completed_date);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger handle_content_ideas_updated_at
  before update on public.content_ideas
  for each row execute procedure public.handle_updated_at();
