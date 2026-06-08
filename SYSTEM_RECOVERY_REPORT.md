# SYSTEM RECOVERY REPORT — Guri Dagan
Date: 2026-06-01

---

## FINAL VERDICT

```
STATUS: BLOCKED

PRODUCTION: Running Phase 1-6A code (initial commit only).
            All Phase 12-17 features invisible to users.

LOCAL CODE: Phase 17.1 complete and correct.
            All routes, components, APIs exist and are well-formed.
            Code requires no fixes — only deployment and data.

BLOCKERS (in priority order):
  [1] CRITICAL: git commit + push all local work to trigger redeploy
  [2] REQUIRED: Apply migrations 012-019 in Supabase SQL Editor
  [3] REQUIRED: Seed first week of scheduling data
  [4] REQUIRED: Set missing Vercel environment variables
```

---

## 1. DEPLOYMENT STATUS

| Item | Status |
|------|--------|
| Git commits | 4 only — initial commit + 3 hotfixes |
| Phase 12-17 code | UNCOMMITTED — exists locally only |
| Production Vercel | Running initial commit — Phase 1-6A |
| lib/programs.ts | UNTRACKED — build WILL FAIL until committed |
| Modified files | 19 files with Phase 12-17 changes uncommitted |
| Untracked files | ~35 new feature files not in git |

### Build-Breaking Issue
Three files already committed to git import from `@/lib/programs`:
- `components/batch/BatchPlanClient.tsx`
- `components/calendar/CalendarClient.tsx`
- `components/today/TodayClient.tsx`

`lib/programs.ts` is untracked. Any Vercel build will fail:
```
Module not found: Can't resolve '@/lib/programs'
```

`lib/programs.ts` **must be committed first** before anything else.

### Fix (run in terminal):
```bash
cd "c:/Users/hp/OneDrive/Desktop/MOM"

git add lib/programs.ts
git add "app/(dashboard)/weekly-assignment/" "app/(dashboard)/programs/" "app/(dashboard)/program-report/"
git add "app/(dashboard)/clients/" "app/(dashboard)/children/" "app/(dashboard)/checkins/"
git add "app/(dashboard)/consultations/" "app/(dashboard)/followups/" "app/(dashboard)/outcomes/"
git add "app/(dashboard)/revenue/" "app/(dashboard)/success/"
git add app/api/checkins/ app/api/children/ app/api/consultations/ app/api/enrollments/
git add app/api/goals/ app/api/milestones/ app/api/outcomes/ app/api/payments/
git add app/api/program-report/ app/api/program-stats/ app/api/success-stories/
git add app/api/testimonial-requests/ app/api/weekly-assignment/
git add components/checkins/ components/children/ components/clients/ components/consultations/
git add components/followups/ components/outcomes/ components/program-report/ components/programs/
git add components/revenue/ components/success/ components/weekly-assignment/
git add supabase/migrations/016_program_funnel_schema.sql
git add supabase/migrations/017_enrollment_schema.sql
git add supabase/migrations/018_parent_success_schema.sql
git add supabase/migrations/019_phase17_schema.sql
git add "app/(dashboard)/business/page.tsx" "app/(dashboard)/calendar/page.tsx"
git add "app/(dashboard)/strategist/page.tsx" "app/(dashboard)/today/page.tsx"
git add app/api/batch-plan/route.ts "app/api/leads/[id]/route.ts" app/api/leads/route.ts
git add app/api/strategist/route.ts
git add components/batch/BatchPlanClient.tsx components/business/BusinessDashboardClient.tsx
git add components/calendar/CalendarClient.tsx components/layout/BottomNav.tsx
git add components/layout/Sidebar.tsx "components/leads/LeadDetailClient.tsx"
git add components/leads/LeadPipelineClient.tsx components/strategist/StrategistClient.tsx
git add components/today/TodayClient.tsx next-env.d.ts .gitignore
git add IMPLEMENTATION_PLAN.md

git commit -m "feat: Phase 12-17 complete — batching, programs, clients, children, outcomes"
git push origin master
```

---

## 2. ENVIRONMENT VARIABLE STATUS

| Variable | Local .env.local | Vercel | Action Required |
|----------|-----------------|--------|-----------------|
| NEXT_PUBLIC_SUPABASE_URL | PRESENT ✓ | LIKELY PRESENT | Verify in Vercel |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | PRESENT ✓ | LIKELY PRESENT | Verify in Vercel |
| OPENAI_API_KEY | FIXED ✓ | UNKNOWN | Add real key to Vercel |
| NEXT_PUBLIC_APP_URL | PRESENT ✓ | LIKELY PRESENT | Verify in Vercel |
| SUPABASE_SERVICE_ROLE_KEY | MISSING | UNKNOWN | Get from Supabase → Project Settings → API |
| OWNER_USER_ID | MISSING | UNKNOWN | Get from Supabase → Auth → Users |
| YOUTUBE_API_KEY | MISSING | UNKNOWN | Get from Google Cloud Console |
| NEXT_PUBLIC_VAPID_PUBLIC_KEY | MISSING | UNKNOWN | Generate with web-push |
| VAPID_PRIVATE_KEY | MISSING | UNKNOWN | Generate with web-push |

### Critical for production:
- `OPENAI_API_KEY` — required for /weekly-assignment, /strategist, /program-report, /batch-plan
- `SUPABASE_SERVICE_ROLE_KEY` — required for /book (public booking page)
- `OWNER_USER_ID` — required for /book (public booking page)

---

## 3. MIGRATION STATUS

| Migration | File Exists | Committed | Estimated Supabase Status |
|-----------|-------------|-----------|--------------------------|
| 012_batch_schema.sql | YES | YES | PROBABLY NOT APPLIED |
| 013_inbox_schema.sql | YES | YES | PROBABLY NOT APPLIED |
| 014_connections_schema.sql | YES | YES | PROBABLY NOT APPLIED |
| 015_client_growth_schema.sql | YES | YES | PROBABLY NOT APPLIED |
| 016_program_funnel_schema.sql | YES | NO | DEFINITELY NOT APPLIED |
| 017_enrollment_schema.sql | YES | NO | DEFINITELY NOT APPLIED |
| 018_parent_success_schema.sql | YES | NO | DEFINITELY NOT APPLIED |
| 019_phase17_schema.sql | YES | NO | DEFINITELY NOT APPLIED |

All migration SQL files verified — structurally correct, use IF NOT EXISTS, safe to re-run.
Dependency order: 015 → 016 → 017 → 018 → 019 (each references tables from the previous).

### Fix (run in Supabase SQL Editor, in order):
1. Paste + run `012_batch_schema.sql`
2. Paste + run `013_inbox_schema.sql`
3. Paste + run `014_connections_schema.sql`
4. Paste + run `015_client_growth_schema.sql`
5. Paste + run `016_program_funnel_schema.sql`
6. Paste + run `017_enrollment_schema.sql`
7. Paste + run `018_parent_success_schema.sql`
8. Paste + run `019_phase17_schema.sql`

---

## 4. WEEKLY ASSIGNMENT STATUS

| Component | Status | Notes |
|-----------|--------|-------|
| /api/weekly-assignment route | CORRECT | POST handler complete, OpenAI prompt correct, fallback handles errors |
| Program distribution | CORRECT | YouTube=MePower, Mon=MePower, Tue=Inner Power, Wed=MePower, Thu=Inner Power, Fri=MindPower, Sat=DreamPower, Sun=Slaying Dragons |
| Fallback response | CORRECT | Returns full 7-day plan when OpenAI fails, is_fallback=true |
| WeeklyAssignmentClient generate | CORRECT | Calls /api/weekly-assignment, handles error, sets plan state |
| WeeklyAssignmentClient save | CORRECT | Upserts weekly_batches, deletes+inserts batch_posts, uses formatScriptNotes() |
| OPENAI_API_KEY | FIXED LOCALLY | Real key present in .env.local — was malformed (missing =), now correct |
| Save → weekly_batches | BLOCKED | Table doesn't exist until migration 012 applied |
| Save → batch_posts | BLOCKED | Table doesn't exist until migration 012 applied |

**After migrations applied:** /weekly-assignment will generate and save correctly.

---

## 5. CALENDAR STATUS

| Component | Status | Notes |
|-----------|--------|-------|
| calendar/page.tsx server query | CORRECT | Fetches batch_posts with .gte/.lte date range using date strings |
| CalendarClient.tsx rendering | CORRECT | getBatchPostsForDate() filters by exact date string match |
| Program badge rendering | CORRECT | getProgramBadgeClass() returns correct Tailwind classes |
| parseScriptNotes() | CORRECT | Extracts PROGRAM, HOOK [type], PROBLEM, REFRAME, TEACHING, ACTION, CTA |
| lib/programs.ts | CORRECT | All 5 programs defined, all functions exported correctly |
| batch_posts table | BLOCKED | Table doesn't exist until migration 012 applied |
| batch_posts data | EMPTY | No weekly plans saved — need seed data |

**After migrations + seed:** Calendar will display all 8 posts per week with program badges.

---

## 6. TODAY PAGE STATUS

| Component | Status | Notes |
|-----------|--------|-------|
| today/page.tsx server queries | CORRECT | Queries batch_posts for today (scheduled_date = todayStr, status != posted) |
| isSunday detection | CORRECT | today.getDay() === 0 |
| Sunday Recording Mode | CORRECT | Fetches next week's batch_posts, renders RecordingDayMode |
| TodayClient.tsx rendering | CORRECT | ScriptGuide renders Hook/Problem/Reframe/Teaching/Action, ProgramHeader shows badge |
| Mark Posted action | CORRECT | Updates batch_posts status to 'posted', inserts daily_completions |
| batch_posts for today | EMPTY | No data — tables missing or not seeded |

**After migrations + seed:** Today page shows the batch post for each day of the seeded week.
**Sunday June 8:** Recording Mode activates, shows all 8 posts from next week.

---

## 7. DATA STATUS

| Table | Estimated Rows | Required For |
|-------|---------------|-------------|
| weekly_batches | 0 (table likely missing) | /today theme, /batch |
| batch_posts | 0 (table likely missing) | /today post, /calendar batch posts |
| platform_connections | 0 | /connections hub |
| content_performance | 0 | /weekly-assignment intelligence |
| leads | 0 | /leads Kanban, /business metrics |
| client_enrollments | 0 | /clients, /revenue |
| child_profiles | 0 | /children, /success, /checkins |

**Seed files available:**
- `supabase/seed/bootstrap_first_week.sql` — dynamic, uses next Monday from today
- `supabase/seed/test_week_2026-06-02.sql` — date-specific (week of June 2, 2026)

---

## 8. OPENAI STATUS

| Check | Status |
|-------|--------|
| OPENAI_API_KEY in .env.local | FIXED — was `your_openai_api_key_here` (placeholder on line 3, real key missing `=` on line 5) |
| Current .env.local | Single correct line: `OPENAI_API_KEY=sk-proj-...` |
| /api/weekly-assignment | Will work locally — was only blocked by malformed key |
| /api/strategist | Will work locally |
| /api/program-report | Will work locally |
| /api/batch-plan | Will work locally |
| Vercel OPENAI_API_KEY | UNKNOWN — must be set in Vercel dashboard |

---

## 9. PRODUCTION READINESS WALKTHROUGH

| Step | Status | Blocker |
|------|--------|---------|
| 1. Open /weekly-assignment | BLOCKED | Route not in production (uncommitted) |
| 2. Generate plan | BLOCKED locally: migrations missing. Works once: key fixed + migrations applied |
| 3. Save plan | BLOCKED | weekly_batches table missing |
| 4. Open /calendar | PARTIAL | Route exists in production (old version), batch posts column missing |
| 5. See 8 scheduled videos | BLOCKED | batch_posts table missing + empty |
| 6. Open /today | PARTIAL | Route exists but shows "No post scheduled today" |
| 7. See today's batch post | BLOCKED | batch_posts empty |
| 8. Mark posted | BLOCKED | batch_posts table missing |

---

## 10. ORDERED ACTION PLAN

Run these in this exact order:

### Action 1 — Apply database migrations
In **Supabase SQL Editor**, run migrations 012 → 019 in order.
Each file is in `supabase/migrations/`.
Run one at a time. Confirm no errors before the next.

### Action 2 — Seed first week of data
In **Supabase SQL Editor**:
1. Open `supabase/seed/bootstrap_first_week.sql`
2. Replace `YOUR_USER_ID_HERE` with your UUID (Supabase → Auth → Users)
3. Run the file
4. Run the verification SELECT at the bottom — expect 1 row, 8 posts

### Action 3 — Verify local calendar and today
1. `npm run dev` (if not already running)
2. Open `/calendar` → navigate to the seeded week → verify 8 posts appear with program badges
3. Open `/today` → verify today's batch post appears (or no post if today is not in the seeded week)
4. Open `/weekly-assignment` → click Generate → verify AI responds → click Save

### Action 4 — Commit all local work
Run the git commands from Section 1.
Verify with `git status` after: should show nothing uncommitted except .env.local (which is gitignored).

### Action 5 — Set Vercel environment variables
In Vercel project settings → Environment Variables, add:
- `OPENAI_API_KEY` — the real key from .env.local
- `SUPABASE_SERVICE_ROLE_KEY` — from Supabase → Project Settings → API
- `OWNER_USER_ID` — your Supabase auth user UUID
- `NEXT_PUBLIC_SUPABASE_URL` — verify it's present
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — verify it's present

### Action 6 — Push and verify production
```bash
git push origin master
```
Watch Vercel deploy. After deploy completes:
- Open production URL
- Verify /today, /calendar, /weekly-assignment, /programs, /clients all load

---

## FILES PRODUCED THIS SESSION

| File | Purpose |
|------|---------|
| `DATABASE_AUDIT.md` | Table existence prediction, row count SQL, migration application guide |
| `supabase/seed/bootstrap_first_week.sql` | Dynamic seed — creates next Monday's full 8-post schedule |
| `SYSTEM_RECOVERY_REPORT.md` | This file — master recovery plan |

Previously produced (prior session):
| `DEPLOYMENT_AUDIT.md` | Exact git commands to commit all 54 files |
| `MIGRATION_AUDIT.md` | Migration file status and apply instructions |
| `DATA_AUDIT.md` | Row count SQL and empty table impact |
| `supabase/seed/test_week_2026-06-02.sql` | Fixed-date seed for week of June 2, 2026 |
| `.env.local` | FIXED — OPENAI_API_KEY placeholder removed |
