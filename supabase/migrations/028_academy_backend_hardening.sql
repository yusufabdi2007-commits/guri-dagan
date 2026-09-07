-- Backend hardening for The Academy:
-- 1. Payment history (mark-paid previously recorded no amount/date trail)
-- 2. Allow siblings to enroll under the same phone number in the same track
-- 3. Per-account login lockout (on top of the existing per-IP rate limit)

-- 1. Payment history — one row per "mark paid" event, capturing the track's
-- price at that moment (prices can change later; this is a historical record).
CREATE TABLE IF NOT EXISTS academy_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES academy_students(id) ON DELETE CASCADE NOT NULL,
  track_id UUID REFERENCES academy_tracks(id) ON DELETE SET NULL,
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS academy_payments_student_idx ON academy_payments(student_id);
CREATE INDEX IF NOT EXISTS academy_payments_user_idx ON academy_payments(user_id);

ALTER TABLE academy_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own academy_payments" ON academy_payments
  FOR ALL USING (auth.uid() = user_id);

-- 2. A parent may enroll more than one child in the same track from the same
-- phone number — the old constraint blocked that. Uniqueness now also
-- considers the child's name (still blocks accidental double-submits of the
-- exact same registration).
ALTER TABLE academy_students DROP CONSTRAINT IF EXISTS academy_students_track_id_phone_key;
CREATE UNIQUE INDEX IF NOT EXISTS academy_students_track_phone_name_unique
  ON academy_students (track_id, phone, name);

-- 3. Per-account lockout after repeated failed logins, independent of the
-- per-IP rate limit (an attacker rotating IPs could otherwise brute-force a
-- single student's 6-digit password indefinitely).
ALTER TABLE academy_students ADD COLUMN IF NOT EXISTS failed_login_attempts INT NOT NULL DEFAULT 0;
ALTER TABLE academy_students ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;
