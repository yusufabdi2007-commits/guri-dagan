-- ============================================================
-- PHASE 14B SCHEMA — Client Growth Intelligence
-- Hooyada Coaching OS
-- ============================================================

-- ============================================================
-- LEADS TABLE
-- ============================================================
create table if not exists public.leads (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  phone text,
  email text,
  source text not null default 'other'
    check (source in ('tiktok', 'youtube', 'whatsapp', 'referral', 'existing_client', 'other')),
  stage text not null default 'new_lead'
    check (stage in ('new_lead', 'contacted', 'call_scheduled', 'call_completed', 'client', 'follow_up', 'closed')),
  notes text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- ============================================================
-- LEAD ACTIVITY TABLE (stage change history + notes)
-- ============================================================
create table if not exists public.lead_activity (
  id uuid default gen_random_uuid() primary key,
  lead_id uuid references public.leads(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  activity_type text not null
    check (activity_type in ('created', 'stage_changed', 'note_added', 'attributed')),
  note text,
  from_stage text,
  to_stage text,
  created_at timestamptz default now() not null
);

-- ============================================================
-- CONTENT ATTRIBUTION TABLE
-- Links leads to specific content
-- ============================================================
create table if not exists public.content_attribution (
  id uuid default gen_random_uuid() primary key,
  lead_id uuid references public.leads(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  youtube_video_id text,          -- external YouTube video ID
  video_title text,               -- denormalized for easy display
  content_category text,          -- one of the 7 parenting categories
  tiktok_topic text,              -- free-text TikTok topic
  notes text,
  created_at timestamptz default now() not null
);

-- ============================================================
-- TESTIMONIALS — add source column (Testimonial Vault upgrade)
-- The testimonials table already exists from Phase 2.
-- ============================================================
alter table public.testimonials
  add column if not exists source text default 'other'
    check (source in ('whatsapp', 'tiktok', 'youtube', 'direct', 'referral', 'other'));

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.leads enable row level security;
alter table public.lead_activity enable row level security;
alter table public.content_attribution enable row level security;

create policy "Own leads" on public.leads
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Own lead_activity" on public.lead_activity
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Own content_attribution" on public.content_attribution
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- INDEXES
-- ============================================================
create index if not exists leads_user_stage_idx on public.leads(user_id, stage);
create index if not exists leads_user_created_idx on public.leads(user_id, created_at desc);
create index if not exists lead_activity_lead_idx on public.lead_activity(lead_id, created_at desc);
create index if not exists content_attribution_lead_idx on public.content_attribution(lead_id);
create index if not exists content_attribution_category_idx on public.content_attribution(user_id, content_category);
create index if not exists content_attribution_youtube_idx on public.content_attribution(user_id, youtube_video_id);

-- ============================================================
-- updated_at trigger for leads
-- ============================================================
create trigger handle_leads_updated_at
  before update on public.leads
  for each row execute procedure public.handle_updated_at();
