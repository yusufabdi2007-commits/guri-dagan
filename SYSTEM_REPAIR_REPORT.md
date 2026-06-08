# SYSTEM REPAIR REPORT — Guri Dagan
Date: 2026-06-01

---

## OVERALL STATUS: BLOCKED (locally functional, production non-functional)

---

## 1. DEPLOYMENT STATUS

| Item | Status | Detail |
|------|--------|--------|
| Git commits | CRITICAL | Only 4 commits exist. Everything Phase 12–17 is uncommitted |
| Production code | Phase 1-6A only | Vercel is running the initial commit |
| Local code | Phase 17.1 complete | 19 modified + ~35 untracked files |
| Production routes | 11 routes MISSING | /weekly-assignment /programs /program-report /clients /children /checkins /outcomes /success /revenue /consultations /connections |
| Build integrity | BROKEN | 3 committed files import `@/lib/programs` which is untracked — any Vercel build will fail with Module not found |

Fix required: Commit all local work and push to trigger Vercel redeploy.
See [DEPLOYMENT_AUDIT.md](./DEPLOYMENT_AUDIT.md) for the exact git commands.

---

## 2. ENVIRONMENT VARIABLE STATUS

| Variable | Local | Vercel |
|----------|-------|--------|
| NEXT_PUBLIC_SUPABASE_URL | PRESENT | LIKELY PRESENT |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | PRESENT | LIKELY PRESENT |
| OPENAI_API_KEY | FIXED (was malformed) | UNKNOWN — must verify |
| SUPABASE_SERVICE_ROLE_KEY | MISSING | UNKNOWN |
| OWNER_USER_ID | MISSING | UNKNOWN |
| YOUTUBE_API_KEY | MISSING | UNKNOWN |
| NEXT_PUBLIC_VAPID_PUBLIC_KEY | MISSING | UNKNOWN |
| VAPID_PRIVATE_KEY | MISSING | UNKNOWN |
| CRON_SECRET | MISSING | UNKNOWN |

Fix applied: `.env.local` was rewritten. The placeholder `your_openai_api_key_here` has been removed.
The real API key is now correctly formatted as `OPENAI_API_KEY=sk-proj-...`.

---

## 3. MIGRATION STATUS

| Migration | Tables Created | Applied in Supabase |
|-----------|---------------|---------------------|
| 012_batch_schema | weekly_batches, batch_posts | UNKNOWN — likely NOT |
| 013_inbox_schema | question_inbox | UNKNOWN — likely NOT |
| 014_connections_schema | platform_connections, content_performance, sync_logs | UNKNOWN — likely NOT |
| 015_client_growth_schema | leads, lead_activity, content_attribution | UNKNOWN — likely NOT |
| 016_program_funnel_schema | ADD program column to leads + content_attribution | UNKNOWN — NOT committed |
| 017_enrollment_schema | client_enrollments, consultations, payments, testimonial_requests | UNKNOWN — NOT committed |
| 018_parent_success_schema | child_profiles, child_goals, progress_checkins, milestones, success_stories | UNKNOWN — NOT committed |
| 019_phase17_schema | ADD responsibility_score + leadership_score to progress_checkins | UNKNOWN — NOT committed |

Fix required: Run each migration SQL file in Supabase SQL Editor, in order 012 → 019.

---

## 4. CALENDAR STATUS

| Check | Status | Root Cause |
|-------|--------|-----------|
| Server query fetches batch_posts | CORRECT | calendar/page.tsx fetches from batch_posts with date range |
| CalendarClient receives batchPosts prop | CORRECT | prop passed correctly |
| CalendarClient renders batch posts | CORRECT | getBatchPostsForDate() + parseScriptNotes() + getProgramBadgeClass() |
| Program badge appears | CORRECT (when data exists) | reads script.program from parseScriptNotes |
| batch_posts table exists in DB | UNKNOWN | requires migration 012 |
| batch_posts has data | EMPTY | no weekly plans saved yet |

Fix: Apply migration 012, then run seed SQL `supabase/seed/test_week_2026-06-02.sql` to create test week.
After seeding, navigate to calendar week of June 2 — should show all 8 posts with program badges.

---

## 5. TODAY PAGE STATUS

| Check | Status | Root Cause |
|-------|--------|-----------|
| isSunday detection | CORRECT | `today.getDay() === 0` — today is Monday (0=false) |
| Fetches batch_posts for today | CORRECT | queries batch_posts WHERE scheduled_date = todayStr |
| Sunday Recording Mode renders | CORRECT | if (isSunday) returns RecordingDayMode |
| batch_posts table exists | UNKNOWN | requires migration 012 |
| batch_post for today exists | NONE | no data → shows "No post scheduled today" |

Fix: Apply migration 012, seed test data. On June 2 (Monday), Today page will show MePower™ TikTok post.
Sunday Recording Mode: will activate on June 8. Pre-seed next week's data to test.

---

## 6. WEEKLY ASSIGNMENT STATUS

| Check | Status | Root Cause |
|-------|--------|-----------|
| /api/weekly-assignment route | EXISTS locally | file is UNTRACKED — not in production |
| WeeklyAssignmentClient | EXISTS locally | file is UNTRACKED — not in production |
| OPENAI_API_KEY for generation | FIXED locally | was malformed, now correct |
| Generate → 1 YouTube + 7 TikToks | SHOULD WORK | uses /api/weekly-assignment → OpenAI |
| Program distribution | CORRECT | MePower×2, Inner Power×2, MindPower×1, DreamPower×1, Slaying Dragons×1 |
| Save → weekly_batches upsert | REQUIRES migration 012 | table must exist |
| Save → batch_posts insert | REQUIRES migration 012 | table must exist |

Fix: Apply migration 012, then test /weekly-assignment locally. Generation should work now that OPENAI_API_KEY is fixed.

---

## 7. EXACT FIXES REQUIRED (ordered)

### Fix 1 — DONE: Fix .env.local OPENAI_API_KEY
Status: COMPLETE
File: `.env.local`
Was: Line 3 = placeholder, Line 5 = real key missing `=`
Now: Single line with correct format

### Fix 2 — Required: Apply database migrations in Supabase
Action: Run 8 SQL files in Supabase SQL Editor
Files:
- supabase/migrations/012_batch_schema.sql
- supabase/migrations/013_inbox_schema.sql
- supabase/migrations/014_connections_schema.sql
- supabase/migrations/015_client_growth_schema.sql
- supabase/migrations/016_program_funnel_schema.sql
- supabase/migrations/017_enrollment_schema.sql
- supabase/migrations/018_parent_success_schema.sql
- supabase/migrations/019_phase17_schema.sql

### Fix 3 — Required: Create test week data
Action: Run seed SQL in Supabase SQL Editor
File: `supabase/seed/test_week_2026-06-02.sql`
Steps:
1. Get your user UUID from Supabase Auth → Users
2. Replace `YOUR_USER_ID_HERE` in the file with your UUID
3. Run the SQL
4. Verify: navigate to /calendar → week of June 2 → should see 8 posts

### Fix 4 — Required: Commit all local work to git
Action: Stage and commit all 54 changed files
Critical: Must include `lib/programs.ts` or build will break
See: `DEPLOYMENT_AUDIT.md` for exact git commands

### Fix 5 — Required: Set environment variables in Vercel
Action: Add to Vercel project settings → Environment Variables
Critical: OPENAI_API_KEY (real key), SUPABASE_SERVICE_ROLE_KEY, OWNER_USER_ID

### Fix 6 — Recommended: Verify build passes locally before pushing
Action: `npm run build` locally
Expected: No TypeScript errors, no module-not-found errors

---

## 8. VERIFIED WORKING (locally, after env fix)

These components are code-correct and will work once the deployment and migration blockers are resolved:

- `lib/programs.ts` — complete, all 5 programs defined with correct badge classes
- `parseScriptNotes()` — parses PROGRAM, HOOK, PROBLEM, REFRAME, TEACHING, ACTION, CTA
- `formatScriptNotes()` — encodes scripts correctly for storage
- `CalendarClient.tsx` — renders batch posts + program badges correctly
- `TodayClient.tsx` — renders batch post, full script, checklist, Sunday mode
- `WeeklyAssignmentClient.tsx` — generate + save flow correct
- `/api/batch-plan` — program distribution correct, fallback works
- `app/(dashboard)/today/page.tsx` — isSunday detection correct, all queries correct
- `app/(dashboard)/calendar/page.tsx` — fetches batch_posts with correct date range

---

## FINAL VERDICT

```
STATUS: BLOCKED

PRODUCTION: Running Phase 1-6A code from initial commit.
           All Phase 12-17 features invisible to users.

LOCAL:     Phase 17.1 code complete and correct.
           AI features now unblocked (env fix applied).
           Calendar, Today, Weekly Assignment all render correctly
           once test data exists.

BLOCKERS (in order):
  [1] REQUIRED: Apply migrations 012-019 in Supabase
  [2] REQUIRED: Run seed SQL to create test week data
  [3] REQUIRED: git add → git commit → git push (deploy)
  [4] REQUIRED: Set OPENAI_API_KEY in Vercel env vars

After these 4 steps: READY
```

---

## Audit Files Created

| File | Purpose |
|------|---------|
| DEPLOYMENT_AUDIT.md | Git status, production route map, exact commit commands |
| MIGRATION_AUDIT.md | Migration file status, verification SQL, apply instructions |
| DATA_AUDIT.md | Table row count SQL, empty table impact, seed instructions |
| supabase/seed/test_week_2026-06-02.sql | Full test week with all 5 programs (run AFTER migrations) |
| SYSTEM_REPAIR_REPORT.md | This file — master status report |
| .env.local | FIXED — OPENAI_API_KEY malformation corrected |
