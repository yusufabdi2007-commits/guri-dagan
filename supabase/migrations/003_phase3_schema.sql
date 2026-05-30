-- ============================================================
-- PHASE 3 SCHEMA — Hooyada Coaching OS
-- Production, Automation & Real-World Operations
-- ============================================================

-- ============================================================
-- PROFILES TABLE
-- Replaces all hardcoded user settings (weekly_goal, platform, etc.)
-- ============================================================
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  display_name text,
  weekly_goal integer not null default 5,
  preferred_platform text default 'TikTok'
    check (preferred_platform in ('TikTok', 'YouTube', 'Instagram', 'Facebook')),
  coach_tone text default 'Warm & Encouraging',
  timezone text default 'UTC',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.profiles enable row level security;
create policy "Own profile" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create trigger handle_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();

-- ============================================================
-- CONTENT MEMORY TABLE
-- Tracks all topics/hooks used to prevent repetition
-- ============================================================
create table if not exists public.content_memory (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  topic text not null,
  category text,
  platform text,
  hook_used text,
  tone_used text,
  times_used integer not null default 1,
  last_used_at timestamptz default now() not null,
  created_at timestamptz default now() not null
);

alter table public.content_memory enable row level security;
create policy "Own content_memory" on public.content_memory for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists idx_content_memory_user on public.content_memory(user_id);
create index if not exists idx_content_memory_topic on public.content_memory(user_id, topic);

-- ============================================================
-- REPURPOSED ASSETS TABLE
-- Stores AI-generated multi-platform assets from one video/transcript
-- ============================================================
create table if not exists public.repurposed_assets (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  source_title text,
  source_transcript text,
  source_idea_id uuid references public.content_ideas(id) on delete set null,
  assets jsonb not null default '[]'::jsonb,
  -- assets: [{type, platform, content, used, created_at}, ...]
  asset_count integer not null default 0,
  created_at timestamptz default now() not null
);

alter table public.repurposed_assets enable row level security;
create policy "Own repurposed_assets" on public.repurposed_assets for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists idx_repurposed_assets_user on public.repurposed_assets(user_id);

-- ============================================================
-- COACHING PACKAGES TABLE
-- Services offered by the coach
-- ============================================================
create table if not exists public.coaching_packages (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  description text,
  price_usd numeric(10, 2),
  currency text default 'USD',
  sessions_included integer,
  duration_weeks integer,
  type text not null default 'individual'
    check (type in ('individual', 'group', 'workshop', 'course')),
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.coaching_packages enable row level security;
create policy "Own coaching_packages" on public.coaching_packages for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists idx_coaching_packages_user on public.coaching_packages(user_id, active);

create trigger handle_coaching_packages_updated_at
  before update on public.coaching_packages
  for each row execute procedure public.handle_updated_at();

-- ============================================================
-- BOOKING REQUESTS TABLE
-- Inbound interest from potential clients
-- ============================================================
create table if not exists public.booking_requests (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  client_name text not null,
  email text,
  phone text,
  package_id uuid references public.coaching_packages(id) on delete set null,
  package_name text, -- snapshot in case package is deleted
  message text,
  status text not null default 'New'
    check (status in ('New', 'Contacted', 'Booked', 'Declined')),
  source text default 'Direct', -- TikTok, YouTube, Instagram, etc.
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.booking_requests enable row level security;
create policy "Own booking_requests" on public.booking_requests for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists idx_booking_requests_user on public.booking_requests(user_id, status);
create index if not exists idx_booking_requests_status on public.booking_requests(status);

create trigger handle_booking_requests_updated_at
  before update on public.booking_requests
  for each row execute procedure public.handle_updated_at();

-- ============================================================
-- ANNOUNCEMENTS TABLE (Community / Audience Updates)
-- ============================================================
create table if not exists public.announcements (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  content text not null,
  type text not null default 'update'
    check (type in ('update', 'win', 'reminder', 'resource', 'event')),
  pinned boolean not null default false,
  platforms text[] default '{}',
  created_at timestamptz default now() not null
);

alter table public.announcements enable row level security;
create policy "Own announcements" on public.announcements for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists idx_announcements_user on public.announcements(user_id);
create index if not exists idx_announcements_pinned on public.announcements(pinned) where pinned = true;

-- ============================================================
-- PERFORMANCE INDEXES on existing Phase 1 tables
-- ============================================================
create index if not exists idx_content_ideas_user_status on public.content_ideas(user_id, status);
create index if not exists idx_content_ideas_user_platform on public.content_ideas(user_id, platform);
create index if not exists idx_content_ideas_user_category on public.content_ideas(user_id, category);
create index if not exists idx_content_ideas_created on public.content_ideas(user_id, created_at desc);

create index if not exists idx_daily_completions_user_date on public.daily_completions(user_id, completed_date desc);
create index if not exists idx_daily_completions_date on public.daily_completions(completed_date);

create index if not exists idx_videos_user_status on public.videos(user_id, status);
create index if not exists idx_calendar_items_user_date on public.calendar_items(user_id, scheduled_date);
