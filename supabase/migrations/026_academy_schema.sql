-- Phase 18: The Academy — structured, paid, cohort-style course
-- Separate from Quick Coaching (WhatsApp 1-on-1, unchanged).
-- Owner (mom) manages tracks/chapters/roster from the dashboard (Supabase auth).
-- Students are NOT Supabase auth users — they get a lightweight phone+password
-- login issued only after mom marks them "Paid" (see academy_students + academy_sessions).
-- Public-facing routes use the service role key (same pattern as booking_requests).

-- 5 fixed age tracks, matching the reference site: Infants/Toddlers/3-5/6-8/9-12.
-- No "Future Parents" track.
CREATE TABLE IF NOT EXISTS academy_tracks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  age_range TEXT NOT NULL,
  total_weeks INT NOT NULL DEFAULT 8 CHECK (total_weeks > 0),
  price_amount NUMERIC(10,2) NOT NULL DEFAULT 40,
  price_currency TEXT NOT NULL DEFAULT 'USD',
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS academy_chapters (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  track_id UUID REFERENCES academy_tracks(id) ON DELETE CASCADE NOT NULL,
  week_number INT NOT NULL CHECK (week_number > 0),
  title TEXT NOT NULL,
  body TEXT,
  file_url TEXT,
  zoom_link TEXT,
  zoom_time TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (track_id, week_number)
);

-- One row per enrolled student. status starts pending_payment at signup;
-- username/password are only set once mom marks them paid.
CREATE TABLE IF NOT EXISTS academy_students (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  track_id UUID REFERENCES academy_tracks(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_payment'
    CHECK (status IN ('pending_payment', 'active', 'completed', 'cancelled')),
  username TEXT,
  password_hash TEXT,
  current_week INT NOT NULL DEFAULT 0,
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  paid_at TIMESTAMPTZ,
  credentials_issued_at TIMESTAMPTZ,
  UNIQUE (track_id, phone)
);

CREATE TABLE IF NOT EXISTS academy_exam_questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chapter_id UUID REFERENCES academy_chapters(id) ON DELETE CASCADE NOT NULL,
  question TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_index INT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS academy_exam_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES academy_students(id) ON DELETE CASCADE NOT NULL,
  chapter_id UUID REFERENCES academy_chapters(id) ON DELETE CASCADE NOT NULL,
  score INT NOT NULL,
  total INT NOT NULL,
  passed BOOLEAN NOT NULL,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (student_id, chapter_id)
);

-- Student login sessions (student portal has its own lightweight auth,
-- separate from Supabase auth used by mom's dashboard).
CREATE TABLE IF NOT EXISTS academy_sessions (
  token TEXT PRIMARY KEY,
  student_id UUID REFERENCES academy_students(id) ON DELETE CASCADE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS academy_chapters_track_idx ON academy_chapters(track_id);
CREATE INDEX IF NOT EXISTS academy_students_user_idx ON academy_students(user_id);
CREATE INDEX IF NOT EXISTS academy_students_track_idx ON academy_students(track_id);
CREATE INDEX IF NOT EXISTS academy_students_phone_idx ON academy_students(phone);
CREATE INDEX IF NOT EXISTS academy_exam_questions_chapter_idx ON academy_exam_questions(chapter_id);
CREATE INDEX IF NOT EXISTS academy_exam_results_student_idx ON academy_exam_results(student_id);
CREATE INDEX IF NOT EXISTS academy_sessions_student_idx ON academy_sessions(student_id);
CREATE INDEX IF NOT EXISTS academy_sessions_expires_idx ON academy_sessions(expires_at);

ALTER TABLE academy_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE academy_chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE academy_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE academy_exam_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE academy_exam_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE academy_sessions ENABLE ROW LEVEL SECURITY;

-- Owner (mom, via Supabase auth) manages tracks/students directly.
CREATE POLICY "Users manage own academy_tracks" ON academy_tracks
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage own academy_students" ON academy_students
  FOR ALL USING (auth.uid() = user_id);

-- Chapters/exam questions/results don't carry user_id directly — scope through
-- their parent track/student. Public student-portal + admin routes both go
-- through the service role key (bypasses RLS), same pattern as booking_requests.
CREATE POLICY "Users manage own academy_chapters" ON academy_chapters
  FOR ALL USING (
    track_id IN (SELECT id FROM academy_tracks WHERE user_id = auth.uid())
  );

CREATE POLICY "Users manage own academy_exam_questions" ON academy_exam_questions
  FOR ALL USING (
    chapter_id IN (
      SELECT c.id FROM academy_chapters c
      JOIN academy_tracks t ON t.id = c.track_id
      WHERE t.user_id = auth.uid()
    )
  );

CREATE POLICY "Users manage own academy_exam_results" ON academy_exam_results
  FOR ALL USING (
    student_id IN (SELECT id FROM academy_students WHERE user_id = auth.uid())
  );

CREATE POLICY "service role only" ON academy_sessions FOR ALL USING (false);
