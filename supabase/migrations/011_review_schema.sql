-- Phase 11A: Review Mode Database Schema
-- Run this in Supabase SQL editor before using /review

create table if not exists video_reviews (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  video_id uuid references videos(id) on delete cascade not null,
  review_status text not null default 'needs_review',
  reviewer_notes text,
  review_completed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint video_reviews_status_check check (
    review_status in ('needs_review', 'needs_fix', 'approved', 'high_retention_candidate', 'ready_for_export')
  ),
  unique(video_id)
);

alter table video_reviews enable row level security;

create policy "Users manage own video reviews"
  on video_reviews for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists review_markers (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  video_id uuid references videos(id) on delete cascade not null,
  marker_type text not null,
  timestamp_seconds numeric not null,
  confidence_score numeric default 0.8,
  explanation text,
  is_resolved boolean default false,
  is_ai_generated boolean default true,
  created_at timestamptz default now(),
  constraint review_markers_confidence_check check (
    confidence_score >= 0 and confidence_score <= 1
  )
);

alter table review_markers enable row level security;

create policy "Users manage own review markers"
  on review_markers for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_review_markers_video_id on review_markers(video_id);
create index if not exists idx_review_markers_timestamp on review_markers(video_id, timestamp_seconds asc);
create index if not exists idx_video_reviews_video_id on video_reviews(video_id);
