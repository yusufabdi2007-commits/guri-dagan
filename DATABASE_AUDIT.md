# DATABASE AUDIT — Guri Dagan
Date: 2026-06-01

---

## IMPORTANT: Cannot query Supabase directly from local environment
This audit is based on:
1. Which migration files exist and are valid SQL
2. Whether migrations were ever committed to git (prerequisite for Vercel builds)
3. Whether Supabase migrations are applied manually (they must be — there is no auto-runner)

**To get actual row counts, run the SQL queries at the bottom of this file in Supabase SQL Editor.**

---

## Migration File Status

| Migration | File Exists Locally | Committed to Git | SQL Valid | Likely Applied in Supabase |
|-----------|--------------------|-----------------|-----------|-----------------------------|
| 001_initial_schema.sql | YES | YES | YES | LIKELY YES (initial setup) |
| 002_phase2_schema.sql | YES | YES | YES | LIKELY YES |
| 003_phase3_schema.sql | YES | YES | YES | LIKELY YES |
| 004_phase4_schema.sql | YES | YES | YES | LIKELY YES |
| 005_phase5_schema.sql | YES | YES | YES | LIKELY YES |
| 011_review_schema.sql | YES | YES | YES | UNKNOWN |
| 012_batch_schema.sql | YES | YES | YES | **VERY LIKELY NOT** |
| 013_inbox_schema.sql | YES | YES | YES | **VERY LIKELY NOT** |
| 014_connections_schema.sql | YES | YES | YES | **VERY LIKELY NOT** |
| 015_client_growth_schema.sql | YES | YES | YES | **VERY LIKELY NOT** |
| 016_program_funnel_schema.sql | YES | **NO** | YES | **DEFINITELY NOT** |
| 017_enrollment_schema.sql | YES | **NO** | YES | **DEFINITELY NOT** |
| 018_parent_success_schema.sql | YES | **NO** | YES | **DEFINITELY NOT** |
| 019_phase17_schema.sql | YES | **NO** | YES | **DEFINITELY NOT** |

### Reasoning
- 012–015: committed to git but the feature code was never deployed — no evidence migrations were run manually
- 016–019: not even committed to git — zero chance they were applied

---

## Table Existence Prediction

| Table | Should Exist | Likely Actual |
|-------|-------------|---------------|
| content_ideas | YES | YES — Phase 1 |
| calendar_items | YES | YES — Phase 1 |
| daily_completions | YES | YES — Phase 1 |
| videos | YES | YES — Phase 1 |
| testimonials | YES | YES — Phase 2 |
| profiles | YES | YES — Phase 3 |
| tiktok_posts | YES | YES — Phase 5 |
| youtube_config | YES | YES — Phase 5 |
| video_reviews | LIKELY | UNKNOWN — migration 011 |
| review_markers | LIKELY | UNKNOWN — migration 011 |
| **weekly_batches** | YES | **PROBABLY NO** |
| **batch_posts** | YES | **PROBABLY NO** |
| **question_inbox** | YES | **PROBABLY NO** |
| **platform_connections** | YES | **PROBABLY NO** |
| **content_performance** | YES | **PROBABLY NO** |
| **sync_logs** | YES | **PROBABLY NO** |
| **leads** | YES | **PROBABLY NO** |
| **lead_activity** | YES | **PROBABLY NO** |
| **content_attribution** | YES | **PROBABLY NO** |
| **client_enrollments** | YES | **PROBABLY NO** |
| **consultations** | YES | **PROBABLY NO** |
| **payments** | YES | **PROBABLY NO** |
| **testimonial_requests** | YES | **PROBABLY NO** |
| **child_profiles** | YES | **DEFINITELY NO** |
| **child_goals** | YES | **DEFINITELY NO** |
| **progress_checkins** | YES | **DEFINITELY NO** |
| **milestones** | YES | **DEFINITELY NO** |
| **success_stories** | YES | **DEFINITELY NO** |

---

## UI Impact of Missing Tables

| Missing Table | Pages Broken |
|---------------|-------------|
| weekly_batches | /today (no theme), /batch (empty), /weekly-assignment (can't save) |
| batch_posts | /today ("No post scheduled"), /calendar (no batch posts), /batch/record (empty) |
| question_inbox | /inbox (crash or empty) |
| platform_connections | /connections (shows disconnected) |
| content_performance | /connections (no sync data), /weekly-assignment (no intelligence) |
| leads | /leads (empty Kanban), /business (zero conversions) |
| client_enrollments | /clients (empty), /revenue (£0) |
| child_profiles | /children (empty), /success (empty), /checkins (empty) |

---

## Step 1: Verify Which Tables Exist

Run this in **Supabase SQL Editor**:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'weekly_batches', 'batch_posts',
    'question_inbox',
    'platform_connections', 'content_performance', 'sync_logs',
    'leads', 'lead_activity', 'content_attribution',
    'client_enrollments', 'consultations', 'payments', 'testimonial_requests',
    'child_profiles', 'child_goals', 'progress_checkins', 'milestones', 'success_stories'
  )
ORDER BY table_name;
```

Expected if ALL migrations applied: 18 rows.
If you see fewer than 18, apply the missing migrations in order.

---

## Step 2: Row Counts (run after confirming tables exist)

```sql
SELECT 'weekly_batches'     AS tbl, COUNT(*) AS rows, MAX(created_at) AS latest FROM weekly_batches
UNION ALL
SELECT 'batch_posts',        COUNT(*), MAX(created_at) FROM batch_posts
UNION ALL
SELECT 'question_inbox',     COUNT(*), MAX(created_at) FROM question_inbox
UNION ALL
SELECT 'platform_connections', COUNT(*), MAX(created_at) FROM platform_connections
UNION ALL
SELECT 'content_performance', COUNT(*), MAX(synced_at) FROM content_performance
UNION ALL
SELECT 'leads',              COUNT(*), MAX(created_at) FROM leads
UNION ALL
SELECT 'client_enrollments', COUNT(*), MAX(created_at) FROM client_enrollments
UNION ALL
SELECT 'child_profiles',     COUNT(*), MAX(created_at) FROM child_profiles
UNION ALL
SELECT 'progress_checkins',  COUNT(*), MAX(created_at) FROM progress_checkins
UNION ALL
SELECT 'milestones',         COUNT(*), MAX(achieved_at) FROM milestones
UNION ALL
SELECT 'success_stories',    COUNT(*), MAX(created_at) FROM success_stories
ORDER BY tbl;
```

---

## Step 3: Apply Missing Migrations (in order)

In Supabase SQL Editor, paste and run each file:

1. `supabase/migrations/012_batch_schema.sql`
2. `supabase/migrations/013_inbox_schema.sql`
3. `supabase/migrations/014_connections_schema.sql`
4. `supabase/migrations/015_client_growth_schema.sql`
5. `supabase/migrations/016_program_funnel_schema.sql`
6. `supabase/migrations/017_enrollment_schema.sql`
7. `supabase/migrations/018_parent_success_schema.sql`
8. `supabase/migrations/019_phase17_schema.sql`

Each file uses `CREATE TABLE IF NOT EXISTS` and `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` — safe to re-run.

---

## Step 4: Seed First Week of Data

After migrations are applied, run the bootstrap seed to create real scheduling data:

File: `supabase/seed/bootstrap_first_week.sql`

Instructions:
1. Open Supabase → Authentication → Users → copy your UUID
2. Open the seed file, replace `YOUR_USER_ID_HERE` with your UUID
3. Run in Supabase SQL Editor
4. Verify with the SELECT query at the bottom of the seed file (should return 1 row, 8 posts)
5. Open /calendar → navigate to the seeded week → verify 8 posts appear with program badges
6. Open /today → verify the post for today appears

---

## SQL Audit Validation Notes

All migration files reviewed. All SQL is structurally correct:
- 012: CREATE TABLE IF NOT EXISTS weekly_batches + batch_posts, RLS enabled ✓
- 013: CREATE TABLE IF NOT EXISTS question_inbox, RLS enabled ✓
- 014: CREATE TABLE IF NOT EXISTS platform_connections + content_performance + sync_logs, RLS enabled ✓
- 015: CREATE TABLE IF NOT EXISTS leads + lead_activity + content_attribution, ALTER testimonials ✓
- 016: ALTER TABLE leads ADD COLUMN IF NOT EXISTS program, ALTER content_attribution ✓
- 017: CREATE TABLE IF NOT EXISTS client_enrollments + consultations + payments + testimonial_requests, RLS ✓
- 018: CREATE TABLE IF NOT EXISTS child_profiles + child_goals + progress_checkins + milestones + success_stories, RLS ✓
- 019: ALTER TABLE progress_checkins ADD COLUMN IF NOT EXISTS responsibility_score + leadership_score ✓

Dependency order is correct: 017 references leads (from 015), 018 references client_enrollments (from 017).
