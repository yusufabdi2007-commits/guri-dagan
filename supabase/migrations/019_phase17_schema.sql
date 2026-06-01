-- Phase 17: Unified Content + Business Operating System
-- Adds responsibility and leadership tracking to child progress check-ins

ALTER TABLE progress_checkins
  ADD COLUMN IF NOT EXISTS responsibility_score INTEGER DEFAULT 5 CHECK (responsibility_score >= 1 AND responsibility_score <= 10);

ALTER TABLE progress_checkins
  ADD COLUMN IF NOT EXISTS leadership_score INTEGER DEFAULT 5 CHECK (leadership_score >= 1 AND leadership_score <= 10);

-- Index to speed up program-based child outcome queries
CREATE INDEX IF NOT EXISTS progress_checkins_child_created_idx ON progress_checkins(child_id, created_at);
