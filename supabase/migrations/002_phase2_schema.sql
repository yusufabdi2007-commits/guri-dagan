-- ============================================================
-- PHASE 2 SCHEMA — Hooyada Coaching OS
-- ============================================================

-- ============================================================
-- RECORDING QUEUE TABLE
-- ============================================================
create table if not exists public.recording_queue (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  hook text,
  status text not null default 'Not Started'
    check (status in ('Not Started', 'Ready', 'Recorded', 'Needs Retake')),
  priority_order integer not null default 0,
  estimated_duration integer, -- seconds
  filming_notes text,
  tone_tags text[], -- e.g. ['emotional', 'practical', 'motivational']
  category text,
  idea_id uuid references public.content_ideas(id) on delete set null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- ============================================================
-- STREAK FREEZES TABLE
-- ============================================================
create table if not exists public.streak_freezes (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  freeze_date date not null,
  used boolean default false not null,
  created_at timestamptz default now() not null,
  unique(user_id, freeze_date)
);

-- ============================================================
-- SHORTS SUGGESTIONS TABLE
-- ============================================================
create table if not exists public.shorts_suggestions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  source_filename text,
  transcript text,
  suggestions jsonb not null default '[]'::jsonb,
  created_at timestamptz default now() not null
);

-- ============================================================
-- TESTIMONIALS TABLE
-- ============================================================
create table if not exists public.testimonials (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  client_name text not null,
  content text not null,
  type text not null default 'text'
    check (type in ('text', 'audio', 'video')),
  media_url text,
  topic_tags text[],
  featured boolean default false not null,
  platform text, -- where to share (TikTok, YouTube, etc)
  created_at timestamptz default now() not null
);

-- ============================================================
-- CRM CLIENTS TABLE
-- ============================================================
create table if not exists public.crm_clients (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  email text,
  phone text,
  notes text,
  concerns text, -- emotional concerns / challenges
  status text not null default 'Active'
    check (status in ('Active', 'Paused', 'Completed', 'Prospective')),
  progress_rating integer check (progress_rating between 1 and 10),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- ============================================================
-- CRM SESSIONS TABLE
-- ============================================================
create table if not exists public.crm_sessions (
  id uuid default uuid_generate_v4() primary key,
  client_id uuid references public.crm_clients(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  session_date date not null,
  notes text,
  mood_rating integer check (mood_rating between 1 and 5),
  topics_covered text[],
  next_steps text,
  created_at timestamptz default now() not null
);

-- ============================================================
-- CRM TASKS TABLE
-- ============================================================
create table if not exists public.crm_tasks (
  id uuid default uuid_generate_v4() primary key,
  client_id uuid references public.crm_clients(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  due_date date,
  completed boolean default false not null,
  priority text default 'Normal' check (priority in ('Low', 'Normal', 'High')),
  created_at timestamptz default now() not null
);

-- ============================================================
-- HOOK SCORES TABLE (saved scores)
-- ============================================================
create table if not exists public.hook_scores (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  hook_text text not null,
  emotional_score integer,
  curiosity_score integer,
  retention_score integer,
  clarity_score integer,
  virality_score integer,
  rewrites jsonb default '[]'::jsonb,
  created_at timestamptz default now() not null
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.recording_queue enable row level security;
alter table public.streak_freezes enable row level security;
alter table public.shorts_suggestions enable row level security;
alter table public.testimonials enable row level security;
alter table public.crm_clients enable row level security;
alter table public.crm_sessions enable row level security;
alter table public.crm_tasks enable row level security;
alter table public.hook_scores enable row level security;

-- Recording Queue
create policy "Own recording_queue" on public.recording_queue for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Streak Freezes
create policy "Own streak_freezes" on public.streak_freezes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Shorts Suggestions
create policy "Own shorts_suggestions" on public.shorts_suggestions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Testimonials
create policy "Own testimonials" on public.testimonials for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- CRM Clients
create policy "Own crm_clients" on public.crm_clients for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- CRM Sessions
create policy "Own crm_sessions" on public.crm_sessions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- CRM Tasks
create policy "Own crm_tasks" on public.crm_tasks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Hook Scores
create policy "Own hook_scores" on public.hook_scores for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- INDEXES
-- ============================================================
create index if not exists idx_recording_queue_user on public.recording_queue(user_id, priority_order);
create index if not exists idx_testimonials_user on public.testimonials(user_id);
create index if not exists idx_testimonials_featured on public.testimonials(featured) where featured = true;
create index if not exists idx_crm_clients_user on public.crm_clients(user_id);
create index if not exists idx_crm_sessions_client on public.crm_sessions(client_id);
create index if not exists idx_crm_tasks_client on public.crm_tasks(client_id);
create index if not exists idx_hook_scores_user on public.hook_scores(user_id);

-- Updated_at triggers
create trigger handle_recording_queue_updated_at
  before update on public.recording_queue
  for each row execute procedure public.handle_updated_at();

create trigger handle_crm_clients_updated_at
  before update on public.crm_clients
  for each row execute procedure public.handle_updated_at();
