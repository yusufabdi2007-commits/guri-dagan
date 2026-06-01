-- Phase 16: Parent Success System
-- Run this in Supabase SQL Editor before using /success, /children, /checkins, /outcomes pages.

-- ─── child_profiles ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS child_profiles (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  enrollment_id   UUID REFERENCES client_enrollments(id) ON DELETE SET NULL,
  child_name      TEXT NOT NULL,
  age             INTEGER,
  program         TEXT,
  start_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  graduation_date DATE,
  status          TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'graduated', 'paused', 'withdrawn')),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE child_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own child_profiles"
  ON child_profiles FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_child_profiles_user_id ON child_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_child_profiles_enrollment_id ON child_profiles(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_child_profiles_status ON child_profiles(status);

-- ─── child_goals ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS child_goals (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  child_id      UUID REFERENCES child_profiles(id) ON DELETE CASCADE NOT NULL,
  goal_title    TEXT NOT NULL,
  category      TEXT NOT NULL
    CHECK (category IN ('confidence', 'resilience', 'emotional_regulation', 'communication', 'self_respect', 'responsibility', 'leadership')),
  target_score  INTEGER DEFAULT 8 CHECK (target_score BETWEEN 1 AND 10),
  current_score INTEGER DEFAULT 1 CHECK (current_score BETWEEN 1 AND 10),
  achieved      BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE child_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own child_goals"
  ON child_goals FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_child_goals_child_id ON child_goals(child_id);
CREATE INDEX IF NOT EXISTS idx_child_goals_user_id ON child_goals(user_id);

-- ─── progress_checkins ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS progress_checkins (
  id                        UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                   UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  child_id                  UUID REFERENCES child_profiles(id) ON DELETE CASCADE NOT NULL,
  week_number               INTEGER NOT NULL,
  confidence_score          INTEGER CHECK (confidence_score BETWEEN 1 AND 10),
  resilience_score          INTEGER CHECK (resilience_score BETWEEN 1 AND 10),
  emotional_regulation_score INTEGER CHECK (emotional_regulation_score BETWEEN 1 AND 10),
  communication_score       INTEGER CHECK (communication_score BETWEEN 1 AND 10),
  parent_notes              TEXT,
  coach_notes               TEXT,
  created_at                TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE progress_checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own progress_checkins"
  ON progress_checkins FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_progress_checkins_child_id ON progress_checkins(child_id);
CREATE INDEX IF NOT EXISTS idx_progress_checkins_user_id ON progress_checkins(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_checkins_created_at ON progress_checkins(created_at DESC);

-- ─── milestones ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS milestones (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  child_id    UUID REFERENCES child_profiles(id) ON DELETE CASCADE NOT NULL,
  title       TEXT NOT NULL,
  description TEXT,
  achieved_at TIMESTAMPTZ DEFAULT NOW(),
  category    TEXT NOT NULL DEFAULT 'general'
    CHECK (category IN ('confidence', 'resilience', 'emotional_regulation', 'communication', 'self_respect', 'responsibility', 'leadership', 'general'))
);

ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own milestones"
  ON milestones FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_milestones_child_id ON milestones(child_id);
CREATE INDEX IF NOT EXISTS idx_milestones_user_id ON milestones(user_id);

-- ─── success_stories ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS success_stories (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  child_id   UUID REFERENCES child_profiles(id) ON DELETE CASCADE NOT NULL,
  title      TEXT NOT NULL,
  story      TEXT,
  status     TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'approved', 'published')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE success_stories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own success_stories"
  ON success_stories FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_success_stories_child_id ON success_stories(child_id);
CREATE INDEX IF NOT EXISTS idx_success_stories_user_id ON success_stories(user_id);
CREATE INDEX IF NOT EXISTS idx_success_stories_status ON success_stories(status);
