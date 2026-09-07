-- Fixes the unlock model: it was weekly + manually advanced by mom, which is
-- wrong. The real model is monthly: one payment unlocks a 4-week block all at
-- once; the course re-locks until the next month's payment unlocks the next block.

-- Configurable per track in case a track ever wants a different block size
-- than 4 weeks per payment.
ALTER TABLE academy_tracks ADD COLUMN IF NOT EXISTS weeks_per_payment INT NOT NULL DEFAULT 4;

-- Tracks when the student's most recent payment landed, so mom (and later,
-- the UI) can tell when the next month's payment is due.
ALTER TABLE academy_students ADD COLUMN IF NOT EXISTS last_payment_at TIMESTAMPTZ;
