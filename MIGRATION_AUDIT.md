# MIGRATION AUDIT — Guri Dagan
Date: 2026-06-01

---

## IMPORTANT: Cannot verify Supabase directly from local environment
This audit is based on:
1. Which migration files exist locally
2. Which migration files are tracked in git (were committed)
3. Which tables are required by currently-working API routes

To verify which migrations are applied in Supabase, run the SQL check at the bottom of this file.

---

## Migration Files — Existence and Git Status

| File | Exists Locally | Committed to Git | Git Status |
|------|----------------|-----------------|------------|
| 001_initial_schema.sql | YES | YES | tracked |
| 002_phase2_schema.sql | YES | YES | tracked |
| 003_phase3_schema.sql | YES | YES | tracked |
| 004_phase4_schema.sql | YES | YES | tracked |
| 005_phase5_schema.sql | YES | YES | tracked |
| 011_review_schema.sql | YES | YES | tracked |
| 012_batch_schema.sql | YES | YES | tracked |
| 013_inbox_schema.sql | YES | YES | tracked |
| 014_connections_schema.sql | YES | YES | tracked |
| 015_client_growth_schema.sql | YES | YES | tracked |
| 016_program_funnel_schema.sql | YES | NO | UNTRACKED |
| 017_enrollment_schema.sql | YES | NO | UNTRACKED |
| 018_parent_success_schema.sql | YES | NO | UNTRACKED |
| 019_phase17_schema.sql | YES | NO | UNTRACKED |

---

## What Each Migration Creates

### 012_batch_schema.sql — TRACKED, likely NOT applied
Tables:
- `weekly_batches` (id, user_id, week_start, theme, youtube_title, youtube_notes, status, recording_completed)
  - UNIQUE(user_id, week_start)
- `batch_posts` (id, batch_id, user_id, scheduled_date, platform, title, angle_notes, sort_order, status, posted_at)

Required by: /today, /batch, /batch/plan, /batch/record, /calendar, /weekly-assignment
Risk level: CRITICAL — without this migration, /today shows "No post scheduled today" always

### 013_inbox_schema.sql — TRACKED, likely NOT applied
Tables:
- `question_inbox` (id, user_id, question, source, converted, idea_id)

Required by: /inbox, /api/inbox-convert
Risk level: HIGH

### 014_connections_schema.sql — TRACKED, likely NOT applied
Tables:
- `platform_connections` (id, user_id, platform, status, channel_id, channel_name, last_synced_at, video_count)
  - UNIQUE(user_id, platform)
- `content_performance` (id, user_id, platform, external_id, title, category, views, likes, comments, published_at)
  - UNIQUE(user_id, platform, external_id)
- `sync_logs` (id, user_id, platform, started_at, completed_at, status, videos_synced, videos_created)

Required by: /connections, /api/connections, /api/connections/youtube/sync
Required by: /weekly-assignment (reads content_performance for category intelligence)
Risk level: HIGH

### 015_client_growth_schema.sql — TRACKED, likely NOT applied
Tables:
- `leads` (id, user_id, name, phone, email, source, stage, notes)
- `lead_activity` (id, lead_id, user_id, activity_type, note, from_stage, to_stage)
- `content_attribution` (id, lead_id, user_id, youtube_video_id, video_title, content_category, tiktok_topic)
Also: ALTER TABLE testimonials ADD COLUMN source

Required by: /leads, /leads/[id], /business
Risk level: HIGH

### 016_program_funnel_schema.sql — UNTRACKED
Adds: `program` column to leads + content_attribution
Required by: /programs, /program-report, /api/program-stats, /api/program-report
Risk level: MEDIUM (leads still work without it, but program features break)

### 017_enrollment_schema.sql — UNTRACKED
Tables:
- `client_enrollments`
- `consultations`
- `payments`
- `testimonial_requests`

Required by: /clients, /clients/[id], /consultations, /revenue, /followups
Risk level: HIGH

### 018_parent_success_schema.sql — UNTRACKED
Tables:
- `child_profiles`
- `child_goals`
- `progress_checkins`
- `milestones`
- `success_stories`

Required by: /children, /children/[id], /checkins, /outcomes, /success
Required by: /followups (at-risk detection)
Risk level: HIGH

### 019_phase17_schema.sql — UNTRACKED
Adds: `responsibility_score` + `leadership_score` columns to `progress_checkins`
Required by: Phase 17 check-in scoring
Risk level: LOW (additive only, applies after 018)

---

## Probability Assessment

Supabase migrations are NOT applied automatically — they must be run manually in the SQL editor.

Given that:
- Only 4 git commits exist (initial, .npmrc, Next.js CVE, middleware guard)
- No deployment history shows migration runs
- All the Phase 12+ feature code was never committed

Probability that migrations 012–019 are applied in production: VERY LOW

---

## How to Verify — Run This in Supabase SQL Editor

```sql
-- Check which tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'weekly_batches',
    'batch_posts',
    'question_inbox',
    'platform_connections',
    'content_performance',
    'sync_logs',
    'leads',
    'lead_activity',
    'content_attribution',
    'client_enrollments',
    'consultations',
    'payments',
    'testimonial_requests',
    'child_profiles',
    'child_goals',
    'progress_checkins',
    'milestones',
    'success_stories'
  )
ORDER BY table_name;
```

Expected tables if ALL migrations applied: 18 rows returned.

---

## How to Apply Missing Migrations

Run each migration in order in the Supabase SQL Editor:
1. Paste content of 012_batch_schema.sql → Run
2. Paste content of 013_inbox_schema.sql → Run
3. Paste content of 014_connections_schema.sql → Run
4. Paste content of 015_client_growth_schema.sql → Run
5. Paste content of 016_program_funnel_schema.sql → Run
6. Paste content of 017_enrollment_schema.sql → Run
7. Paste content of 018_parent_success_schema.sql → Run
8. Paste content of 019_phase17_schema.sql → Run

Each file uses `CREATE TABLE IF NOT EXISTS` — safe to re-run.

After applying: run the verification query above to confirm all 18 tables exist.
