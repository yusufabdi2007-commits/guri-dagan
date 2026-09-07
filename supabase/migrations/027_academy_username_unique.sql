-- Usernames are now generated from the student's name (firstname + random
-- digits) instead of their phone number, so they must be globally unique.
CREATE UNIQUE INDEX IF NOT EXISTS academy_students_username_unique
  ON academy_students (username)
  WHERE username IS NOT NULL;
