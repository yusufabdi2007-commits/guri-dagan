# DATA AUDIT — Guri Dagan
Date: 2026-06-01

---

## Note on Methodology
Row counts cannot be checked from local environment without a running server and Supabase credentials.
This audit provides:
1. The SQL to run in Supabase to get exact counts
2. What the counts should be vs. what they likely are
3. A seed SQL file to create test data if tables are empty

---

## Row Count Check — Run in Supabase SQL Editor

```sql
SELECT
  'weekly_batches'        AS table_name, COUNT(*) AS row_count, MAX(created_at) AS last_record FROM weekly_batches
UNION ALL SELECT
  'batch_posts',          COUNT(*), MAX(created_at) FROM batch_posts
UNION ALL SELECT
  'content_performance',  COUNT(*), MAX(synced_at) FROM content_performance
UNION ALL SELECT
  'leads',                COUNT(*), MAX(created_at) FROM leads
UNION ALL SELECT
  'client_enrollments',   COUNT(*), MAX(created_at) FROM client_enrollments
UNION ALL SELECT
  'child_profiles',       COUNT(*), MAX(created_at) FROM child_profiles
UNION ALL SELECT
  'progress_checkins',    COUNT(*), MAX(created_at) FROM progress_checkins
UNION ALL SELECT
  'milestones',           COUNT(*), MAX(created_at) FROM milestones
UNION ALL SELECT
  'success_stories',      COUNT(*), MAX(created_at) FROM success_stories
UNION ALL SELECT
  'platform_connections', COUNT(*), MAX(created_at) FROM platform_connections
UNION ALL SELECT
  'sync_logs',            COUNT(*), MAX(started_at) FROM sync_logs
ORDER BY table_name;
```

---

## Expected vs Likely Actual

| Table | Expected (healthy) | Likely Actual (if migrations not run) |
|-------|-------------------|--------------------------------------|
| weekly_batches | >= 1 (current week) | 0 or TABLE DOES NOT EXIST |
| batch_posts | >= 8 (current week) | 0 or TABLE DOES NOT EXIST |
| content_performance | 0 (needs YouTube sync) | 0 or TABLE DOES NOT EXIST |
| leads | >= 0 | 0 or TABLE DOES NOT EXIST |
| client_enrollments | >= 0 | 0 or TABLE DOES NOT EXIST |
| child_profiles | >= 0 | 0 or TABLE DOES NOT EXIST |
| progress_checkins | >= 0 | 0 or TABLE DOES NOT EXIST |
| milestones | >= 0 | 0 or TABLE DOES NOT EXIST |
| success_stories | >= 0 | 0 or TABLE DOES NOT EXIST |
| platform_connections | >= 1 | 0 or TABLE DOES NOT EXIST |
| sync_logs | >= 0 | 0 or TABLE DOES NOT EXIST |

---

## Impact of Empty Tables on UI

| Table empty | UI symptom |
|-------------|-----------|
| weekly_batches | /today shows "No post scheduled" · /batch shows empty state |
| batch_posts | /calendar shows no batch posts · /today shows nothing · /batch/record empty |
| content_performance | /weekly-assignment shows no category intelligence (still works, just no suggestions) |
| leads | /leads shows empty Kanban · /business shows 0 conversions |
| client_enrollments | /clients shows no clients · /revenue shows £0 |
| child_profiles | /children shows empty · /success shows no active children |
| progress_checkins | /checkins shows nothing to review |
| platform_connections | /connections shows disconnected |

---

## Test Data — Seed SQL

See: `supabase/seed/test_week_2026-06-01.sql`

This seed creates:
- 1 weekly_batches record for week of 2026-06-02 (next Monday)
- 8 batch_posts with full program scripts (1 YouTube + 7 TikTok)
- Uses a placeholder user_id that must be replaced with your actual UUID

Instructions:
1. Get your user UUID from Supabase Auth → Users → copy your ID
2. Open supabase/seed/test_week_2026-06-01.sql
3. Replace all occurrences of 'YOUR_USER_ID_HERE' with your UUID
4. Run in Supabase SQL Editor
5. Open /calendar → navigate to week of June 2 → verify posts appear
6. Open /today → verify batch post appears for June 2
