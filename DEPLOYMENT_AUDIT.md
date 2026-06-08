# DEPLOYMENT AUDIT — Guri Dagan
Date: 2026-06-01

---

## VERDICT: CRITICAL — PRODUCTION IS PHASE 1-6A ONLY

Every feature built in Phase 12 through Phase 17 exists only on disk locally.
Nothing past the initial commit has been pushed to the remote or deployed to Vercel.

---

## Git Commit History

| Commit | Message |
|--------|---------|
| ce47781 | fix: guard middleware against missing Supabase env vars |
| 0c93a5c | Upgrade Next.js 15.1.0 → 16.2.6 (CVE-2025-66478 fix) |
| 2f8ce2b | Add .npmrc with legacy-peer-deps for Vercel build |
| 3c9987f | Initial commit — Guri Dagan v1.0 |

Last meaningful commit: 3c9987f (Initial commit)
Production deployed commit: ce47781 (only guards middleware, no features)

---

## Uncommitted Local Work

### Modified files (19) — exist in production but with OLD content:
- app/(dashboard)/business/page.tsx
- app/(dashboard)/calendar/page.tsx — has batch_posts fetch (NOT in production)
- app/(dashboard)/strategist/page.tsx
- app/(dashboard)/today/page.tsx — has isSunday/RecordingMode (NOT in production)
- app/api/batch-plan/route.ts — has full program distribution logic (NOT in production)
- app/api/leads/[id]/route.ts
- app/api/leads/route.ts
- app/api/strategist/route.ts
- components/batch/BatchPlanClient.tsx — imports lib/programs (BUILD BREAKS in production)
- components/business/BusinessDashboardClient.tsx
- components/calendar/CalendarClient.tsx — imports lib/programs (BUILD BREAKS in production)
- components/layout/BottomNav.tsx
- components/layout/Sidebar.tsx
- components/leads/LeadDetailClient.tsx
- components/leads/LeadPipelineClient.tsx
- components/strategist/StrategistClient.tsx
- components/today/TodayClient.tsx — imports lib/programs (BUILD BREAKS in production)
- next-env.d.ts
- .gitignore

### Untracked files (~35) — DO NOT EXIST in production at all:
- lib/programs.ts (CRITICAL — imported by 3+ committed components)
- app/(dashboard)/weekly-assignment/
- app/(dashboard)/programs/
- app/(dashboard)/program-report/
- app/(dashboard)/clients/
- app/(dashboard)/children/
- app/(dashboard)/checkins/
- app/(dashboard)/consultations/
- app/(dashboard)/followups/
- app/(dashboard)/outcomes/
- app/(dashboard)/revenue/
- app/(dashboard)/success/
- app/api/checkins/
- app/api/children/
- app/api/consultations/
- app/api/enrollments/
- app/api/goals/
- app/api/milestones/
- app/api/outcomes/
- app/api/payments/
- app/api/program-report/
- app/api/program-stats/
- app/api/success-stories/
- app/api/testimonial-requests/
- app/api/weekly-assignment/
- components/checkins/
- components/children/
- components/clients/
- components/consultations/
- components/followups/
- components/outcomes/
- components/program-report/
- components/programs/
- components/revenue/
- components/success/
- components/weekly-assignment/
- supabase/migrations/016_program_funnel_schema.sql
- supabase/migrations/017_enrollment_schema.sql
- supabase/migrations/018_parent_success_schema.sql
- supabase/migrations/019_phase17_schema.sql
- IMPLEMENTATION_PLAN.md

---

## Production Route Status

| Route | Exists Locally | Exists in Production |
|-------|----------------|---------------------|
| /weekly-assignment | YES | NO |
| /programs | YES | NO |
| /program-report | YES | NO |
| /clients | YES | NO |
| /children | YES | NO |
| /checkins | YES | NO |
| /outcomes | YES | NO |
| /success | YES | NO |
| /revenue | YES | NO |
| /consultations | YES | NO |
| /connections | YES | NO |
| /followups | YES | NO |
| /batch | YES | NO (untracked components) |
| /today (isSunday mode) | YES | NO (old today page in prod) |
| /calendar (batch posts) | YES | NO (old calendar in prod) |

---

## Build-Breaking Import (CRITICAL)

Three COMMITTED files import from `@/lib/programs` which is UNTRACKED:

- components/batch/BatchPlanClient.tsx:14 → `import { getProgramBadgeClass, formatScriptNotes } from "@/lib/programs"`
- components/calendar/CalendarClient.tsx:14 → `import { parseScriptNotes, getProgramBadgeClass } from "@/lib/programs"`
- components/today/TodayClient.tsx:17 → `import { parseScriptNotes, getProgramBadgeClass, PROGRAMS } from "@/lib/programs"`

If `lib/programs.ts` is not committed with the other files, any Vercel build WILL FAIL with:
```
Module not found: Can't resolve '@/lib/programs'
```

---

## Environment Variables

### .env.local — LOCAL STATUS
| Variable | Status |
|----------|--------|
| NEXT_PUBLIC_SUPABASE_URL | PRESENT |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | PRESENT |
| OPENAI_API_KEY | FIXED (was malformed — placeholder on line 3, real key missing = sign on line 5) |
| NEXT_PUBLIC_APP_URL | PRESENT |
| SUPABASE_SERVICE_ROLE_KEY | MISSING |
| OWNER_USER_ID | MISSING |
| NEXT_PUBLIC_VAPID_PUBLIC_KEY | MISSING |
| VAPID_PRIVATE_KEY | MISSING |
| YOUTUBE_API_KEY | MISSING |
| CRON_SECRET | MISSING |

### OPENAI_API_KEY Fix Applied
- BEFORE: Line 3 = `OPENAI_API_KEY=your_openai_api_key_here` (placeholder, wins)
         Line 5 = `OPENAI_API_KEYsk-proj-...` (real key, missing `=`, ignored)
- AFTER:  Single line = `OPENAI_API_KEY=sk-proj-...` (correct)
- EFFECT: All AI features now work locally

### Vercel Environment Variables (what must be set in dashboard)
Must be added at: https://vercel.com/[your-team]/[project]/settings/environment-variables

| Variable | Source |
|----------|--------|
| NEXT_PUBLIC_SUPABASE_URL | From .env.local |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | From .env.local |
| OPENAI_API_KEY | From .env.local (the real sk-proj-... key) |
| SUPABASE_SERVICE_ROLE_KEY | From Supabase dashboard → Project Settings → API |
| OWNER_USER_ID | From Supabase Auth → Users → your user UUID |
| YOUTUBE_API_KEY | From Google Cloud Console |
| NEXT_PUBLIC_VAPID_PUBLIC_KEY | Generate with web-push library |
| VAPID_PRIVATE_KEY | Generate with web-push library |

---

## Fix: Commit Everything to Unblock Production

Run this in order:

```bash
# Step 1: Stage all new and modified files (excluding .env.local which is in .gitignore)
git add lib/programs.ts
git add "app/(dashboard)/weekly-assignment/"
git add "app/(dashboard)/programs/"
git add "app/(dashboard)/program-report/"
git add "app/(dashboard)/clients/"
git add "app/(dashboard)/children/"
git add "app/(dashboard)/checkins/"
git add "app/(dashboard)/consultations/"
git add "app/(dashboard)/followups/"
git add "app/(dashboard)/outcomes/"
git add "app/(dashboard)/revenue/"
git add "app/(dashboard)/success/"
git add app/api/checkins/
git add app/api/children/
git add app/api/consultations/
git add app/api/enrollments/
git add app/api/goals/
git add app/api/milestones/
git add app/api/outcomes/
git add app/api/payments/
git add app/api/program-report/
git add app/api/program-stats/
git add app/api/success-stories/
git add app/api/testimonial-requests/
git add app/api/weekly-assignment/
git add components/checkins/
git add components/children/
git add components/clients/
git add components/consultations/
git add components/followups/
git add components/outcomes/
git add components/program-report/
git add components/programs/
git add components/revenue/
git add components/success/
git add components/weekly-assignment/
git add supabase/migrations/016_program_funnel_schema.sql
git add supabase/migrations/017_enrollment_schema.sql
git add supabase/migrations/018_parent_success_schema.sql
git add supabase/migrations/019_phase17_schema.sql
git add "app/(dashboard)/business/page.tsx"
git add "app/(dashboard)/calendar/page.tsx"
git add "app/(dashboard)/strategist/page.tsx"
git add "app/(dashboard)/today/page.tsx"
git add app/api/batch-plan/route.ts
git add "app/api/leads/[id]/route.ts"
git add app/api/leads/route.ts
git add app/api/strategist/route.ts
git add components/batch/BatchPlanClient.tsx
git add components/business/BusinessDashboardClient.tsx
git add components/calendar/CalendarClient.tsx
git add components/layout/BottomNav.tsx
git add components/layout/Sidebar.tsx
git add "components/leads/LeadDetailClient.tsx"
git add components/leads/LeadPipelineClient.tsx
git add components/strategist/StrategistClient.tsx
git add components/today/TodayClient.tsx
git add next-env.d.ts
git add .gitignore

# Step 2: Commit
git commit -m "feat: Phase 12-17 complete — batching, programs, clients, children, outcomes"

# Step 3: Push to trigger Vercel redeploy
git push origin master
```
