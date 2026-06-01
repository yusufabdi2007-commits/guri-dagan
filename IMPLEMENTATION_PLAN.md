# Guri Dagan — Unified Implementation Plan
# Coaching Business OS + Creator Accountability & Smart Notifications

**Version:** 2.0 — Unified
**Date:** 2026-05-31
**Status:** Active

---

## Mission

Transform Guri Dagan into a complete coaching business operating system that:

- Plans content programmatically across 5 coaching programs
- Drives leads from content to enrolled clients
- Tracks child outcomes and program results
- Manages weekly recording sessions and daily posting
- Proactively keeps the creator accountable through intelligent, data-driven notifications
- Gives the creator total situational awareness in one screen

Every time the creator opens the app she must instantly know:

| Question | Where answered |
|---|---|
| What do I record today? | /today (Sunday mode) |
| What do I post today? | /today (Mon–Sat mode) |
| What CTA do I use? | /today → script → CTA field |
| What program does this belong to? | /today → program badge |
| Which clients need attention? | /followups |
| Which children need attention? | /followups → at-risk section |
| What content is generating leads? | /business → Content→Clients |
| What program is generating revenue? | /business → Program Revenue |
| What topic should I create next? | /weekly-assignment → AI suggestion |

---

## System Architecture

```
Guri Dagan OS
├── Content Layer
│   ├── Weekly Assignment Engine      → /weekly-assignment
│   ├── Program-First Planner         → /api/weekly-assignment
│   ├── AI Batch Generator            → /api/batch-plan
│   ├── Sunday Recording Mode         → /today (isSunday)
│   ├── Daily Post Execution          → /today (Mon–Sat)
│   └── Calendar (central surface)    → /calendar
│
├── Client Layer
│   ├── Lead Pipeline                 → /leads, /leads/[id]
│   ├── Consultations                 → /consultations
│   ├── Client Enrollments            → /clients, /clients/[id]
│   ├── Revenue Tracking              → /revenue
│   └── Follow-ups (at-risk)          → /followups
│
├── Program Layer
│   ├── Program Dashboard             → /programs
│   ├── Program Report (AI)           → /program-report
│   ├── Program Outcomes              → /outcomes
│   └── 5 Programs: MePower™ / Inner Power™ / MindPower™ / DreamPower™ / Slaying Dragons™
│
├── Parent Success Layer
│   ├── Success Dashboard             → /success
│   ├── Children Directory            → /children
│   ├── Child Profiles                → /children/[id]
│   ├── Weekly Check-ins              → /checkins
│   └── Milestones + Stories          → /children/[id]
│
├── Intelligence Layer
│   ├── Business Dashboard            → /business
│   ├── AI Strategist                 → /strategist
│   ├── Content Performance           → /connections (YouTube sync)
│   ├── Analytics                     → /analytics
│   └── Weekly Report                 → /weekly-report
│
└── Accountability Layer              ← PHASE 18 (new)
    ├── Smart Notifications           → /api/notify
    ├── Daily Accountability Loop     → 5 timed reminders
    ├── Streak + Recovery             → streak_freezes + miss recovery
    ├── Weekly CEO Report             → /api/ceo-report (push + in-app)
    ├── Motivation System             → /api/motivate
    └── Notification Preferences      → /settings → notifications tab
```

---

## Current Build Status (as of 2026-05-31)

### Completed Phases

| Phase | Name | Status |
|---|---|---|
| 1 | Core dashboard, ideas, streak, calendar, videos, analytics | Complete |
| 2 | Queue, transcript, hook-scorer, trends, testimonials, CRM | Complete |
| 3 | Settings, repurpose, packages, AI coach, content memory | Complete |
| 4 | Announcements, realtime streak, calendar DnD, push notifications (infrastructure) | Complete |
| 5 | Weekly report, TikTok tracker, YouTube sync, momentum system | Complete |
| 6A | AI Content Strategist | Complete |
| 6B | Auto Content Pipeline | Complete |
| 6C | Premium Mobile UX (micro-interactions, spring animations) | Complete |
| 11A | Review Mode (/review/[projectId]) | Complete |
| 12 | Weekly Content Batching (/batch, /batch/plan, /batch/record) | Complete |
| 13 | Creator Consistency (/today, /inbox, voice idea capture) | Complete |
| 14A | Real Social Intelligence (/connections, YouTube category sync) | Complete |
| 14B | Client Growth Intelligence (/leads, /business upgraded) | Complete |
| 14 (Programs) | Program Funnel (/programs, /program-report) | Complete |
| 15 | Enrollment & Conversion (/consultations, /clients, /revenue, /followups) | Complete |
| 16 | Parent Success (/success, /children, /checkins, /outcomes) | Complete |
| 17 | Unified Content + Business OS (Sunday mode, full scripts, 6D scoring) | Complete |
| 17.1 | UX Simplification (3-tab nav, grouped sidebar) | Complete |

### Critical Deployment Gap

**ALL of Phase 14B through 17.1 is coded but NOT committed to git.**
The live Vercel deployment reflects only the initial commit.
See Phase 19 (Production Hardening) for the exact fix sequence.

---

## Phase 18 — Creator Accountability & Smart Notifications

### Overview

The creator must never wonder what to do next. The system must reach out to her at the right moment with the right information. Notifications must use real data — no generic reminders, no fake analytics, no irrelevant pings.

### Phase 18A — Notification Infrastructure

#### Database: `020_notifications_schema.sql`

```sql
-- Notification preferences per user
CREATE TABLE notification_preferences (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  morning_enabled boolean DEFAULT true,       -- 8:00 AM
  midday_enabled boolean DEFAULT true,        -- 12:00 PM
  afternoon_enabled boolean DEFAULT true,     -- 3:00 PM
  evening_enabled boolean DEFAULT true,       -- 7:00 PM
  sunday_enabled boolean DEFAULT true,        -- Sunday 10:00 AM
  ceo_report_enabled boolean DEFAULT true,    -- Sunday 8:00 PM weekly summary
  timezone text DEFAULT 'Europe/London',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Notification log (what was sent, when, was it acted on)
CREATE TABLE notification_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL CHECK (type IN (
    'morning_reminder',
    'midday_checkin',
    'afternoon_leads',
    'evening_review',
    'sunday_recording',
    'ceo_report',
    'streak_at_risk',
    'missed_post_recovery',
    'at_risk_child_alert',
    'lead_followup_urgent'
  )),
  title text NOT NULL,
  body text NOT NULL,
  data jsonb,                     -- route, context data
  sent_at timestamptz DEFAULT now(),
  opened_at timestamptz,
  acted_at timestamptz,
  was_relevant boolean            -- set to false if user dismisses without acting
);

-- Missed tasks log (for recovery flow)
CREATE TABLE missed_tasks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  task_type text NOT NULL CHECK (task_type IN ('post', 'checkin', 'lead_followup', 'recording')),
  task_date date NOT NULL,
  resolved boolean DEFAULT false,
  resolved_at timestamptz,
  context jsonb,
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE missed_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their notification preferences"
  ON notification_preferences FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users own their notification log"
  ON notification_log FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users own their missed tasks"
  ON missed_tasks FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_notification_log_user_sent ON notification_log(user_id, sent_at DESC);
CREATE INDEX idx_missed_tasks_user_date ON missed_tasks(user_id, task_date DESC, resolved);
```

#### New Files

```
app/api/notify/route.ts              POST — build + send a notification
app/api/notify/preferences/route.ts  GET/PATCH — notification preferences
app/api/notify/log/route.ts          POST — mark notification opened/acted
app/api/ceo-report/route.ts          POST — generate + send weekly CEO report
app/api/missed-tasks/route.ts        GET — detect missed tasks; POST — resolve
lib/notification-builder.ts          Pure functions: build notification payload from real data
lib/notification-scheduler.ts        Cron-compatible trigger functions (called by Vercel Cron)
```

---

### Phase 18B — The Daily Accountability Loop

Five scheduled notifications per day, each built from live data. If the data shows no action is needed, the notification is suppressed.

#### 8:00 AM — Good Morning Reminder

**Trigger:** Every day the app has recorded any user activity in the past 7 days
**Route:** `GET /api/notify?type=morning&userId=...`
**Data fetched before sending:**
- Today's batch post (platform, title, program)
- Today's day of week (Sunday → recording mode)
- Streak count
- Any overdue posts from yesterday

**Sunday message (example):**
```
Title: "Recording Day — 8 videos today"
Body:  "Theme: Child Confidence. YouTube first, then 7 TikToks.
        Your recording checklist is ready."
Action: → /today
```

**Monday–Saturday message (example):**
```
Title: "Post today: [title]"
Body:  "Platform: TikTok · Program: MePower™
        Hook: [first 8 words of hook]"
Action: → /today
```

**If nothing to post:**
```
Title: "Plan your week"
Body:  "No posts scheduled for this week.
        Open Weekly Assignment to generate your content plan."
Action: → /weekly-assignment
```

**Suppression rule:** Never send if user already opened the app today (session active before 8am).

---

#### 12:00 PM — Posting Check-in

**Trigger:** Only sent if today has an unposted scheduled post
**Data fetched:**
- Today's batch post status
- Has user marked it posted already?

**If not yet posted:**
```
Title: "Have you posted yet?"
Body:  "[Title] for [Platform] — [Program] — still showing as scheduled."
Action: → /today
```

**If already posted — suppressed entirely.**
**If no post today — suppressed entirely.**

---

#### 3:00 PM — Lead Follow-up Reminder

**Trigger:** Only sent if there are actionable leads
**Data fetched:**
- Stale leads (created 7+ days ago, not in 'client' or 'closed' stage)
- Consultations with outcome = 'follow_up' or 'no_show'
- Count only

**If leads need attention:**
```
Title: "[N] leads need follow-up"
Body:  "Oldest: [name] — [N] days without contact.
        [consultation name] hasn't rescheduled yet."
Action: → /followups
```

**If no leads need attention — suppressed entirely.**

---

#### 7:00 PM — Daily Review Reminder

**Trigger:** Every day
**Data fetched:**
- Did user post today? (daily_completions or batch_post status = posted)
- Streak count
- At-risk children count
- Any pending testimonial requests

**If posted today:**
```
Title: "Day complete — streak: [N] days"
Body:  "You posted today. [child name] check-in is due this week."
Action: → /checkins (if check-in due) else → /today
```

**If did NOT post:**
```
Title: "You haven't posted today"
Body:  "[Title] is still scheduled. Quick post before midnight keeps your streak."
Action: → /today
```

**Streak at risk (streak >= 3, no post):**
```
Title: "Your [N]-day streak is at risk"
Body:  "Post [title] now to keep it going."
Action: → /today
```

---

#### Sunday 10:00 AM — Recording Day Reminder

**Trigger:** Every Sunday
**Data fetched:**
- Next week's batch (does it exist?)
- Recording progress from today's session
- Recording checklist completion count

**If weekly plan exists:**
```
Title: "Recording Day — [theme]"
Body:  "8 videos planned. YouTube: [title].
        Checklist ready. Record in program order for best flow."
Action: → /today
```

**If no weekly plan:**
```
Title: "Recording Day — plan not ready"
Body:  "Get your Weekly Assignment first —
        AI will suggest the best theme based on your data."
Action: → /weekly-assignment
```

---

### Phase 18C — Weekly CEO Report

**Trigger:** Every Sunday at 8:00 PM (after recording day)
**Route:** `POST /api/ceo-report`
**Storage:** `weekly_ceo_reports` table

#### Data Compiled

```typescript
interface CEOReport {
  week_start: string;

  // Content
  posts_planned: number;
  posts_completed: number;
  completion_rate: number;        // posts_completed / posts_planned

  // Leads
  new_leads_this_week: number;
  leads_converted_to_client: number;
  consultations_booked: number;

  // Revenue
  revenue_this_week: number;
  revenue_currency: string;

  // Children
  active_children: number;
  check_ins_completed: number;
  at_risk_children: number;

  // Content Intelligence
  best_performing_post: { title: string; platform: string; views?: number } | null;
  top_lead_source: string | null;   // which content category brought most leads

  // AI Summary
  ai_summary: string;              // 2-3 sentence plain-English summary
  ai_wins: string[];               // 2-3 wins from this week
  ai_next_week_focus: string;      // one-sentence focus for next week
  momentum_score: number;          // 0–100
}
```

#### Push Notification

```
Title: "Weekly CEO Report ready"
Body:  "Momentum: [score]/100 · [N] posts · [N] leads · [N] check-ins"
Action: → /weekly-report (upgraded to show CEO report)
```

#### New Table: `weekly_ceo_reports`

```sql
CREATE TABLE weekly_ceo_reports (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  week_start date NOT NULL,
  report jsonb NOT NULL,
  ai_summary text,
  ai_wins jsonb,
  ai_next_week_focus text,
  momentum_score integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, week_start)
);

ALTER TABLE weekly_ceo_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their CEO reports"
  ON weekly_ceo_reports FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

---

### Phase 18D — Missed-Task Recovery System

When a scheduled post is not marked as posted by midnight:

1. A `missed_tasks` record is created (task_type = 'post')
2. Next morning's notification references the missed task
3. A recovery card appears on /today until resolved

#### Recovery Card on /today

```
[Missed Yesterday]  TikTok — Inner Power™
"[title]"
[Post Now]  [Skip — already posted]  [Reschedule]
```

**"Post Now"** → marks batch_post as posted, resolves missed_task
**"Already posted"** → marks posted, logs it, resolves missed_task
**"Reschedule"** → moves batch_post.scheduled_date to today, resolves missed_task

#### API: `/api/missed-tasks`

```typescript
// GET — returns all unresolved missed tasks for user
// POST body: { taskId, action: "posted" | "skipped" | "rescheduled" }
//   "posted" → update batch_post status to posted; set resolved = true
//   "skipped" → set resolved = true (user confirms they already handled it)
//   "rescheduled" → update scheduled_date, set resolved = true
```

---

### Phase 18E — Motivation System

A lightweight but emotionally intelligent motivation layer that activates at key moments.

#### Trigger Points

| Moment | Message Type | Example |
|---|---|---|
| User opens app at 6am+ | Early bird message | "You're up early. That's how goals get met." |
| Streak milestone (7, 14, 30, 60, 100 days) | Streak celebration | "30 days of consistency. Your audience is noticing." |
| First post of the week | Weekly start | "Week started. One video at a time." |
| All 7 TikToks recorded | Recording complete | "8 videos done. That's a week of impact in one session." |
| Lead converts to client | Revenue win | "A new parent trusted you with their child. That's the whole point." |
| Child graduates from program | Outcome win | "A child grew because of your work. This is why you do it." |
| Streak broken | Recovery | "One missed day doesn't erase what you've built. Keep going." |

#### Storage

Motivation messages are defined in `lib/motivation-messages.ts` — static typed arrays per trigger. No database needed. No AI call needed. These are pre-written, high-quality lines.

#### Display Locations

- `/today` — motivational banner (replaces generic greeting when trigger applies)
- Push notification body (appended to relevant notifications)
- `/streak` — milestone section

---

### Phase 18F — Notification Preferences UI

**Location:** `/settings` → new "Notifications" tab

```
Notifications

[toggle] Morning Reminder (8:00 AM)
         "What to post today, recording checklist on Sundays"

[toggle] Posting Check-in (12:00 PM)
         "Only sends if you have an unposted scheduled post"

[toggle] Lead Follow-up (3:00 PM)
         "Only sends if leads need attention — never if inbox is clear"

[toggle] Daily Review (7:00 PM)
         "Streak status and at-risk children summary"

[toggle] Sunday Recording Reminder (10:00 AM)
         "Kicks off your recording day with full context"

[toggle] Weekly CEO Report (Sunday 8:00 PM)
         "Momentum score, wins, next week's focus"

Timezone
[Europe/London ▼]
```

**API:** `PATCH /api/notify/preferences` — updates `notification_preferences` row for user
**Upsert on first visit:** if no row exists, create with all defaults = true

---

### Phase 18G — Notification Delivery via Vercel Cron

Vercel Cron Jobs trigger the notification dispatch at the correct times.

#### `vercel.json` additions

```json
{
  "crons": [
    { "path": "/api/cron/notify-morning",   "schedule": "0 8 * * *"  },
    { "path": "/api/cron/notify-midday",    "schedule": "0 12 * * *" },
    { "path": "/api/cron/notify-afternoon", "schedule": "0 15 * * *" },
    { "path": "/api/cron/notify-evening",   "schedule": "0 19 * * *" },
    { "path": "/api/cron/notify-sunday",    "schedule": "0 10 * * 0" },
    { "path": "/api/cron/ceo-report",       "schedule": "0 20 * * 0" },
    { "path": "/api/cron/missed-tasks",     "schedule": "0 1 * * *"  }
  ]
}
```

Each cron route:
1. Fetches all users who have that notification type enabled
2. For each user, fetches live data to determine if the notification is relevant
3. If relevant: builds payload, sends Web Push, logs to `notification_log`
4. If not relevant: skips silently, no log entry

#### Cron Route Structure

```typescript
// app/api/cron/notify-morning/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { buildMorningNotification } from "@/lib/notification-builder";
import { sendWebPush } from "@/lib/web-push";

export async function GET(req: NextRequest) {
  // Verify Vercel cron secret
  if (req.headers.get("Authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  // Get all users with morning notifications enabled
  const { data: prefs } = await supabase
    .from("notification_preferences")
    .select("user_id")
    .eq("morning_enabled", true);

  let sent = 0, skipped = 0, errors = 0;

  for (const pref of prefs ?? []) {
    try {
      const payload = await buildMorningNotification(supabase, pref.user_id);
      if (!payload) { skipped++; continue; }

      const { data: subs } = await supabase
        .from("push_subscriptions")
        .select("subscription")
        .eq("user_id", pref.user_id);

      for (const sub of subs ?? []) {
        await sendWebPush(sub.subscription, payload);
      }

      await supabase.from("notification_log").insert({
        user_id: pref.user_id,
        type: "morning_reminder",
        title: payload.title,
        body: payload.body,
        data: payload.data,
      });

      sent++;
    } catch (err) {
      console.error(`Morning notify failed for ${pref.user_id}:`, err);
      errors++;
    }
  }

  return NextResponse.json({ sent, skipped, errors });
}
```

#### `lib/notification-builder.ts`

All data-fetching and message construction happens here. Each function returns `null` if the notification should be suppressed.

```typescript
export async function buildMorningNotification(
  supabase: SupabaseClient,
  userId: string
): Promise<NotificationPayload | null>

export async function buildMiddayCheckin(
  supabase: SupabaseClient,
  userId: string
): Promise<NotificationPayload | null>

export async function buildAfternoonLeadReminder(
  supabase: SupabaseClient,
  userId: string
): Promise<NotificationPayload | null>

export async function buildEveningReview(
  supabase: SupabaseClient,
  userId: string
): Promise<NotificationPayload | null>

export async function buildSundayRecordingReminder(
  supabase: SupabaseClient,
  userId: string
): Promise<NotificationPayload | null>

export async function buildCEOReport(
  supabase: SupabaseClient,
  userId: string
): Promise<CEOReport | null>
```

#### `lib/web-push.ts`

Wrapper around the existing Web Push infrastructure.

```typescript
import webpush from "web-push";

webpush.setVapidDetails(
  "mailto:admin@guridagan.com",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function sendWebPush(
  subscription: PushSubscription,
  payload: NotificationPayload
): Promise<void> {
  await webpush.sendNotification(
    subscription,
    JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/badge-72.png",
      data: payload.data,
    })
  );
}
```

---

### Phase 18H — In-App Notification Centre

A bell icon in the header shows unread notification count. Clicking opens a slide-out panel listing recent notifications with their acted/unacted state.

**Location:** `components/layout/Header.tsx` — add bell button
**Panel:** `components/notifications/NotificationPanel.tsx`

```typescript
interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  sent_at: string;
  opened_at: string | null;
  data: { route?: string };
}
```

**API:** `GET /api/notify/log?limit=20` — returns recent notifications for current user
**Mark read:** `PATCH /api/notify/log` — sets `opened_at = now()` for given ids

---

## Phase 19 — Production Hardening & Deployment Verification

This phase does not add features. It makes everything already built work correctly in production.

### Phase 19A — Fix Local Environment

#### Fix 1: OPENAI_API_KEY malformation

**File:** `.env.local`
**Problem:** Two lines define OPENAI_API_KEY. Line 3 is a placeholder that wins. Line 5 has the real key but missing `=`.
**Fix:** Replace both lines with one correct line:

```
OPENAI_API_KEY=sk-proj-[actual-key]
```

#### Fix 2: Add missing environment variables locally

```
SUPABASE_SERVICE_ROLE_KEY=[from Supabase project settings → API → service_role]
OWNER_USER_ID=[your Supabase auth user UUID]
YOUTUBE_API_KEY=[from Google Cloud Console → YouTube Data API v3]
NEXT_PUBLIC_VAPID_PUBLIC_KEY=[generate with web-push CLI]
VAPID_PRIVATE_KEY=[generate with web-push CLI]
CRON_SECRET=[generate a random 32-char string]
NEXT_PUBLIC_APP_URL=https://[your-vercel-domain].vercel.app
```

#### Fix 3: Add CRON_SECRET to Vercel

Vercel Cron jobs send an Authorization header. The cron routes must verify it to prevent unauthorized triggering.

```bash
npx web-push generate-vapid-keys
# → copy NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY
```

---

### Phase 19B — Apply All Missing Migrations

Run these in Supabase SQL Editor **in order**. Each is idempotent (uses `IF NOT EXISTS`).

```
012_batch_schema.sql          → weekly_batches, batch_posts
013_inbox_schema.sql          → question_inbox
014_connections_schema.sql    → platform_connections, content_performance, sync_logs
015_client_growth_schema.sql  → leads, lead_activity, content_attribution
016_program_funnel_schema.sql → program column on leads + content_attribution
017_enrollment_schema.sql     → client_enrollments, consultations, payments, testimonial_requests
018_parent_success_schema.sql → child_profiles, child_goals, progress_checkins, milestones, success_stories
019_phase17_schema.sql        → responsibility_score, leadership_score on progress_checkins
020_notifications_schema.sql  → notification_preferences, notification_log, missed_tasks (Phase 18)
021_ceo_reports_schema.sql    → weekly_ceo_reports (Phase 18C)
```

**Verification query after each migration:**

```sql
-- Example: verify 012 applied
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('weekly_batches', 'batch_posts');
-- Must return 2 rows
```

---

### Phase 19C — Commit All Uncommitted Work

```bash
# Stage all changes (19 modified files + ~35 new files)
git add -A

# Verify what is staged
git status

# Commit
git commit -m "feat: Phase 14B–18 — programs, clients, enrollment, parent success,
weekly assignment, unified OS, UX simplification, accountability notifications"

# Push to trigger Vercel redeploy
git push origin master
```

**Critical files that must be committed:**
- `lib/programs.ts` — imported by BatchPlanClient and WeeklyAssignmentClient; build fails without it
- `components/today/TodayClient.tsx` — Sunday mode, single-post mode, script display
- `app/(dashboard)/weekly-assignment/` — entire directory
- `app/api/weekly-assignment/` — AI assignment generator
- `supabase/migrations/016-019` — schema changes for Phase 14–17

---

### Phase 19D — Vercel Environment Variables

Set all of these in Vercel Dashboard → Project → Settings → Environment Variables:

| Variable | Required For | Source |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | All pages | Supabase project settings |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | All pages | Supabase project settings |
| `SUPABASE_SERVICE_ROLE_KEY` | /book, cron jobs | Supabase project settings |
| `OPENAI_API_KEY` | All AI features | OpenAI dashboard |
| `OWNER_USER_ID` | /book public form | Your Supabase user UUID |
| `YOUTUBE_API_KEY` | /connections YouTube sync | Google Cloud Console |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Push notifications | web-push generate |
| `VAPID_PRIVATE_KEY` | Push notifications | web-push generate |
| `CRON_SECRET` | Vercel Cron auth | Generate: `openssl rand -hex 32` |
| `NEXT_PUBLIC_APP_URL` | PWA, metadata | Your Vercel deployment URL |

---

### Phase 19E — Route Verification Checklist

After deployment, verify each route returns 200 (not 404/500):

#### Core OS Routes (must work)
- [ ] `/today` — loads correct mode (Sunday vs Mon–Sat)
- [ ] `/batch` — shows this week's batch and status grid
- [ ] `/business` — loads without error even with empty data
- [ ] `/weekly-assignment` — page loads, generate button works
- [ ] `/calendar` — shows batch_posts alongside calendar_items

#### Client Routes
- [ ] `/leads` — Kanban loads
- [ ] `/leads/[id]` — detail page, edit form works
- [ ] `/consultations` — table loads
- [ ] `/clients` — list loads
- [ ] `/clients/[id]` — profile loads
- [ ] `/revenue` — table loads
- [ ] `/followups` — all 6 sections load

#### Program Routes
- [ ] `/programs` — dashboard loads
- [ ] `/program-report` — AI report generates
- [ ] `/outcomes` — per-program stats load

#### Parent Success Routes
- [ ] `/success` — dashboard loads
- [ ] `/children` — directory loads
- [ ] `/children/[id]` — profile with check-ins loads
- [ ] `/checkins` — slider UI loads, saves successfully

#### AI Routes (must return 200 or graceful fallback, never 500)
- [ ] `POST /api/batch-plan` — generates 8 scripts or returns fallback
- [ ] `POST /api/weekly-assignment` — generates plan or returns fallback
- [ ] `POST /api/strategist` — returns AI response or fallback
- [ ] `POST /api/generate` — returns content or fallback
- [ ] `GET /api/program-stats` — returns data or empty shape
- [ ] `POST /api/program-report` — AI report or fallback

#### Notification Routes (Phase 18)
- [ ] `GET /api/notify/preferences` — returns user preferences
- [ ] `PATCH /api/notify/preferences` — saves preferences
- [ ] `GET /api/notify/log` — returns recent notifications
- [ ] `POST /api/ceo-report` — generates CEO report
- [ ] `GET /api/missed-tasks` — returns unresolved missed tasks

#### Cron Routes (must return 200, verify with manual trigger)
- [ ] `GET /api/cron/notify-morning` — runs without error
- [ ] `GET /api/cron/notify-midday` — runs without error
- [ ] `GET /api/cron/notify-afternoon` — runs without error
- [ ] `GET /api/cron/notify-evening` — runs without error
- [ ] `GET /api/cron/notify-sunday` — runs without error
- [ ] `GET /api/cron/ceo-report` — generates and sends CEO report
- [ ] `GET /api/cron/missed-tasks` — detects and logs missed tasks

---

### Phase 19F — AI System Verification

For each AI route, test with a valid payload and confirm:

1. With a valid OPENAI_API_KEY → returns structured data
2. With an invalid key → returns the fallback response (no 500, no stack trace)
3. If OpenAI times out (45s) → returns fallback response (no hanging request)

#### Test Commands

```bash
# Weekly Assignment
curl -X POST https://[your-domain]/api/weekly-assignment \
  -H "Content-Type: application/json" \
  -d '{"theme":"child confidence","topCategory":"Confidence"}'

# Batch Plan
curl -X POST https://[your-domain]/api/batch-plan \
  -H "Content-Type: application/json" \
  -d '{"theme":"building resilience"}'

# Strategist
curl -X POST https://[your-domain]/api/strategist \
  -H "Content-Type: application/json" \
  -d '{"mode":"content_strategy"}'
```

Expected: All return JSON with the correct shape. `is_fallback: true` is acceptable. HTTP 500 is not.

---

### Phase 19G — Calendar Verification

The calendar must be the central planning surface for the entire week.

**Verify:**
1. Opening `/calendar` shows batch_posts as read-only timeline entries alongside calendar_items
2. A batch_post for today appears with platform badge, program badge, status
3. DnD still works for calendar_items (batch_posts are display-only, not draggable)
4. Clicking a batch_post shows the full script in the detail panel
5. Sunday shows all 8 recording items grouped

---

### Phase 19H — Sunday Recording Mode Verification

On a Sunday (or with date mocking):

1. `/today` shows "Recording Day" header
2. RecordingDayMode component renders with next week's posts
3. If `recordingPosts.length === 0`: shows empty state with "Plan This Week" → `/weekly-assignment`
4. If `recordingPosts.length > 0`: shows all 8 posts grouped by platform/program
5. Each post shows: program badge, platform badge, title, hook, problem, reframe, teaching, action, CTA
6. Mark as recorded updates status in `batch_posts`
7. Progress counter shows X of 8 recorded

---

### Phase 19I — Navigation Verification

**Mobile BottomNav:**
- Primary bar: Today (Star) / This Week (CalendarRange) / Results (BarChart3) / More (MoreHorizontal)
- More sheet opens with Leads / Children / Programs / Settings as prominent 4-col grid
- All Tools section below with 3-col compact grid
- Active state correct for current route

**Desktop Sidebar:**
- Primary 3 at top (no label)
- Then: Clients / Programs / Content / Tools as labeled sections
- Settings standalone at bottom
- Active state correct for current route

---

## Phase 20 — Final Deployment Report (to be completed after Phase 19)

After completing Phase 19, produce this report:

```
GURI DAGAN — PRODUCTION READINESS REPORT
==========================================

Date: [date]
Build: [git commit hash]
Deployment: [Vercel URL]

ISSUES FOUND
------------
[ list each issue found during audit ]

ISSUES FIXED
------------
[ list each issue and what was done ]

MIGRATIONS VERIFIED
-------------------
[ ] 001_initial_schema.sql       — applied
[ ] 002_phase2_schema.sql        — applied
[ ] 003_phase3_schema.sql        — applied
[ ] 004_phase4_schema.sql        — applied
[ ] 005_phase5_schema.sql        — applied
[ ] 011_review_schema.sql        — applied
[ ] 012_batch_schema.sql         — applied
[ ] 013_inbox_schema.sql         — applied
[ ] 014_connections_schema.sql   — applied
[ ] 015_client_growth_schema.sql — applied
[ ] 016_program_funnel.sql       — applied
[ ] 017_enrollment_schema.sql    — applied
[ ] 018_parent_success.sql       — applied
[ ] 019_phase17_schema.sql       — applied
[ ] 020_notifications.sql        — applied
[ ] 021_ceo_reports.sql          — applied

ROUTES VERIFIED
---------------
[ list each route with HTTP status ]

AI SYSTEMS VERIFIED
-------------------
[ ] /api/weekly-assignment  — live AI / fallback
[ ] /api/batch-plan         — live AI / fallback
[ ] /api/strategist         — live AI / fallback
[ ] /api/generate           — live AI / fallback
[ ] /api/program-report     — live AI / fallback

NOTIFICATION SYSTEM VERIFIED
-----------------------------
[ ] VAPID keys configured
[ ] push_subscriptions table populated
[ ] Morning cron: test trigger passed
[ ] Midday cron: test trigger passed
[ ] Afternoon cron: test trigger passed
[ ] Evening cron: test trigger passed
[ ] Sunday cron: test trigger passed
[ ] CEO report cron: test trigger passed
[ ] Missed tasks cron: test trigger passed
[ ] Notification preferences UI accessible
[ ] In-app notification centre visible

CALENDAR VERIFIED
-----------------
[ ] batch_posts visible in calendar
[ ] DnD still works for calendar_items
[ ] Script detail panel opens on click
[ ] Sunday grouping shows all 8 recording items

SUNDAY RECORDING MODE VERIFIED
-------------------------------
[ ] /today shows RecordingDayMode on Sunday
[ ] Empty state → /weekly-assignment link correct
[ ] 8 recording items load with full scripts
[ ] Mark as recorded updates status
[ ] Progress counter accurate

STRATEGIST VERIFIED
-------------------
[ ] Loads with child outcome data
[ ] Loads with lead conversion data
[ ] Loads with top lead categories
[ ] AI response returns all 5 modes

PRODUCTION READINESS SCORE
---------------------------
Score: [ X / 100 ]

Breakdown:
  Core OS routes working:     [ /20 ]
  AI systems working:         [ /20 ]
  Database complete:          [ /15 ]
  Notifications working:      [ /15 ]
  Navigation correct:         [ /10 ]
  Calendar complete:          [ /10 ]
  Sunday mode working:        [ /10 ]

Status: [ READY / NOT READY ]
Blocker (if not ready): [ description ]
```

---

## Implementation Order

Execute in this sequence. Do not skip steps. Do not reorder.

```
Step 1  Fix OPENAI_API_KEY in .env.local
Step 2  Run npm run build locally — confirm 0 errors
Step 3  Apply migrations 012–019 in Supabase SQL Editor
Step 4  git add -A && git commit && git push → Vercel deploys
Step 5  Set all env vars in Vercel dashboard
Step 6  Verify all routes from Phase 19E checklist
Step 7  Verify AI systems from Phase 19F
Step 8  Verify calendar from Phase 19G
Step 9  Verify Sunday recording mode from Phase 19H
Step 10 Verify navigation from Phase 19I
Step 11 Build Phase 18A — notifications schema (020 migration)
Step 12 Build Phase 18B — notification-builder.ts + cron routes
Step 13 Build Phase 18C — CEO report (021 migration + api route)
Step 14 Build Phase 18D — missed tasks (api route + /today recovery card)
Step 15 Build Phase 18E — motivation-messages.ts + /today banner
Step 16 Build Phase 18F — notification preferences UI in /settings
Step 17 Build Phase 18G — vercel.json cron schedule
Step 18 Build Phase 18H — in-app notification centre (bell icon + panel)
Step 19 Apply migrations 020 and 021 in Supabase
Step 20 Set CRON_SECRET in Vercel
Step 21 Commit Phase 18 code + git push
Step 22 Manually trigger each cron route to verify
Step 23 Complete Phase 20 deployment report
```

---

## New Files Required (Phase 18)

```
supabase/migrations/
  020_notifications_schema.sql
  021_ceo_reports_schema.sql

app/api/
  notify/route.ts
  notify/preferences/route.ts
  notify/log/route.ts
  ceo-report/route.ts
  missed-tasks/route.ts
  cron/
    notify-morning/route.ts
    notify-midday/route.ts
    notify-afternoon/route.ts
    notify-evening/route.ts
    notify-sunday/route.ts
    ceo-report/route.ts
    missed-tasks/route.ts

lib/
  notification-builder.ts
  notification-scheduler.ts
  motivation-messages.ts
  web-push.ts            (upgrade existing push infrastructure)

components/
  notifications/
    NotificationPanel.tsx
    NotificationBell.tsx
  today/
    MissedTaskCard.tsx   (recovery card for /today)
```

---

## Modified Files Required (Phase 18)

```
app/(dashboard)/settings/page.tsx      add notifications tab
components/layout/Header.tsx           add NotificationBell
vercel.json                            add crons block
```

---

## Reliability Rules (Non-Negotiable)

These rules apply to every route built in Phase 18 and all routes going forward:

1. **No 500s.** Every API route must have a top-level try/catch. Return a structured error JSON, not a stack trace.

2. **No fake data.** Notification payloads must be built from live Supabase queries. If the query returns empty, the notification is suppressed — not fabricated.

3. **Graceful AI fallback.** Every OpenAI call must have a timeout (45s max) and a fallback response. The fallback must be useful, not a placeholder.

4. **Suppression over noise.** A notification not sent is always better than an irrelevant notification sent. Every notification function must evaluate whether the data justifies sending.

5. **No broken pages.** Every page must render something useful even with zero data (empty state UI, not a crash).

6. **Idempotent migrations.** Every SQL migration must use `CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`. Running them twice must be safe.

7. **RLS everywhere.** Every new table must have row-level security enabled and a policy that scopes to `auth.uid() = user_id`.

---

## Summary

| Layer | What it does | Key routes |
|---|---|---|
| Content Planner | Assigns themes, scripts, programs for the week | /weekly-assignment |
| Recording Manager | Sunday workflow: 8 videos, full scripts, progress | /today (Sunday) |
| Posting Manager | Mon–Sat: one post, hook, program, CTA, mark done | /today (weekdays) |
| Lead CRM | Kanban pipeline, stage history, attribution | /leads, /leads/[id] |
| Client Manager | Enrollments, consultations, client profiles | /clients, /consultations |
| Revenue Dashboard | Payments, program revenue, conversion rates | /revenue, /business |
| Parent Success Tracker | Child check-ins, progress scores, milestones | /children, /checkins |
| Program Tracker | Per-program funnel, AI report, outcomes | /programs, /outcomes |
| AI Business Strategist | 5 modes, category data, lead data, child data | /strategist |
| Daily Accountability Coach | 5 smart notifications, CEO report, missed-task recovery | /api/cron/*, /settings |
