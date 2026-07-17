# HANDOFF.md — Guri Dagan Coaching OS

This document is for the next developer or AI session picking up this project.
It covers what is built, how everything is wired, known limitations, and what to do next.

---

## Current State

**Build status:** Production build passes clean (`npm run build`). ~93 routes. Deployed live at **https://guri-dagan.vercel.app** (Vercel CLI — GitHub auto-deploy is disconnected, deploy manually with `vercel --prod`).
**Runtime status:** `npm run dev` works at `http://localhost:3010`. `.env.local` has Supabase + OpenAI keys.
**Phase:** Phase 17.1 complete (latest). All phases 1–17 complete. See phase log below.
**Recent fixes (June 2026):** Dark mode now defaults on fresh install (ThemeProvider reads localStorage, falls back to dark). DnD fully removed from Calendar + Queue + Leads — React 19 incompatible. Real error messages surfaced on leads save/move/add failures.
**Recent additions (July 2026):** Public contact form `/contact` + email delivery via Resend. See full change log below.
**Business context (June 2026):** Pricing model confirmed — US/UK/Europe: $100/month (1-on-1, 2x/week). Africa/Somalia/Kenya: $25/month (group 5–10 families, 2x/month). Free 20-min consultation call as entry point. All 5 programs same price. WhatsApp: +1 (763) 412-7695.
**Deployment plan:** Vercel production. Developer uses laptop locally. End user (mum) installs as PWA on her phone via https://guri-dagan.vercel.app

---

## July 2026 — Contact Form + Email Delivery (full change log)

### What was built

**Public contact form** at `/contact` (`app/contact/page.tsx` + `components/contact/ContactForm.tsx`).
No auth required — anyone can access it without logging in. Already added to middleware public routes.

**Multi-step flow** (computed dynamically by `getFlow(form)`):
1. `intro` — program breakdown screen (Somali text, user's exact words, do NOT alter)
2. `who` — parent / children / both
3. `upsell` — shown only if `who === 'parent'`, asks if they want child coaching too
4. `children` — shown only if children are involved, collects count + age ranges
5. `details` — name, country (dropdown from `lib/countries.ts`), phone number
6. `source` — how did they find Guri Dagan
7. `message` — free text
8. `done` — success screen (Somali text, do NOT alter)
9. `error` — retry screen shown if API call fails

**API route** at `/api/contact/route.ts`:
- Receives form JSON, builds HTML email, sends via Resend REST API
- `_noEmail: true` flag skips the Resend call (used by stress test script)
- If `RESEND_API_KEY` missing → returns `{ok:true, email:'skipped'}` (never 500s)
- If Resend rejects → returns `{ok:false, error:...}` with status 502 (form shows error screen)
- If Resend accepts → returns `{ok:true}` (form shows done screen)
- Email goes to: `yusufabdi2007@gmail.com` (Resend account owner — see constraint below)
- Gmail forwards automatically to: `rhussein612@gmail.com` (Rahma's inbox)

**Countries list** at `lib/countries.ts` — 195 countries for the contact form dropdown.

**Stress test script** at `scripts/stress-contact.mjs`:
- Sends 100 POST requests to production, 10 with real emails (every 10th), 90 silent (`_noEmail:true`)
- 5 concurrent requests per batch, 200ms delay after any batch containing an email send
- Shows live coloured output per request (status, ms, email/silent, name/country)

### Mistakes made and why they were corrected

**Mistake 1 — WhatsApp as primary delivery**
Original plan had the form generate a WhatsApp deep link and open it. User said: "remove the WhatsApp, I want this message sent straight to email." Fixed: removed all WhatsApp logic (`buildWhatsAppText`, `waLink`, `window.open`), form now POSTs to `/api/contact` and email is the only delivery.

**Mistake 2 — Word "shakhsi" added to Somali done screen**
The done screen Somali text read: *"Coach Rahma waxay heshay su'aashaada waxayna kula xiriiri doontaa si shakhsi ah 24 saacadood gudahood."* The assistant added "si shakhsi ah" (meaning "personally") — a word the user never wrote. User flagged it: "what is this shaqsi". Fixed: removed those words entirely. Rule: **never add, alter, or translate Somali text. Only use the user's exact words.**

**Mistake 3 — RESEND_API_KEY not set in Vercel**
Stress test showed 20/20 passing (200 OK) but no emails arrived. Root cause: API key was missing from Vercel env vars. When the key is absent the API silently returns `{ok:true, email:'skipped'}` so the form still showed success — no visible error. Added key to Vercel via `vercel env add`.

**Mistake 4 — BOM encoding corruption when saving API key**
Used PowerShell `echo "re_..." | vercel env add` which added a UTF-16 BOM character (U+FEFF, decimal 65279) to the key. Resend rejected every email with: *"Cannot convert argument to a ByteString because the character at index 7 has a value of 65279."* Fixed: deleted the corrupted key and re-added it using the Vercel REST API directly (`Invoke-RestMethod POST /v10/projects/{id}/env`) which avoids PowerShell's pipe encoding.

**Mistake 5 — Sending to wrong email address**
Was sending to `rhussein612@gmail.com` (Rahma's email). Resend error: *"You can only send testing emails to your own email address (yusufabdi2007@gmail.com)."* Resend's shared `onboarding@resend.dev` domain can only deliver to the Resend account owner's email — any other recipient is silently dropped or rejected. Fixed: changed `to` to `yusufabdi2007@gmail.com`. Then set up Gmail forwarding from `yusufabdi2007@gmail.com` → `rhussein612@gmail.com` so Rahma receives every submission automatically.

**Mistake 6 — Stress test flooded Resend (429 rate limit)**
First stress test sent 100 requests with no throttling on email sends. Resend rate limit is 10 requests/second — concurrent email sends from the test exceeded this. All 10 email attempts were rejected with 429. Emails never arrived. Fixed: added 200ms delay between batches that contain an email send, and added `_noEmail` flag so 90/100 requests bypass Resend entirely.

### Resend constraint (IMPORTANT)

**Until a custom domain is verified in Resend, emails can only be sent TO `yusufabdi2007@gmail.com`.**

The `from` address is `onboarding@resend.dev` (Resend's shared sandbox domain). This domain is restricted — Resend will only deliver mail sent from it to the account owner's verified email. Attempting to send to any other address results in a 403.

**Current workaround:** Gmail forwarding — `yusufabdi2007@gmail.com` forwards all mail to `rhussein612@gmail.com`.

**Permanent fix (when ready):** Verify a custom domain (e.g. `guridagan.com`) at resend.com/domains, then update `from` to `contact@guridagan.com` and `to` to `['rhussein612@gmail.com']` in `app/api/contact/route.ts`.

### Somali text in ContactForm — DO NOT CHANGE

The intro screen and done screen contain Somali text written by the user. It must never be altered, translated, or added to. The exact strings live in `components/contact/ContactForm.tsx` inside the `T.so` object:
- `introGreeting`, `introWelcome`, `introParentLabel`, `introParentDesc`, `introChildLabel`, `introChildPrograms[]`, `introClosing`, `introStart`
- `doneTitle`, `doneText`

### Environment variables added (July 2026)

| Variable | Value | Purpose |
|---|---|---|
| `RESEND_API_KEY` | `re_JHEE7FKG_...` | Resend email delivery for `/api/contact` |

Added to Vercel production via REST API (not CLI — CLI corrupts with BOM on Windows PowerShell).

---

## Auth & Accounts

There are **no pre-set credentials**. Accounts are created via the Sign Up form at `/login`.

- Enter any email + password (min 6 chars) → click **Sign Up** → account is created instantly
- All data is scoped to that account via Supabase Row Level Security
- There is only one account in use: the owner (mum). No multi-user setup needed.

**Email confirmation:** Supabase requires email confirmation by default. Disable it for seamless use:
Supabase dashboard → **Authentication → Settings → uncheck "Enable email confirmations"**

**If locked out:** Go to Supabase dashboard → **Authentication → Users** — you can see all accounts, delete them, or manually confirm emails from there.

---

## Deployment

| Environment | URL | Who uses it |
|---|---|---|
| Local dev | `http://localhost:3010` | Developer (laptop) |
| Production | https://guri-dagan.vercel.app | Mum (phone, installed as PWA) |

**To deploy to Vercel:**
1. Push repo to GitHub (private)
2. vercel.com → Import Project → select repo
3. Add env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `OPENAI_API_KEY`, `NEXT_PUBLIC_APP_URL`
4. Deploy → copy the `*.vercel.app` URL
5. Update `NEXT_PUBLIC_APP_URL` in Vercel env vars to the live URL

**PWA install on iPhone:**
Safari → open Vercel URL → Share button → "Add to Home Screen" → Add
Opens fullscreen, no browser bar — looks and behaves like a native app.

**PWA install on Android:**
Chrome → open Vercel URL → 3-dot menu → "Install App"

---

## File Map

```
MOM/
├── app/
│   ├── layout.tsx                    Root layout — Inter font, ThemeProvider, Toaster, PWAInstall, OfflineBanner
│   ├── page.tsx                      Redirects: logged in → /dashboard, logged out → /login
│   ├── error.tsx                     Global error boundary (client component)
│   ├── globals.css                   CSS variables (light+dark), utilities (glass, gradient-*, score-bar, ring-*, fab-shadow, shimmer, tap-scale, spring-in, fade-up, glow-pulse, momentum-glow, success-glow, heartbeat, btn-ripple, stagger-1..6, gradient-text, gradient-text-warm)
│   ├── offline/
│   │   └── page.tsx                  Offline fallback page (Somali + English, reload button)
│   ├── status/
│   │   └── page.tsx                  PUBLIC health check — env vars, live Supabase ping, setup progress bar
│   ├── book/
│   │   └── page.tsx                  PUBLIC booking intake — no auth required, uses /api/book, WhatsApp CTA + package preview
│   ├── (auth)/
│   │   ├── layout.tsx                Passthrough layout
│   │   └── login/page.tsx            Sign in / Sign up toggle, Supabase auth
│   ├── (dashboard)/
│   │   ├── layout.tsx                Auth guard + Sidebar + BottomNav + FAB shell
│   │   ├── error.tsx                 Dashboard-level error boundary
│   │   ├── dashboard/
│   │   │   ├── page.tsx              Fetches stats + profile server-side, passes to DashboardClient
│   │   │   └── loading.tsx           Skeleton loading screen
│   │   ├── ideas/
│   │   │   ├── page.tsx              Fetches all ideas, passes to IdeasClient
│   │   │   └── loading.tsx           Skeleton loading screen
│   │   ├── generator/page.tsx        Static shell, AI is client-side via /api/generate
│   │   ├── calendar/page.tsx         Fetches ±14 days of calendar_items + ideas list
│   │   ├── streak/page.tsx           Fetches completions + streak_freezes, streak calc server-side
│   │   ├── videos/page.tsx           Fetches all videos
│   │   ├── analytics/
│   │   │   ├── page.tsx              Fetches completions + ideas + videos for charts
│   │   │   └── loading.tsx           Skeleton loading screen
│   │   ├── queue/page.tsx            Fetches recording queue items + ideas for import
│   │   ├── transcript/page.tsx       Fetches past shorts_suggestions, static upload shell
│   │   ├── hook-scorer/page.tsx      Static shell, scoring is client-side via /api/score-hook
│   │   ├── trends/page.tsx           Static shell, trends fetched client-side via /api/trends
│   │   ├── testimonials/page.tsx     Fetches all testimonials server-side
│   │   ├── crm/
│   │   │   ├── page.tsx              Fetches clients + pending tasks server-side
│   │   │   ├── loading.tsx           Skeleton loading screen
│   │   │   └── [id]/page.tsx         Fetches single client + sessions + tasks
│   │   ├── settings/page.tsx         Fetches user profile, passes to SettingsClient
│   │   ├── repurpose/page.tsx        Fetches saved repurposed_assets history, passes to RepurposeClient
│   │   ├── packages/page.tsx         Fetches coaching_packages + booking_requests server-side
│   │   ├── announcements/page.tsx    Fetches all announcements server-side
│   │   ├── weekly-report/page.tsx    Fetches completions + ideas + profile for AI weekly report
│   │   ├── tiktok/page.tsx           Fetches all tiktok_posts server-side
│   │   ├── youtube/page.tsx          Fetches videos + youtube_config server-side
│   │   ├── strategist/page.tsx       Fetches streak, videos, tiktok_posts, content_memory, hook_scores, categories — passes to StrategistClient
│   │   ├── pipeline/page.tsx         Static shell, full pipeline flow is client-side via PipelineClient
│   │   ├── channel/page.tsx          Fetches videos + queue + hook_scores + completions + tiktok_posts → ChannelClient
│   │   └── review/
│   │       └── [projectId]/page.tsx  Server component — fetches video (notFound if wrong user), parallel fetch review + markers → ReviewClient (no Header, full overlay)
│   └── api/
│       ├── generate/route.ts         POST — gpt-4o-mini, returns GeneratedContent JSON (rate: 30/hr)
│       ├── transcribe/route.ts       POST multipart/form-data — Whisper-1, maxDuration=60 (rate: 10/hr)
│       ├── shorts/route.ts           POST — gpt-4o-mini, viral clip detection with timestamps (rate: 20/hr)
│       ├── score-hook/route.ts       POST — gpt-4o-mini, 5-dimension hook scoring + rewrites (rate: 30/hr)
│       ├── trends/route.ts           POST — gpt-4o-mini, pain point + content idea clustering (rate: 10/hr)
│       ├── coach/route.ts            POST — gpt-4o-mini, coaching message, supports EN/SO (rate: 10/hr)
│       ├── repurpose/route.ts        POST — gpt-4o-mini, 1 transcript → 13 assets, accepts mode + emotionalIntensity (rate: 20/hr)
│       ├── memory/route.ts           GET/POST — content memory (used topics log, duplicate prevention)
│       ├── book/route.ts             POST — PUBLIC booking intake, no auth, uses SUPABASE_SERVICE_ROLE_KEY + OWNER_USER_ID
│       ├── push-subscribe/route.ts   POST/DELETE — Web Push subscription storage
│       ├── momentum/route.ts         POST — gpt-4o-mini, daily 1-action suggestion, 3 modes (rate: 20/hr)
│       ├── weekly-report/route.ts    POST — gpt-4o-mini, AI weekly intelligence report + momentum score 0-100 (rate: 5/hr)
│       ├── youtube-sync/route.ts     POST — YouTube Data API v3, syncs channel to videos table; GET — returns youtube_config (rate: 10/hr)
│       ├── strategist/route.ts       POST — gpt-4o-mini, full strategy: today_move + confidence + 6 recommendations + 4 insights + 7-day roadmap (rate: 15/hr)
│       ├── pipeline/route.ts         POST — orchestrates upload → transcript → hooks → shorts → captions → queue in one AI flow (rate: 10/hr)
│       ├── review-markers/route.ts   POST=generate AI markers (gpt-4o-mini, 8-12 markers, rate 20/hr); PATCH=toggle is_resolved; DELETE=clear all for video
│       └── review-status/route.ts    POST — upsert video_reviews record; sets review_completed_at on approval states
│
├── components/
│   ├── ui/                           Hand-rolled shadcn-compatible components (no CLI used)
│   │   ├── button.tsx                Variants: default, destructive, outline, secondary, ghost, warm, cool; sizes include icon-sm
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── label.tsx
│   │   ├── textarea.tsx
│   │   ├── badge.tsx                 Variants: default, success, warning, info, purple
│   │   ├── dialog.tsx
│   │   ├── select.tsx
│   │   ├── progress.tsx              Uses gradient-primary CSS utility
│   │   ├── tabs.tsx
│   │   ├── switch.tsx
│   │   ├── skeleton.tsx              Shimmer skeleton loader component
│   │   ├── toast.tsx                 Variants: default, destructive, success
│   │   ├── toaster.tsx               Renders toast stack
│   │   ├── use-toast.ts              Global toast state (memory store + listeners)
│   │   └── FAB.tsx                   Floating action button — 5 quick-action sub-buttons (incl. Pipeline), framer-motion spring animations (stiffness 400/damping 22), Plus icon rotates 45deg, backdrop dismiss
│   ├── providers/
│   │   └── ThemeProvider.tsx         Custom light/dark provider using localStorage
│   ├── layout/
│   │   ├── Sidebar.tsx               Desktop only (md+), 5 sections: Main / AI Tools / Intelligence / Business / Settings — Intelligence includes AI Strategist + Pipeline
│   │   ├── BottomNav.tsx             Mobile only — 4 primary tabs + More sheet (17 pages + dark mode + sign out) — Strategist + Pipeline in More sheet; isMoreActive recognizes /review/* routes
│   │   └── Header.tsx                Sticky page header with title, subtitle, dark mode toggle
│   ├── dashboard/
│   │   ├── DashboardClient.tsx       Streak hero, stat grid, quick actions, recent ideas, MomentumCard, CoachCard
│   │   ├── MomentumCard.tsx          Daily focus system — 3 mode buttons (Ready/Low Energy/Quick Win), AI suggestion, mark-done, burnout detection, logs to momentum_logs
│   │   └── CoachCard.tsx             AI coaching message + Best Next Action, EN/SO toggle, cached 2h in sessionStorage
│   ├── ideas/
│   │   └── IdeasClient.tsx           Search, status/platform filter chips, card list, add/edit/delete dialog
│   ├── generator/
│   │   └── GeneratorClient.tsx       Form → /api/generate → tabbed results + Save to Ideas + duplicate topic warning
│   ├── calendar/
│   │   └── CalendarClient.tsx        Week navigator, 7-day list, per-day add/status/delete (no DnD — React 19 incompatible)
│   ├── streak/
│   │   ├── StreakClient.tsx          Mark posted, 3 SVG rings, confetti, streak freeze, 30-day heatmap, milestones, Supabase Realtime
│   │   ├── StreakRing.tsx            SVG circular progress ring (color, size, strokeWidth props)
│   │   └── ConfettiEffect.tsx        canvas-confetti wrapper — burst mode + side-cannon milestone mode
│   ├── videos/
│   │   └── VideosClient.tsx          Status pipeline cards, YouTube thumbnail auto-load, add/edit/delete dialog; ScanSearch Review button on every video card
│   ├── analytics/
│   │   └── AnalyticsClient.tsx       Bar + pie charts, category bars, 30-day heatmap, growth velocity, best posting day
│   ├── queue/
│   │   └── QueueClient.tsx           Priority list with Up/Down reorder buttons, 4 status columns, import from ideas (DnD removed — React 19 incompatible)
│   ├── transcript/
│   │   └── TranscriptClient.tsx      File drag-drop zone, Whisper transcribe → /api/shorts, saves to DB, history tab
│   ├── hook-scorer/
│   │   └── HookScorerClient.tsx      5-dimension score bars, verdict badge, rewrites, example hooks preloaded
│   ├── trends/
│   │   └── TrendsClient.tsx          10 category buttons, /api/trends response with copy buttons
│   ├── testimonials/
│   │   └── TestimonialsClient.tsx    Text/audio/video types, topic tags, featured star, copy-as-quote, filter
│   ├── crm/
│   │   ├── CrmClient.tsx             Client list + stats + pending tasks + add-client dialog + search/filter
│   │   └── ClientDetail.tsx          Client hero card, sessions with mood emoji, tasks with toggle, delete
│   ├── settings/
│   │   └── SettingsClient.tsx        Display name, weekly_goal, preferred_platform, coach_tone — saves to profiles
│   ├── repurpose/
│   │   └── RepurposeClient.tsx       Transcript input → 13 assets, 4 mode buttons (Balanced/Emotional/Educational/Quick) + emotional intensity selector, save to library, history tab
│   ├── packages/
│   │   └── PackagesClient.tsx        Coaching package CRUD + booking inquiry log (New → Contacted → Booked)
│   ├── weekly-report/
│   │   └── WeeklyReportClient.tsx    Week stats, Generate AI Report button, momentum score 0-100, wins/warnings/next-week actions, strategic insight, saves to weekly_reports table
│   ├── tiktok/
│   │   └── TikTokClient.tsx          Add post form (views/likes/shares/saves/completion/emotional_tag/hook), content-type performance bars, top performer card, expandable post list
│   ├── youtube/
│   │   └── YouTubeClient.tsx         Channel ID setup, sync button → /api/youtube-sync, video list sorted by views, top performer card, connection status
│   ├── strategist/
│   │   └── StrategistClient.tsx      5-mode selector, Today's Best Move hero card + confidence ring, momentum note, stats strip, 6 recommendation cards, 4 performance insights, 7-day roadmap — 4h session cache per mode
│   ├── pipeline/
│   │   └── PipelineClient.tsx        Upload → transcript → hooks → shorts → captions → queue, step-by-step AI pipeline flow, framer-motion step transitions
│   ├── channel/
│   │   └── ChannelClient.tsx         Operational command center — health banner, hero metrics, pipeline grid (4 cols), review queue, recording queue, publishing readiness, retention snapshot, throughput score 0-100; ScanSearch "Review" button on Ready to Post cards
│   ├── review/
│   │   ├── ReviewClient.tsx          fixed inset-0 z-50 bg-[#080808] overlay shell — header (back/title/progress/status/AI markers/clear), player+sidebar layout, MobileMarkersSheet, generateMarkers(), handleStatusChange(), toast system
│   │   ├── ReviewPlayer.tsx          HTML5 video (custom controls) + YouTube iframe branch; seekRef registration; progress bar with colored marker dots; speed 0.5x-2x; skip ±10s; MARKER_BAR_COLORS + legend row
│   │   └── ReviewSidebar.tsx         Two tabs: Markers (nearby alert, filter chips, stats, scrollable list, resolve toggle, jump button) + Notes (textarea + save); MARKER_CONFIG per type
│   ├── OfflineBanner.tsx             Fixed banner on offline/reconnect detection
│   ├── PushNotifications.tsx         Push notification subscribe/unsubscribe button (used in Settings)
│   └── PWAInstall.tsx                Registers /sw.js service worker on mount
│
├── lib/
│   ├── utils.ts                      cn(), formatDate(), getStreakMessage(), getStatusColor(), getPlatformColor(), getConsistencyScore(), getWeekDates(), isToday()
│   ├── env.ts                        validateEnv() — checks all env vars at startup, logs missing ones; hasOpenAI(), hasPublicBooking()
│   ├── rate-limit.ts                 In-memory per-IP rate limiter for API routes, cleanup every 5 min
│   └── supabase/
│       ├── client.ts                 createBrowserClient (use in "use client" components)
│       ├── server.ts                 createServerClient with cookies (use in Server Components)
│       └── middleware.ts             Session refresh + auth redirect logic
│
├── types/
│   └── index.ts                      Platform, ContentStatus, VideoStatus, ContentCategory, ContentIdea, Video,
│                                     CalendarItem, DailyCompletion, GeneratedContent, GenerateRequest interfaces
│
├── middleware.ts                      Runs updateSession + validateEnv on every non-static request
├── public/
│   ├── manifest.json                 PWA manifest (name, icons, shortcuts)
│   ├── sw.js                         Cache-first service worker (caches /, /dashboard, /offline)
│   └── icons/                        icon-192.png + icon-512.png (purple gradient)
│
└── supabase/
    └── migrations/
        ├── 001_initial_schema.sql    Phase 1: content_ideas, videos, calendar_items, daily_completions
        ├── 002_phase2_schema.sql     Phase 2: recording_queue, streak_freezes, shorts_suggestions, testimonials, crm_*, hook_scores
        ├── 003_phase3_schema.sql     Phase 3: profiles, content_memory, repurposed_assets, coaching_packages, booking_requests, announcements + indexes
        ├── 004_phase4_schema.sql     Phase 4: videos gets views/likes/saves/comments/performance_notes; push_subscriptions
        └── 005_phase5_schema.sql     Phase 5: tiktok_posts, weekly_reports, youtube_config, momentum_logs, team_roles; videos gets is_favorite/emotional_tags/archived/youtube_video_id; content_memory gets avg_views/avg_engagement/emotional_style/best_performing
```

---

## Architecture Patterns

### Data fetching
All pages follow the same pattern:
- **Page** (`app/(dashboard)/x/page.tsx`) = async Server Component — fetches from Supabase using server client, passes data as props
- **Client** (`components/x/XClient.tsx`) = `"use client"` — owns local state, handles mutations via browser Supabase client

Initial data is server-rendered (fast). Mutations update local state optimistically. After mutations, `router.refresh()` resyncs server state.

### Supabase clients
- `lib/supabase/server.ts` — only in Server Components and Route Handlers
- `lib/supabase/client.ts` — only in Client Components (inside event handlers/effects, never at module level)

### OpenAI
- Client is instantiated **inside** the POST handler function, never at module level (avoids build-time crash when OPENAI_API_KEY is absent)
- All routes use `gpt-4o-mini` except transcription which uses `whisper-1`
- All routes export `export const maxDuration = 60` for Vercel's 60s function timeout

### Auth flow
1. `middleware.ts` runs on every request
2. Unauthenticated users → redirected to `/login`
3. Authenticated users hitting `/login` → redirected to `/dashboard`
4. `(dashboard)/layout.tsx` has a secondary server-side auth check

### Theme
Custom `ThemeProvider` (not next-themes). Reads/writes `localStorage`. Applies `.dark` class to `<html>`. Toggle in both `Sidebar` (desktop) and `BottomNav` More sheet (mobile). **Default is dark** — if no localStorage value exists, app starts in dark mode (prevents plain white flash on first install).

### Streak calculation
Done server-side in `streak/page.tsx` and `dashboard/page.tsx`:
1. Deduplicate `completed_date` (one entry per day regardless of platforms)
2. Sort descending
3. Walk forward — gap of exactly 1 day = increment streak
4. Streak resets if today AND yesterday have no entry

`streak_freezes` table: any date in this table is treated as if posted, preventing streak breaks.

### AI caching strategy
- **CoachCard**: sessionStorage, 2h TTL, keyed by language (`coach_message_EN`, `coach_message_SO`)
- **MomentumCard**: sessionStorage, 4h TTL, keyed by mode (`momentum_data_normal`, etc.)
- **WeeklyReport**: sessionStorage, keyed by `week_start` date — one cache per week

### Momentum system
`MomentumCard.tsx` → `/api/momentum` → `momentum_logs` table.
- 3 modes: `normal` (full focus), `low_energy` (5-10 min task), `quick_win` (high-impact, 15 min)
- Mark Done button upserts to `momentum_logs` (unique per user per day)
- On mount: checks if today already logged as completed → shows completed state
- Burnout detection: if streak > 14 and consistency < 60%, prompt includes burnout context

### YouTube sync
`/api/youtube-sync` POST flow:
1. Takes `channelId` from request body
2. Fetches channel's uploads playlist ID from YouTube Data API v3
3. Gets latest 50 video IDs from playlist
4. Fetches statistics (views/likes/comments) in one batch call
5. Upserts to `videos` table — matches on `youtube_video_id`, creates new row if not found
6. Saves config to `youtube_config` table
Requires `YOUTUBE_API_KEY` env var (server-side only, not NEXT_PUBLIC_).

### Content Memory
`/api/memory` GET returns all previously used topics for the user. `GeneratorClient` loads these on mount and shows a warning if the current topic is similar to a previously generated one. After a successful generate, the topic is POSTed to memory (fire-and-forget). Uses `ilike` fuzzy matching in Supabase.

---

## Known Limitations & Issues

### 1. Whisper file size limit
The `/api/transcribe` route accepts up to 25MB (Whisper API limit). Long videos will need to be trimmed or audio extracted before uploading. There's a client-side check but no server-side chunking.

### 2. Supabase Realtime — streak only
Realtime is set up in `StreakClient.tsx` only (subscribes to `postgres_changes` INSERT on `daily_completions`). Other pages do not auto-refresh on remote changes — they require manual `router.refresh()`.

### 3. No drag-and-drop (React 19 incompatibility)
`@hello-pangea/dnd` v16.6.0 only supports React ^16/17/18. This project uses React 19 — importing DnD crashes the entire page with no error shown. All DnD has been removed:
- `/leads` — Kanban replaced with mobile-friendly stage selector (Select dropdown per card); DnD removed June 2026
- `/calendar` — drag-to-reschedule removed June 2026; delete + re-add to change day
- `/queue` — drag-to-reorder replaced with Up/Down arrow buttons June 2026
Do NOT re-add `@hello-pangea/dnd`. Use `@dnd-kit/core` (supports React 19) if DnD is needed in future.

### 4. No image upload for thumbnails
`videos.thumbnail_url` column exists. YouTube URLs auto-show a thumbnail via `img.youtube.com/vi/{id}/hqdefault.jpg`. Non-YouTube videos have no thumbnail upload (no Supabase storage bucket set up).

### 5. Push notifications require VAPID keys + Edge Function
`PushNotifications.tsx` and `/api/push-subscribe` are wired up. To activate:
1. Run `npx web-push generate-vapid-keys`
2. Add `NEXT_PUBLIC_VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` to env vars
3. Build a Supabase Edge Function CRON to send push events to stored subscriptions nightly

### 6. TikTok is manual entry only
TikTok API access is not publicly available. All TikTok stats are entered manually via `/tiktok`. CSV import is a future enhancement.

### 7. WhatsApp number needs updating
`/book/page.tsx` has `wa.me/447700000000` — replace with real number: **+1 (763) 412-7695** → `wa.me/17634127695`

### 8. team_roles table is schema-only
The `team_roles` table exists in the database but there is no UI to invite team members. The full multi-user system is a Phase 6 task.

---

## What to Build Next

### Phase 5 — COMPLETE ✓

1. ✅ Daily Momentum System — `MomentumCard.tsx`, `/api/momentum`, 3 modes, burnout detection
2. ✅ Creator Intelligence Weekly Report — `/weekly-report`, `/api/weekly-report`, momentum score 0-100
3. ✅ TikTok Manual Tracker — `/tiktok`, `TikTokClient.tsx`, emotional tag performance analytics
4. ✅ YouTube Data API Integration — `/youtube`, `/api/youtube-sync`, real channel sync + top performer
5. ✅ Smart Repurpose Upgrade — 4 modes (Balanced/Emotional/Educational/Quick) + emotional intensity
6. ✅ Public Booking Upgrade — WhatsApp CTA, trust signals, package preview
7. ✅ Production Health Page — `/status`, env checks, live Supabase ping, setup progress bar
8. ✅ Team roles foundation — `team_roles` table (schema only)
9. ✅ Navigation — "Intelligence" section in Sidebar + Weekly Report / YouTube / TikTok in BottomNav

### Phase 6A — COMPLETE ✓

1. ✅ AI Content Strategist — `/strategist`, `/api/strategist`, 5 modes, confidence ring, 6 recommendations, 4 insights, 7-day roadmap, burnout detection, 4h session cache

### Phase 6B — COMPLETE ✓

1. ✅ Auto Content Pipeline — `/pipeline`, `/api/pipeline`, `PipelineClient.tsx` — upload → transcript → hooks → shorts → captions → queue in one AI flow
2. ✅ Navigation — Pipeline (GitBranch icon) added to Sidebar AI Tools section + BottomNav More sheet

### Phase 6C — COMPLETE ✓

1. ✅ Premium Mobile UX — framer-motion page transitions, spring-based animations, tap feedback utilities
2. ✅ Micro-interactions system — `tap-scale`, `tap-scale-sm`, `btn-ripple`, `spring-in`, `fade-up`, `stagger-1..6` CSS utilities in globals.css
3. ✅ Momentum celebrations — `success-glow`, `heartbeat`, `glow-pulse`, `momentum-glow` CSS utilities; StreakClient heartbeat on ring increment
4. ✅ Smart empty states — Ideas, Videos, Queue, Announcements: emotionally intelligent copy + gradient icons + glow-pulse
5. ✅ FAB upgrade — 5 actions (incl. Pipeline), framer-motion spring (stiffness 400/damping 22), Plus rotates 45deg
6. ✅ StreakClient — "Posted today" → "You showed up today." + success-glow spring-in, 7 new motivational messages
7. ✅ MomentumCard — AnimatePresence per mode, spring-in on completion, success-glow on just-completed
8. ✅ DashboardClient — momentum message + success-glow spring-in, quick action buttons → premium rounded-2xl + tap-scale
9. ✅ Design system — `gradient-text`, `gradient-text-warm` utilities added; cohesive premium aesthetic

### Phase 7 — Intelligent Scale + Creator Automation

Mission: Help a Somali parenting mentor create more impact with less energy.
The platform should feel like an AI creative director, calm business operator, momentum companion, and production accelerator.

**Priority 1 — Smart Recording Mode** `/record`
- Teleprompter with adjustable speed, script overlay, emotional tone guidance
- Clip segmentation + pause/restart markers, estimated runtime
- Modes: Quick / Emotional Storytelling / Educational Teaching / Batch Recording
- Low-energy simplified scripts, emphasis highlighting, hook-first recording flow

**Priority 2 — Media Search Engine**
- Upgrade media management into a searchable archive
- Search by: transcript text, emotional tags, parenting topic, hook style, platform, performance, upload date
- Smart grouping, duplicate clip detection, AI-generated tags, favorite clips, timeline previews

**Priority 3 — Advanced Emotional Analytics**
- Correlate emotional intensity / empathy / storytelling depth / educational value against retention/saves/shares/watch time
- Visualize: emotional trend graphs, resonance heatmaps, strongest emotional patterns
- Generate natural-language insights: "Your audience responds strongest to calm storytelling."

**Priority 4 — Auto Thumbnail System**
- AI-assisted thumbnail generation: Shorts covers, YouTube thumbnails, title overlays, emotional keyword emphasis, safe mobile crops
- 3–5 variations, emotional styles, clean typography, high-contrast readability
- Prepare architecture for image generation integrations

**Priority 5 — Automated Weekly Planning V2**
- Generate recording/editing/posting/recovery days + repurposing opportunities
- Low-energy fallback plans, missed-post recovery plans, momentum protection logic
- Output: realistic weekly creator operating plan

**Priority 6 — Smart Repurposing Engine V2**
- From ONE transcript generate: TikTok scripts, carousel posts, quote graphics, newsletters, community posts, coaching snippets, workshop ideas, FAQ content
- Tone presets, emotional intensity presets, storytelling depth settings

**Priority 7 — Business Operations Expansion**
- Workshop management, downloadable resources, onboarding journeys, progress tracking, follow-up automation, resource library
- Prepare for: courses, memberships, private communities (keep implementation lightweight)

**Priority 8 — AI Creator Memory V2**
- Remember: successful hooks, repeated structures, overused topics, audience emotional preferences, strongest storytelling styles
- Generate freshness recommendations: "unused strong angles", "topics needing rest"

**Priority 9 — Background Automation Infrastructure**
- Queued jobs, retry workers, scheduled processing, background AI tasks, processing logs
- Prepare architecture for: FFmpeg workflows, auto clipping, subtitle rendering, cloud rendering
- Do NOT overengineer — keep systems modular

**Priority 10 — Premium Brand Experience**
- Proper public landing page: mission section, family transformation stories, testimonials wall, workshop promotion, mobile-first storytelling layout

**Priority 11 — App Intelligence Layer**
- Proactive notifications: "You haven't posted emotional content in 9 days.", "This old transcript could become 4 strong Shorts.", "Teen communication topics are trending upward."
- Guide without overwhelming

**Priority 12 — Full Push Notification System** (existing foundation)
- Streak reminders, quiet hours, notification preferences
- Supabase Edge Function cron to send push events to stored subscriptions (`push_subscriptions` table already exists)

**Also carries forward from earlier backlog:**
- Full team/collaborator access (use `team_roles` table foundation)
- CSV import for TikTok analytics
- PDF export for weekly reports
- Calendar drag-and-drop between days (use `@dnd-kit/core` — NOT `@hello-pangea/dnd` which crashes React 19)
- Supabase Storage bucket for custom video thumbnails

### Phase 10A — COMPLETE ✓

1. ✅ Channel Dashboard — `/channel`, `ChannelClient.tsx` — operational health banner, 4-metric hero, quick actions (6), pipeline grid (Recorded/Editing/Edited/Posted), review queue panel, recording queue panel, publishing readiness tracker, retention snapshot, throughput score 0-100
2. ✅ Navigation — "Operations" section added to Sidebar with Channel Dashboard; Channel added to BottomNav More sheet

### Phase 11A — COMPLETE ✓

1. ✅ Review Mode — `/review/[projectId]`, dark cinematic full-screen overlay (fixed inset-0 z-50 bg-[#080808])
2. ✅ AI Markers — `/api/review-markers` (POST/PATCH/DELETE), 7 types: Hook/Emotional Peak/Dead Zone/Silence Gap/Replay-Worthy/Retention Opportunity/Strong CTA, gpt-4o-mini, rate 20/hr
3. ✅ Review Status — `/api/review-status` (POST), 5 states: needs_review/needs_fix/approved/high_retention_candidate/ready_for_export
4. ✅ Player — HTML5 video + YouTube iframe branch, custom controls, speed 0.5x–2x, skip ±10s, marker dots on progress bar, seekRef cross-component pattern
5. ✅ Sidebar — Markers tab (filter chips, nearby alert, resolve toggle, jump) + Notes tab; mobile bottom sheet at 72vh
6. ✅ Entry points — ScanSearch icon on every video card in `/videos`; "Review" badge on Ready to Post cards in `/channel`
7. ✅ Navigation — BottomNav `isMoreActive` extended with `|| pathname.startsWith("/review/")` (no top-level nav item needed)
8. ✅ DB — `video_reviews` + `review_markers` tables — run `011_review_schema.sql`
9. ✅ Graceful degradation — if migration not run, markers return temp IDs; status save returns 500 warning without crashing UI

### Phases 12–17.1 — COMPLETE ✓

- **Phase 12** — Weekly Content Batching System (/batch, /batch/plan, /batch/record, /api/batch-plan, weekly_batches + batch_posts tables)
- **Phase 13** — Creator Consistency + Low-Stress Workflow (/today one-tap execution, voice idea capture mic FAB → /api/voice-idea → Whisper+GPT, /inbox → /api/inbox-convert, question_inbox table)
- **Phase 14A** — Real Social Intelligence (/connections, /api/connections, YouTube auto-sync + GPT category classification, platform_connections + content_performance + sync_logs tables)
- **Phase 14B** — Client Growth Intelligence (/leads Kanban pipeline, /leads/[id] detail, /business dashboard, content_attribution + leads + lead_activity tables)
- **Phase 14 Programs** — /programs, /program-report, /api/program-stats, /api/program-report, program column on leads (016_program_funnel_schema.sql)
- **Phase 15** — Enrollment & Conversion System (/consultations, /clients, /clients/[id], /revenue, /followups, client_enrollments + consultations + payments + testimonial_requests tables)
- **Phase 16** — Parent Success System (/success, /children, /children/[id], /checkins, /outcomes, child_profiles + child_goals + progress_checkins + milestones + success_stories tables)
- **Phase 17** — Unified Content + Business OS (Sunday Recording Mode, Mon-Sat single post, fixed program distribution, full 8-video scripts, 6D child scoring, 019_phase17_schema.sql)
- **Phase 17.1** — UX Simplification (BottomNav primary: Today/Week/Results; Sidebar reorganized; More sheet streamlined)

### Phase 11 — IN PROGRESS (Creator Acceleration)

Mission: FROM "building capabilities" TO "maximizing creator throughput, retention quality, workflow speed."
Success metric: consistently produce high-retention long-form videos quickly, reliably, low stress.

Remaining priorities (Priority 2 Review Mode is done above):
- **Priority 1** — Real Daily Usage Mode: "Continue Working" dashboard widget
- **Priority 3** — Clip Extraction System: long-form → clips, AI candidates/timestamps/scores
- **Priority 4** — Thumbnail Workspace: CTR optimization, version tracking, title pairing, pinned winner
- **Priority 5** — Workspace Mode: single-screen daily ops (active/blocked/failed/due)
- **Priority 6** — Retention Feedback Loop: post-publish CTR/avg view duration/drop-offs/replay moments
- **Priority 7** — Content Systemization: hook/intro/pacing templates, caption presets, emotional patterns
- **Priority 8** — Bulk Creator Operations: batch review/export/publish-state/clip gen/archive
- **Rule** — do NOT build Premiere Pro/After Effects

### Phase 10 — Real Creator Workflow Optimization

**Mission:** Infrastructure is mature. Shift focus entirely to content throughput.
**Benchmark:** Can the creator consistently produce, manage, review, and publish 30+ high-retention long-form videos with low operational stress?
**This phase is about:** workflow speed, publishing efficiency, operational visibility, review velocity, batch management.
**NOT about:** editing complexity, enterprise tooling, advanced rendering systems.

**Priority 1 — Channel Dashboard** `/channel`
- Single-screen creator command center: active projects, processing videos, export queue, recent failures, retention averages, upload readiness, videos awaiting review, publishing backlog, completed exports today
- Quick filters, health indicators, throughput summaries, urgency highlighting
- Goal: creator immediately sees "What needs attention right now?"

**Priority 2 — Content Calendar V2**
- Upgrade into a true publishing workflow: drag/drop scheduling, publish-state tracking, thumbnail completion status, title readiness, platform targeting, upload notes, checklist system
- Separate: long-form / clips+shorts / drafts / scheduled posts
- Statuses: Draft → Editing → Review → Ready → Scheduled → Published → Archived

**Priority 3 — Title + Thumbnail Workspace** `/workspace`
- Workflow organization first (not AI generation first)
- Multiple title variants, pinned best title, thumbnail version history, hook tracking, inspiration references, CTR notes, emotional framing notes
- Side-by-side comparison, favorite/pinned system, "used vs unused" indicators

**Priority 4 — Export Presets V2**
- Reusable: caption styles, export templates, branding presets, audio curves, thumbnail positioning, title formatting rules
- Store: channel identity settings, typography preferences, color styles, export defaults
- Goal: every upload feels visually consistent

**Priority 5 — Review Workflow System**
- Review Mode: jump to hooks / emotional peaks / silence/dead zones, marker filtering, playback speed review, approval/reject flow
- Quick approve, needs revision, add review notes, "high retention candidate" tags
- Goal: reduce review fatigue dramatically

**Priority 6 — Channel Memory System**
- Persistent creator/channel intelligence: preferred pacing, hook structures, caption style, audio intensity, strongest retention patterns, best storytelling structures
- Use memory to personalize recommendations, improve strategist output, improve pipeline outputs

**Priority 7 — Bulk Channel Operations**
- batch export, batch archive, batch caption regeneration, batch audio assignment, batch status updates, bulk scheduling
- Requirements: keyboard shortcuts, multi-select UI, fast queue handling
- Goal: manage 30–100 videos efficiently

**Priority 8 — Lightweight Publishing Tracker**
- Operational checklist per video: uploaded? scheduled? published? thumbnail complete? title finalized? description complete? pinned comment ready?
- NOT full social publishing automation — keep it lightweight

**Priority 9 — System Search V2**
- Expand global search: titles, notes, exports, thumbnails, logs, pipeline snapshots, strategist outputs, review comments
- Fuzzy search, recent searches, saved searches, quick-jump actions

**Priority 10 — Performance + Workflow Speed**
- Optimize: queue responsiveness, bulk action speed, review navigation, route transitions, table virtualization, caching
- Goal: app feels instant even with large media libraries

---

## Environment Variables Reference

| Variable | Where to get it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → anon public |
| `OPENAI_API_KEY` | platform.openai.com → API keys |
| `NEXT_PUBLIC_APP_URL` | Your Vercel deployment URL (or `http://localhost:3010` locally) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → service_role (**keep secret**) |
| `OWNER_USER_ID` | Coach's Supabase user ID (Auth → Users → copy UUID) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Run `npx web-push generate-vapid-keys` → public key |
| `VAPID_PRIVATE_KEY` | Same command → private key (used in Edge Function for push sending) |
| `YOUTUBE_API_KEY` | Google Cloud Console → APIs & Services → YouTube Data API v3 → Credentials |

---

## Database Schema Summary

### Phase 1 tables (`001_initial_schema.sql`)
```
content_ideas     → id, user_id, title, hook, platform, category, status, notes, created_at, updated_at
videos            → id, user_id, title, status, platform, url, thumbnail_url, recorded_at, edited_at, posted_at, notes, idea_id
                    Phase 4 adds: views, likes, saves, comments, performance_notes
                    Phase 5 adds: is_favorite, emotional_tags (text[]), archived, youtube_video_id
calendar_items    → id, user_id, idea_id, title, scheduled_date, status, platform
daily_completions → id, user_id, completed_date (date), platform, video_id, notes
                    UNIQUE(user_id, completed_date, platform)
```

### Phase 2 tables (`002_phase2_schema.sql`)
```
recording_queue    → id, user_id, idea_id, title, status, estimated_duration, filming_notes, sort_order
streak_freezes     → id, user_id, freeze_date (date), reason  UNIQUE(user_id, freeze_date)
shorts_suggestions → id, user_id, original_transcript, suggestions (jsonb)
testimonials       → id, user_id, client_name, content, type (text/audio/video), topics (text[]), featured
crm_clients        → id, user_id, name, email, phone, notes, concerns, status, progress_rating
crm_sessions       → id, user_id, client_id, session_date, notes, mood_rating, topics_covered (text[]), next_steps
crm_tasks          → id, user_id, client_id, title, due_date, completed, priority
hook_scores        → id, user_id, hook_text, scores (jsonb), verdict
```

### Phase 3 tables (`003_phase3_schema.sql`)
```
profiles           → id (PK = auth.uid()), display_name, weekly_goal (default 5), preferred_platform, coach_tone, timezone
                     Auto-created on signup via trigger handle_new_user()
content_memory     → id, user_id, topic, category, platform, hook_used, tone_used, times_used, last_used_at
                     Phase 5 adds: avg_views, avg_engagement, emotional_style, best_performing
repurposed_assets  → id, user_id, source_title, source_transcript, source_idea_id, assets (jsonb), asset_count
coaching_packages  → id, user_id, name, description, price_usd, currency, sessions_included, duration_weeks, type, active, sort_order
booking_requests   → id, user_id, client_name, email, phone, package_id, package_name, message, status, source
announcements      → id, user_id, title, content, type (update/win/reminder/resource/event), pinned, platforms (text[])
```

### Phase 4 tables (`004_phase4_schema.sql`)
```
videos             → gets views, likes, saves, comments, performance_notes columns added
push_subscriptions → id, user_id, endpoint, p256dh, auth  UNIQUE(user_id, endpoint)
```

### Phase 5 tables (`005_phase5_schema.sql`)
```
tiktok_posts       → id, user_id, title, posted_at (date), views, likes, shares, saves, comments,
                     completion_rate, emotional_tag (inspiring/funny/educational/emotional/practical/story),
                     topic_category, hook_text, notes
weekly_reports     → id, user_id, week_start (date), week_end (date), posts_this_week, posts_last_week,
                     streak_at_generation, top_category, ai_summary, ai_wins, ai_warnings, ai_next_week (jsonb)
                     UNIQUE(user_id, week_start)
youtube_config     → id (= auth.uid()), channel_id, channel_name, last_synced_at, sync_enabled
momentum_logs      → id, user_id, log_date (date), mode (normal/low_energy/quick_win), suggestion, completed
                     UNIQUE(user_id, log_date)
team_roles         → id, owner_user_id, member_email, role (admin/editor/viewer), invited_at, accepted_at
                     UNIQUE(owner_user_id, member_email) — schema only, no UI yet
```

### Phase 11A tables (`011_review_schema.sql`)
```
video_reviews      → id, user_id, video_id (FK videos.id), review_status (needs_review/needs_fix/approved/
                     high_retention_candidate/ready_for_export), reviewer_notes, review_completed_at
                     UNIQUE(video_id) — upserted via onConflict:"video_id"
review_markers     → id, user_id, video_id (FK videos.id), marker_type (Hook/Emotional Peak/Dead Zone/
                     Silence Gap/Replay-Worthy/Retention Opportunity/Strong CTA), timestamp_seconds,
                     confidence_score (0–1), explanation, is_resolved, is_ai_generated
                     — supports future clipStartTime/clipEndTime/exportCandidate fields
```

All tables have Row Level Security: `auth.uid() = user_id`.

---

## Design System Reference

### Colors
Primary: purple (`hsl(262, 83%, 58%)`) — active states, buttons, streak rings
Warm gradient: orange→pink — urgent states, streak warning, MomentumCard header
Cool gradient: blue→purple — secondary CTAs
All colors are CSS variables in `globals.css`, supporting dark mode automatically.

### Component conventions
- Rounded corners: `rounded-xl` (12px) or `rounded-2xl` (16px)
- Cards: `shadow-sm`, hover: `card-hover` (lift + shadow-md)
- Transitions: `duration-200` hover, `duration-300` layout changes
- Mobile tap targets: minimum `h-11` (44px)
- Button press: `active:scale-90` or `active:scale-95`

### CSS utilities (globals.css)
- `.glass` — frosted glass background
- `.gradient-primary` — purple gradient
- `.gradient-warm` — orange→pink gradient
- `.gradient-cool` — blue→purple gradient
- `.gradient-text` — purple gradient text fill (Phase 6C)
- `.gradient-text-warm` — warm orange→pink gradient text fill (Phase 6C)
- `.card-hover` — subtle lift on hover
- `.scrollbar-hide` — hides scrollbar on filter chip rows
- `.animate-fade-in` — 0.3s fade + slide up on page load
- `.score-bar` — colored fill bar used in HookScorer
- `.ring-track` / `.ring-progress` — SVG ring base styles
- `.fab-shadow` — glow shadow on FAB button
- `.page-enter` — page transition animation
- `.milestone-pop` — scale pop for milestone celebrations
- `.shimmer` — loading skeleton shimmer
- `.tap-scale` — `active:scale-95` touch feedback (Phase 6C)
- `.tap-scale-sm` — `active:scale-98` subtle tap feedback (Phase 6C)
- `.spring-in` — spring-feel entrance animation (Phase 6C)
- `.fade-up` — fade + translate-y entrance (Phase 6C)
- `.glow-pulse` — soft pulsing glow (Phase 6C)
- `.momentum-glow` — warm orange glow for momentum states (Phase 6C)
- `.success-glow` — green glow for completion states (Phase 6C)
- `.heartbeat` — scale heartbeat animation for streak ring (Phase 6C)
- `.btn-ripple` — ripple effect on button press (Phase 6C)
- `.stagger-1` … `.stagger-6` — animation delay utilities for staggered list entrance (Phase 6C)

### Animations (tailwind.config.ts)
- `fade-in`, `slide-up`, `pulse-soft`, `bounce-soft`, `scale-in`
- `slide-in-bottom`, `slide-out-bottom` — used for BottomNav More sheet
- `spin-slow` — used for loading indicators

---

## Dependency Notes

- `canvas-confetti` — streak/milestone celebrations in `ConfettiEffect.tsx`
- `@hello-pangea/dnd` — **REMOVED** — incompatible with React 19 (crashes page). Do not re-add.
- `recharts` — bar + pie charts in `AnalyticsClient.tsx`
- `framer-motion` — page transitions (`PageTransition.tsx` in dashboard layout)
- `date-fns` — date formatting and week calculations in `WeeklyReportClient.tsx` and `TikTokClient.tsx`
- `next-pwa` — removed (peer dep conflicts with Next.js 15); service worker is manual (`public/sw.js`)
- `npm install --legacy-peer-deps` is required due to Radix UI peer dep resolution
- All shadcn components are **manually written** (no shadcn CLI) — live in `components/ui/`

---

## Supabase Setup Checklist

- [x] Create Supabase project
- [x] Run `supabase/migrations/001_initial_schema.sql` in SQL Editor
- [x] Run `supabase/migrations/002_phase2_schema.sql` in SQL Editor
- [x] Run `supabase/migrations/003_phase3_schema.sql` in SQL Editor
- [x] Run `supabase/migrations/004_phase4_schema.sql` in SQL Editor
- [ ] Run `supabase/migrations/005_phase5_schema.sql` in SQL Editor  ← **Phase 5 tables**
- [ ] Run `supabase/migrations/011_review_schema.sql` in SQL Editor  ← **Phase 11A tables (video_reviews, review_markers)**
- [x] Copy Project URL + anon key into `.env.local`
- [ ] Copy OpenAI API key into `.env.local`  ← **required for all AI features**
- [ ] Disable email confirmation: Supabase → Authentication → Settings → "Confirm email" off  ← **do before first login**
- [ ] Add `SUPABASE_SERVICE_ROLE_KEY` to `.env.local` ← needed for `/book` public endpoint
- [ ] Add `OWNER_USER_ID` to `.env.local` ← coach's UUID from Supabase → Auth → Users (after first signup)
- [ ] Deploy to Vercel and update `NEXT_PUBLIC_APP_URL` to the live URL
- [ ] Add all env vars to Vercel dashboard (same as `.env.local`)
- [ ] Update WhatsApp number in `/app/book/page.tsx` → `wa.me/17634127695` (+1 763 412-7695)
- [ ] Mum installs PWA on phone: open Vercel URL in Safari → Share → Add to Home Screen
- [ ] (Optional) Add `YOUTUBE_API_KEY` for YouTube channel sync
- [ ] (Optional) Generate VAPID keys (`npx web-push generate-vapid-keys`) and add to env for push notifications
- [ ] (Optional) Set up custom SMTP for production emails
