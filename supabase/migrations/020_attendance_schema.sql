-- Phase 20: Add attendance tracking to weekly check-ins
-- Tracks whether a child attended, was absent, or came late to each session

ALTER TABLE progress_checkins
  ADD COLUMN IF NOT EXISTS attendance TEXT DEFAULT 'attended'
    CHECK (attendance IN ('attended', 'absent', 'late'));
