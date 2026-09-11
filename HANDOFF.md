# HANDOFF.md — Guri Dagan Coaching OS

This document is for the next developer or AI session picking up this project.
It covers what is built, how everything is wired, known limitations, and what to do next.

---

### 2026-09-11 (part 4) — Rebuilt login to go server-side, at user's request, after it kept failing for them specifically

- Status: complete. Parts 1–3 fixed three real, verified bugs (missing form, stale caching, a self-inflicted service-worker reload) but the user reported it was *still* hanging for them after all three. Every automated test from this environment (curl, repeated fresh-browser Playwright runs) passed consistently, meaning the failure was specific to the user's own device/network in a way that couldn't be reproduced or diagnosed remotely. User asked to rebuild the login section rather than keep patching around an undiagnosable client-side issue.
- **What changed:** sign-in/sign-up previously called `supabase-js` directly from the browser (`signInWithPassword`/`signUp` running client-side), meaning the request went straight from the visitor's own browser to `*.supabase.co`. If that specific visitor's network/ISP/DNS/an extension couldn't reliably reach that third-party domain — plausible for a Somalia/Africa-based user hitting a Supabase project hosted elsewhere — the call would hang with nothing any server-side fix could touch, since the whole problem lived in a network hop this app's code was never involved in.
- **New `app/api/auth/login/route.ts`** — POST route (rate-limited 20/min like other public routes) that runs `signInWithPassword`/`signUp` **server-side** using `lib/supabase/server.ts`'s cookie-aware client, inside a Vercel serverless function. The Supabase call now happens server-to-server (Vercel → Supabase), a much more reliable path than an arbitrary visitor's own connection. The visitor's browser only ever needs to reach `guri-dagan.vercel.app` itself — which was never the part that was failing (the page always loaded fine, every time, for the user).
- **`app/(auth)/login/page.tsx`** — now `fetch("/api/auth/login")` (same-origin, so cookies set by the route's response are stored automatically) instead of calling `supabase-js` directly. Kept the 12s `withTimeout()` wrapper from part 3 around the fetch call itself, as a backstop.
- **Verified, not assumed:** `curl` with a real cookie jar against live production confirms the route sets the session cookie correctly and a follow-up `GET /today` with that cookie returns `200`. 3 fresh-browser Playwright runs against live production all landed on `/today` with the dashboard rendered.
- **If this still fails for the user after this change**, the page-load itself unquestionably works for them (confirmed by them directly), so a failure at this point would specifically mean their browser can't complete a request to `guri-dagan.vercel.app/api/auth/login` (same domain the page itself loaded from) — which would be a very unusual, very specific failure mode (e.g. a browser extension blocking POST requests, or blocking `fetch`/XHR specifically) worth asking about directly rather than patching further blind.

---

### 2026-09-11 (part 3) — Found the actual root cause: self-inflicted service-worker reload wiping logins in progress

- Status: complete. User kept reporting the login button just sits on "pending" forever, even after part 2's caching hardening. Rather than keep guessing at the user's specific browser/network, wrote a repeatable automated test (headless Playwright against the live production site) — and it caught a real, reproducible bug: **the "self-healing" service worker code added in part 2 was itself the cause.**
- **Root cause:** `components/PWAInstall.tsx`'s new `controllerchange` listener (added in part 2 to auto-recover from a stale cached SW) reloads the page when a service worker "takes control." But `clients.claim()` in `public/sw.js`'s `activate` handler makes that exact same event fire on a page's **very first ever visit** too — not only on a genuine update replacing an older worker. Net effect: on every first-time visit to the site, sometime during the page's lifetime (often right as the user was mid-typing or had just clicked Sign In), the page would silently reload itself, wiping the in-progress request/form state — which looks exactly like "the button does nothing" or "it just hangs." This is a well-known gotcha with this exact reload-on-`controllerchange` pattern and was introduced by the part-2 fix itself, not a pre-existing bug.
- **Fix:** `components/PWAInstall.tsx` now records whether the page already had an active controller *before* registering — i.e. whether a service worker was already running from a previous visit. Only reloads on `controllerchange` if that was true (a genuine update replacing an already-active worker); a first-ever install is left alone since there's nothing stale to recover from.
- **Also added (same session, part of the same investigation):** the sign-in/sign-up call itself had no timeout — any slow/hung connection (to Supabase specifically) would leave the button on an infinite spinner with zero feedback forever, since the `await` never resolved or rejected. `app/(auth)/login/page.tsx` now wraps both calls in a `withTimeout()` helper (12s) so the UI always comes back with an actionable error instead of hanging indefinitely, regardless of cause.
- **Verified the fix, not just assumed it:** ran the full sign-in flow against live production 5 times in a row with fresh headless-browser contexts (no shared state between runs, the same shape of "first-ever visit" that was broken) — 5/5 landed on `/today` with the dashboard rendered. Before this fix, the identical test was intermittently failing (stuck on `/login`, page context destroyed mid-test by an unexpected navigation) — reproduced the exact bug the user was hitting, not just a hypothesis.
- **Lesson for next session:** when a defensive/hardening fix touches a service worker, always test with a **completely fresh browser context** (no prior visit, no prior SW state) — that's the one scenario `clients.claim()`-related bugs only show up in, and it's exactly what a real first-time or long-absent visitor experiences.
- `npx tsc --noEmit --incremental false` and `npm run build` clean. Pushed to GitHub and deployed via `vercel --prod`.

---

### 2026-09-11 (part 2) — Eliminated every caching layer that could serve a stale `/login`

- Status: complete. After the form rebuild below, user reported still seeing a stuck "Please wait..." page — but a different design entirely (pill Sign In/Sign Up tabs, a Somali tagline, "A mission-driven platform for Somali parenting coaches") that doesn't exist anywhere in this codebase's git history for this file. Confirmed via direct `curl` (cache-busted) that the live server was correctly returning the new minimal page the whole time — the mismatch was happening client-side. User confirmed it reproduced even in a brand-new Incognito window, which should rule out normal browser cache/service-worker state entirely; couldn't get further diagnostic detail (view-source, exact browser build) from the user, so rather than keep guessing at the one specific cause, hardened every layer that could plausibly cause any version of this class of bug:
  - **`next.config.ts`** — added explicit `Cache-Control: no-store, must-revalidate` on `/login` and `Cache-Control: no-cache, must-revalidate` on `/sw.js`. Verified both apply on the live domain via `curl -I`. Previously `/login` (statically prerendered, "○" in the build output) had no route-specific cache header, so it inherited Vercel/Next's default caching for static pages, which can legitimately persist for a while at the edge.
  - **`public/sw.js`** — bumped `CACHE_NAME` to `v4` (forces the `activate` handler to purge any older cache on any client that does update).
  - **`components/PWAInstall.tsx`** — now calls `registration.update()` on every page load (forces an immediate byte-check of `sw.js` instead of waiting for the browser's own ~24h default recheck interval) and listens for `controllerchange`, auto-reloading the page **once** (guarded via `sessionStorage` to prevent a reload loop) the moment a newer service worker takes control. This is the actual fix for the class of bug, not just this specific occurrence: previously, self-healing an old stuck service worker required the user to manually clear site data; now it happens automatically within one page load of any future deploy.
  - Tried `export const dynamic = "force-dynamic"` on the login page first — confirmed via a clean `rm -rf .next && npm run build` that Next still statically optimizes a page that's 100% `"use client"` with no server data fetching, regardless of that export. Removed it since it had no effect; the `Cache-Control` header (which applies independent of static/dynamic rendering) is what actually matters here.
  - Re-verified end-to-end with a real headless-browser (Playwright) run against the live production domain after deploying: loads `/login`, fills real credentials, submits, lands on `/today` with the full dashboard rendered — confirmed via network log that `POST .../auth/v1/token?grant_type=password` returns `200`.
  - `npx tsc --noEmit --incremental false` and `npm run build` clean. Pushed to GitHub and deployed via `vercel --prod`.
- **If this ever recurs:** the next diagnostic step (not reached this session — the user context made a targeted fix undeliverable, so the above defense-in-depth approach was used instead) would be getting the affected user's exact browser + version and a `view-source:` screenshot to distinguish "wrong HTML received" from "old JS still executing after correct HTML."

---

### 2026-09-11 — Fixed the long-standing broken `/login` page (real root cause, not cosmetic)

- Status: complete. User reported login has been broken "since I can remember." Two stacked bugs, both fixed:
- **Bug 1 — `app/(auth)/login/page.tsx` had no sign-in form at all.** The 2026-09-04 security pass correctly *removed* the critical "auto-login-as-owner" middleware vulnerability (see that section above), but nobody ever put a real sign-in form back in the login page afterward — it just sat there waiting 6 seconds for an auto-login that would never come, then showed "Could not connect. Check that OWNER_EMAIL and SUPABASE_SERVICE_ROLE_KEY are set correctly." That message was a leftover from the old design and actively misleading (those env vars were never the actual problem). Rebuilt the page as a real email/password **Sign In / Sign Up** form using `lib/supabase/client.ts`'s browser client directly (`signInWithPassword` / `signUp`) — matches the flow already documented in this file's "Auth & Accounts" section.
- **Bug 2 — Supabase's "Enable email confirmations" setting is still ON**, and a real signup attempt (`yabdi617@gmail.com`, created 2026-06-22) got permanently stuck: account created, confirmation email never actioned, zero successful sign-ins ever since. This file has said since earlier sessions to disable that setting in the Supabase dashboard — it was never actually done. **Still needs to be done:** Supabase dashboard → Authentication → Settings → uncheck "Enable email confirmations", otherwise any *future* new signup can get stuck the same way. (Not fixable from code/CLI — no Supabase management/personal-access-token is present in this environment, only the service-role key, which manages data/users but not project auth config.)
- **Verified which accounts are real:** listed all `auth.users` directly via service-role admin API. Three existed: `yabdi617@gmail.com` (never confirmed, never signed in — abandoned/stuck signup, left untouched), `yusufabdi2007@gmail.com` (owner confirmed this is "the manager" account), `rjabriil75@gmail.com` (owner confirmed this is "the admin" account). Both real accounts were already `email_confirmed_at`-set in the DB, so bug 2 wasn't blocking them specifically — only bug 1 was.
- **Set fresh passwords for both real accounts directly via `admin.updateUserById`** (no email round-trip, so this always works regardless of the confirmation-email setting) and verified both new passwords actually sign in successfully with a live `signInWithPassword` call before handing them to the owner. New credentials were given to the user directly in chat, not written to any file in this repo.
- `npx tsc --noEmit --incremental false` and `npm run build` both clean. Dev server confirmed `/login` returns 200 and renders the new form.
- **Still needed:** (1) disable "Enable email confirmations" in Supabase dashboard per above so this class of bug can't recur for a future signup; (2) deploy this fix to production (`vercel --prod`) since GitHub auto-deploy is still disconnected; (3) `git push origin master` — was already 1 commit behind before this session per the note below, now 2.

---

### 2026-09-08 — Resend account migration, live enrollment load-test, and production deploy

- Status: complete. Continuation of the 2026-09-04 email-recipient change — that session left the code pointed at `ymo441993@gmail.com` but blocked on Resend's sandbox restriction (it only delivers to the account's own registered email, which was still `yusufabdi2007@gmail.com`). Owner created a **new Resend account** registered under `ymo441993@gmail.com` instead of changing the old one.
- **New `RESEND_API_KEY`** (`re_EwsSNjV3...`) added to `.env.local` and to Vercel's production environment variables via `vercel env add RESEND_API_KEY production --value "..."`.
  - **Gotcha hit while doing this — worth remembering:** `vercel env add NAME production < file` and `cat file | vercel env add ...` both *appeared* to succeed but silently saved an **empty** value on this CLI version. The reliable method is the `--value` flag: `vercel env add RESEND_API_KEY production --value "the-actual-key" --yes`. Also worth knowing: Vercel marks production env vars **"sensitive" by default**, meaning `vercel env pull`/`env ls` can never show the value back afterward (by design, not a bug) — don't use pull-and-diff as a way to verify a value was set correctly; trust the CLI's "Added Environment Variable" success message instead, or test the actual behavior it powers.
- **Live end-to-end load-test of the Academy enrollment → email pipeline:** ran 24 real registrations (in two batches of 20 + 4) through the actual `/api/academy/enroll` route against the local dev server (pointed at the live Supabase project), each with a distinct spoofed `X-Forwarded-For` IP to get past the route's 10/hr per-IP rate limit (same technique as the 2026-08-30 100-student load test). All 24 succeeded (`201`), and the server logs confirmed all 24 notification emails were accepted by Resend with zero errors. All 24 test student rows (name-prefixed `LOADTEST`) were deleted from `academy_students` afterward — nothing left in the DB.
- **First delivery landed in Spam** (expected — brand-new Resend sending account/domain has zero reputation with Gmail yet). Owner found the first 4 in spam and marked them "Not spam." A second batch of 4 sent immediately after showed the identical accepted-by-Resend pattern; whether Gmail inbox-places new mail from this sender yet is expected to improve over the next several real sends as Gmail builds trust in the sender, not something fixable in code.
- **Deployed to production** via `vercel --prod` (manual CLI deploy — GitHub auto-deploy is still disconnected, see existing note below). Confirmed live afterward with direct HTTP checks: `/login`, `/academy`, `/book`, `/contact`, `/status` all return `200` on `https://guri-dagan.vercel.app`, including the previously-broken `/academy` (was incorrectly redirecting to `/login` on the *old* deployment before this deploy ran).
- **False alarm, not a real bug:** immediately after deploying, the owner's own Edge browser (normal tab, not installed PWA) showed the app's `/offline` fallback page ("You are offline") when visiting the live site. Direct server-side checks the whole time returned clean `200`s, and the same URL loaded fine in an Edge InPrivate window — this confirmed it was a **stale service worker cached in that one browser profile** from an earlier visit, not a server/deployment problem. Fixed by clearing cached site data for the domain in that browser profile (`Ctrl+Shift+Delete` → clear cached images/files, or clear site permissions/data for `guri-dagan.vercel.app`).
- **Still needed:** `git push origin master` — today's commits (and the 2026-09-04 session's) exist locally and were deployed straight to Vercel from the local directory (`vercel --prod` uploads local files directly, independent of git state), but have **not** been pushed to GitHub yet, so the remote repo is still behind. Push before anyone else pulls this repo or before relying on GitHub as a backup.

---

### 2026-09-04 — Second security hardening pass (dependency audit + defense-in-depth IDOR fixes)

- Status: complete. User asked for another security pass on top of the earlier one this session. Ran `npm audit`, then a fresh read-through of every API route the first pass hadn't verified in full, plus a re-check of the recently-added `country` field handling.
- **Dependency vulnerabilities — `npm audit fix`:** cleared all 9 known vulnerabilities (1 low, 8 high), including a Next.js-level advisory range covering SSRF-via-rewrites, middleware/proxy bypass under Turbopack, and a few DoS vectors. Next.js bumped `16.2.6` → `16.3.4` within its existing `^16.2.6` package.json range (lockfile-only change, no package.json edit needed). Also patched transitive `form-data`, `js-yaml`, `nanoid`, `browserslist`, `sharp`, `postcss`. `npx tsc --noEmit` and `npm run build` both clean after the bump — **re-run `npm audit` periodically**, this class of finding reappears as new CVEs are published.
- **Medium — unescaped/uncapped values in email subject lines.** `app/api/contact/route.ts` and `app/api/academy/enroll/route.ts` both HTML-escape user input in the email *body* but were building the `subject:` field from raw, unescaped, unbounded-length `name`/`country`/`trackName` values. Added a `sanitizeForSubject()` helper (strips control characters/line breaks, caps at 100 chars) to both files and applied it to both subject lines.
- **Low (defense-in-depth) — a few routes relied entirely on RLS with no application-level ownership check before a write:**
  - `app/api/review-status/route.ts` and `app/api/review-markers/route.ts` (POST) — upserted/inserted rows keyed on a client-supplied `videoId` with no check that the video belongs to the caller. RLS on `video_reviews`/`review_markers` already blocks any actual cross-tenant data exposure, but there was no code-level backstop. Added an explicit `videos` ownership lookup (404 if not found/not owned) before each write.
  - `app/api/children/route.ts` (POST `enrollment_id`), `app/api/goals/route.ts` (POST `child_id`), `app/api/milestones/route.ts` (POST `child_id`), `app/api/success-stories/route.ts` (POST `child_id`), `app/api/payments/route.ts` (POST `enrollment_id`), `app/api/testimonial-requests/route.ts` (POST `enrollment_id`), `app/api/consultations/route.ts` (POST `lead_id`), `app/api/enrollments/route.ts` (POST `lead_id`) — none verified the referenced parent record actually belonged to the caller before inserting a child row pointing at it. Not exploitable for data leakage today (RLS already scopes every read by `user_id`), but a client could reference another user's UUID and create an orphaned cross-tenant foreign-key reference with no application error, and the gap would become a real IDOR the moment any code path reads these tables via a service-role client instead of the RLS-bound one. Added an ownership lookup (404 if not found) before insert in all 8 routes.
- **Confirmed correct, no changes needed:** every other previously-unverified route (`leads`, `children/[id]`, `consultations/[id]`, `enrollments/[id]`, `outcomes`, `program-stats`, `program-report`, `program-knowledge`, `connections`, `youtube-sync`, `health-check`, `backup`, `recovery`, `batch-repair`, `push-subscribe`) — auth + ownership scoping verified by reading the full file, not just spot-checked. Also confirmed: the earlier middleware auto-login-as-owner fix is still in place with no new exempted routes; no cookie anywhere uses `sameSite: "none"`; no `fetch()` call in any API route builds its target host from user input (no SSRF vector).

---

### 2026-09-04 — Notification email recipient changed to ymo441993@gmail.com

- Status: complete. User confirmed `ymo441993@gmail.com` is their actual Resend account's verified/owner email (required — Resend's shared `onboarding@resend.dev` sandbox domain only delivers to that one address, any other recipient gets silently rejected).
- Changed `to:` in both notification email senders: `app/api/academy/enroll/route.ts` (registration notification) and `app/api/contact/route.ts` (contact form inquiry notification). Previously both sent to `yusufabdi2007@gmail.com`.
- **Action needed:** the old address had a Gmail forwarding rule to `rhussein612@gmail.com` (Rahma's inbox) — that rule is tied to the old address and does not carry over. If Rahma should still receive a copy of these notifications, set up the equivalent forward on `ymo441993@gmail.com`.

---

### 2026-09-04 — Mandatory country code + residence country on every phone/WhatsApp field

- Status: complete. User asked that anywhere someone registers or gives a WhatsApp number, they must also pick their country dial code and the country they're currently living in — no more free-typed phone numbers with no country attached.
- **New — `lib/dial-codes.ts`:** a `{ name, dial }[]` dataset (195 countries, aligned with `lib/countries.ts`'s name list) plus `splitPhone()`, which parses a stored phone string like `"+252 61 234 5678"` back into dial code + local number (longest-prefix match first, so `+1876` Jamaica doesn't get misread as generic `+1`).
- **New — `components/ui/phone-input.tsx`:** shared `<PhoneInput>` — a dial-code `<select>` (defaults to +252 Somalia) next to a digits-only number field, combined into one string on change (`"+252 61 234 5678"`). Used everywhere a phone/WhatsApp number is collected, replacing the old free-text `<Input type="tel">`.
- **New — `supabase/migrations/032_add_country_columns.sql`:** adds a `country` column to `academy_students`, `booking_requests`, and `crm_clients` — the three tables that collected a phone number but never tracked residence country. (`leads` and `whatsapp_sessions` already had one.) **Needs to be run in Supabase SQL Editor.**
- **Forms updated** (phone field → `PhoneInput`, plus a residence "Country" field added wherever one didn't already exist):
  - `app/academy/page.tsx` (public enrollment) — added both; `/api/academy/enroll` now requires and stores `country`, includes it in the admin notification email and the roster row in `AcademyAdminClient.tsx`.
  - `components/contact/ContactForm.tsx` — already had a country field; swapped phone to `PhoneInput`.
  - `app/book/page.tsx` (public booking) — added both, both now required; `/api/book` requires and stores `country`. `components/packages/PackagesClient.tsx`'s internal "Log Booking Inquiry" dialog (the coach's own manual-entry form) got the same treatment plus displays country next to phone in the booking list.
  - `components/leads/LeadPipelineClient.tsx` and `components/leads/LeadDetailClient.tsx` — already had a country field (since migration 023); swapped phone to `PhoneInput`.
  - `components/crm/CrmClient.tsx` — added both (previously had neither).
- **Not changed:** the WhatsApp bot's own conversation flow (`app/api/whatsapp/route.ts`) already asks the country as a free-text chat message matched against `lib/countries.ts` (`matchCountry`) — that's a chat exchange, not a form, and the phone number itself is already known from the WhatsApp sender ID, so `PhoneInput` doesn't apply there.
- `npx tsc --noEmit --incremental false` and `npm run build` both clean; dev server restarted and `/academy`, `/book`, `/contact` all confirmed 200.
- **Still needed:** run `032_add_country_columns.sql` in Supabase SQL Editor before these forms are used in production, otherwise the `country` insert will fail against the live DB.

---

### 2026-09-04 — Full-app security audit + hardening pass

- Status: complete. User asked for a comprehensive security review of the whole app and backend. Ran four parallel read-only audits (core API routes, Academy auth, WhatsApp bot + public endpoints, infrastructure/RLS/secrets), then fixed every confirmed finding. `npx tsc --noEmit --incremental false` and `npm run build` both clean after all fixes.
- **CRITICAL — fixed first, before the other audits even finished:** `lib/supabase/middleware.ts` had an "auto-login-as-owner" block — any anonymous visitor hitting a non-public route with no session cookie was silently signed in as the app owner via a server-minted magic-link token (using the service-role key), no password or prompt involved. On a live production app (`guri-dagan.vercel.app`) with real client PII, payments, and academy student records, this meant **anyone who found the URL had full read/write access to everything**, completely defeating every RLS policy in the schema. Removed the block entirely (`lib/supabase/middleware.ts`) — unauthenticated visitors now correctly redirect to `/login`, which already has a working Sign Up/Sign In flow.
- **HIGH — `program_knowledge` table was publicly readable.** Migration 021 had a `USING (true)` SELECT policy meant to let an unauthenticated edge route read curriculum text, but every actual consumer (`/api/program-knowledge`, `/api/recovery`, `/api/health-check`) already authenticates via `supabase.auth.getUser()`. Dropped the policy in a new migration (`031_fix_program_knowledge_rls.sql`) — **needs to be run in Supabase SQL Editor**.
- **HIGH — WhatsApp webhook accepted forged requests.** `app/api/whatsapp/route.ts` POST trusted any JSON body with no verification it came from Meta. Added `X-Hub-Signature-256` HMAC verification against `WHATSAPP_APP_SECRET` (new env var — Meta App → Settings → Basic → App Secret); unsigned/invalid requests are dropped (still return 200 so Meta doesn't retry-storm, but nothing is processed).
- **HIGH — every AI-cost route was unauthenticated.** `/api/generate`, `/api/coach`, `/api/strategist`, `/api/repurpose`, `/api/shorts`, `/api/trends`, `/api/score-hook`, `/api/pipeline`, `/api/voice-idea`, `/api/transcribe`, `/api/weekly-report`, `/api/momentum`, `/api/inbox-convert`, `/api/weekly-assignment`, `/api/batch-plan` only had per-IP in-memory rate limiting (trivially bypassed by rotating IPs) protecting calls that cost real OpenAI/Groq money. Added `supabase.auth.getUser()` + 401 checks to all 15 — they were only ever meant to be called from the logged-in dashboard anyway.
- **HIGH — Academy: suspending/cancelling a student didn't revoke their session.** A student moved to `cancelled` or `pending_payment` kept full access on their existing 90-day cookie. `app/api/academy/admin/students/[id]/route.ts` now deletes the student's `academy_sessions` rows when status changes to `cancelled` or `pending_payment` (left alone for `completed`, so finished students can still review material).
- **MEDIUM — two cron routes failed open.** `/api/push-send` and `/api/whatsapp/send-pending` both had `if (secret && auth !== ...)` — if `CRON_SECRET` was never set, the check was skipped entirely and the route was open to anyone. Both now fail closed (`if (!secret || auth !== ...)`). **Means `CRON_SECRET` must be set in Vercel for these to work at all** — added to `lib/env.ts`'s tracked vars so its absence surfaces at startup.
- **MEDIUM — `/api/contact` had zero rate limiting** and, along with `/api/academy/enroll`'s notification email, interpolated raw client input (`name`, `country`, `phone`, `message`) directly into HTML sent via Resend with no escaping — an attacker could inject arbitrary HTML/links into the notification email the coach reads. Added `rateLimit()` (10/hr/IP) to `/api/contact` and an `escapeHtml()` helper to both routes' email templates; the `tel:` link in `/api/contact`'s email now also strips non-digit/plus characters before building the href.
- **MEDIUM — Academy student passwords used `Math.random()`**, not a CSPRNG — its internal state is recoverable from observed outputs, making future passwords predictable. `lib/academy-auth.ts` now uses `crypto.randomInt()` for both password and username digit generation (`generateSessionToken` already correctly used `crypto.randomBytes`).
- **MEDIUM — Academy login rate limiting trusted a client-controlled header.** `lib/rate-limit.ts` took the *first* entry of `X-Forwarded-For`, which a client can freely set — Vercel appends the true client IP as the *last* entry rather than stripping a client-supplied one. Now prefers `x-real-ip` (set by Vercel's proxy, not spoofable) and falls back to the *last* XFF entry.
- **MEDIUM — Academy login leaked username existence via timing.** A nonexistent username returned instantly; a wrong password ran a real `scrypt` derivation (~tens of ms) before responding — the gap is enough to enumerate valid usernames by timing the endpoint. `lib/academy-auth.ts` adds `verifyDummyPassword()` (runs the same scrypt cost against a fixed dummy hash) and the login route now calls it on the "no such user" path so both cases take the same time.
- **MEDIUM — no CSP or HSTS headers.** Added both to `next.config.ts` (`Strict-Transport-Security`, plus a `Content-Security-Policy` that still allows `'unsafe-inline'`/`'unsafe-eval'` since there's no nonce infrastructure — Next hydration and framer-motion/recharts need it without one; still meaningfully restricts `object-src`, `frame-ancestors`, `connect-src` to self + Supabase).
- **LOW — `/api/checkins` POST didn't verify `child_id` belonged to the caller** before inserting a check-in row. Added an ownership lookup against `child_profiles` before the insert.
- **New env vars (add to Vercel + `.env.local`):** `WHATSAPP_APP_SECRET` (Meta App Secret, required for the WhatsApp bot's signature check to pass once activated), `CRON_SECRET` (already documented, but now strictly required — `/api/push-send` and `/api/whatsapp/send-pending` reject everything without it).
- **Still needed:** run `031_fix_program_knowledge_rls.sql` in Supabase SQL Editor; set `WHATSAPP_APP_SECRET` and `CRON_SECRET` in Vercel before the WhatsApp bot or push notifications are activated (both already had setup steps pending per their sections below — this adds one more each). Lower-priority items not fixed this pass (flagged but out of scope for this session): several routes return raw Supabase error text on 500s (internal schema detail leakage, not secrets); Academy's chapter upload route trusts client-declared MIME type for its allow-list check (mitigated by also forcing that same type as the stored `Content-Type`, so not independently exploitable).

---

### 2026-08-30 — Academy: fixed stale-cache service worker bug, added registration email notifications
- Status: complete.
- **Bug found and fixed — `public/sw.js`:** user reported `/academy` rendering with washed-out, barely-visible gray text instead of the designed purple/black theme. A fresh headless-browser screenshot of the live page showed it rendering perfectly (full contrast, correct colors, the $40/month pricing) — so the code itself was fine. Root cause: the service worker cached JS/CSS **cache-first, forever**, keyed only by URL. Next.js dev-mode CSS chunk filenames aren't uniquely hashed per change the way a production build's are, so once a browser cached that CSS file once, any later edit to it could get stuck being served forever with no way to self-heal short of a manual `CACHE_NAME` bump + hard refresh. Fixed by switching static-asset caching from cache-first to **stale-while-revalidate** (serves the cached copy instantly, but always also fetches a fresh copy in the background and updates the cache, so the *next* load picks up whatever changed) and bumped `CACHE_NAME` to `guri-dagan-v3` so existing stale caches get dropped. The small "N" circle some screenshots showed floating on `/academy` is unrelated — that's Next.js's own dev-mode toolbar button, not part of the app; it doesn't exist in production.
- **New feature — admin gets emailed the moment a student registers.** Previously a registration on `/academy` was a completely silent DB insert; the coach had no way to know short of manually checking the Roster tab. `app/api/academy/enroll/route.ts` now sends a notification email (name, WhatsApp number, track, a direct "Message on WhatsApp" link) via the same Resend REST pattern already used by `/api/contact` — same `to: yusufabdi2007@gmail.com` constraint (Resend's shared sandbox domain only delivers to the account owner's address; already forwards to `rhussein612@gmail.com` via existing Gmail rule), same fire-and-forget-must-not-fail-the-request philosophy.
- **Two real bugs caught while verifying the notification feature, not assumed fixed:**
  1. `RESEND_API_KEY` was never present in local `.env.local` at all — it only existed in Vercel's production env vars. The code's `if (!apiKey) return;` guard meant every local test silently no-opped with no error, which briefly looked like "it worked" (no error logged) when really nothing was ever attempted. Pulled the real key from Vercel (`vercel env pull`, already-authenticated CLI) and added it to `.env.local` so this is actually testable locally going forward.
  2. Even with the real key, the send was fire-and-forget (`notifyAdminOfEnrollment(...)` called without `await` before returning the response) — fine on a long-running local dev process, but on Vercel's actual serverless functions the function can be torn down the instant the response is sent, killing in-flight background work. This is the exact same failure class already documented below for the WhatsApp bot's delayed replies. Fixed by making `notifyAdminOfEnrollment` properly `async` and `await`ing it before the route returns — confirmed via server logs that the Resend "accepted" log line now always completes before the `POST .../enroll 201` line, not racing it.
- Validated: a direct Node script send with the real pulled key got a clean `200` from Resend with a real message id. Re-ran a real enrollment through the actual endpoint post-fix — notification log line (`Notification email accepted by Resend, id: ...`) reliably appears before the response completes. Separately load-tested the public enroll endpoint with 20 different simulated registrations (distinct `x-forwarded-for` per request, same technique as the earlier 100-login load test, so the per-visitor rate limit didn't interfere) — 20/20 succeeded, zero errors, correctly landed in the roster as "Unpaid" across all 5 tracks. All debug/test student rows created during this session were deleted afterward; the 20 real load-test registrations were intentionally left in the roster (same reasoning as the 100 demo students below — business owner asked to see it working) and are tagged `TEST20` in the name for easy cleanup. `npx tsc --noEmit --incremental false` clean throughout.
- Still needed: same as below — none of this is deployed yet. `RESEND_API_KEY` is now in local `.env.local` but was already present in Vercel production, so no Vercel env change is needed before deploying, just pushing the code.

---

### 2026-08-27 — Academy: fixed two production-breaking bugs (slow/unopenable lessons)
- Status: complete. Diagnosed from the user report "site is slow as fuck, I can't even open something" while trying to open lessons in the Academy.
- **Bug 1 (performance + security) — `lib/supabase/middleware.ts`:** the public-route allowlist (`isPublicRoute`) only included `/book`, `/contact`, `/status`, `/offline` — it did not include `/academy`. Every request to `/academy`, `/academy/login`, `/academy/course` therefore fell into the "silently establish the owner's session via magic link" block, which made **two sequential network calls to Supabase's Auth API** (`admin.generateLink` + `verifyOtp`) before the page could render — on every page load, for every visitor. It also set the coach's own authenticated Supabase session cookie in the student's browser, which is a real security bug (a student's browser could carry cookies that authenticate them into the coach's private dashboard on the same domain). Fixed by adding explicit checks for `/academy` (exact), `/academy/login`, and `/academy/course` to `isPublicRoute` — deliberately NOT a blanket `startsWith("/academy")`, because `/academy/admin` (the coach's control panel, route-grouped under `(dashboard)`) must keep requiring real auth.
- **Bug 2 (correctness) — student login was completely broken.** Migrations `027_academy_username_unique.sql`, `028_academy_backend_hardening.sql`, and `030_academy_storage.sql` had never been applied to the live Supabase project — only `026` had, plus someone had manually run just the two `ALTER TABLE` lines from `029` at some point (confirmed by inspecting live columns directly with a service-role script, since PostgREST doesn't expose a migration history through the JS client). Missing `failed_login_attempts`/`locked_until` columns on `academy_students` meant **every login query in `/api/academy/login` threw a Postgres error that was masked as the generic "Incorrect username or password"** — no student could ever log in, regardless of correct credentials. Also missing: the `academy_payments` table (mark-paid/renewal actions were silently failing to log payment history) and the `academy-materials` storage bucket (chapter file uploads would have failed). Fixed by combining the pending parts of 027+028+030 into one idempotent script and having the user run it directly in the Supabase SQL Editor (no DB password or CLI session was available in the assistant's environment to run it directly — Supabase's REST API only allows table CRUD, not raw DDL, from a service-role key alone).
- **Minor optimization — `app/api/academy/me/route.ts`:** the two independent Supabase queries (chapters, exam results) were awaited sequentially; changed to `Promise.all`.
- Validated: created and deleted disposable test students directly against the live Supabase project (via `SUPABASE_SERVICE_ROLE_KEY`, cleaned up after) to confirm the full login → `/api/academy/me` → `/academy/course` flow works end-to-end with real credentials post-fix. `npx tsc --noEmit --incremental false` clean.
- Still needed: chapter content — only 1 chapter exists across all tracks in the live DB right now, so most "Open lesson" clicks will show an empty week until chapters are added via the admin panel (`/academy/admin`) or `POST /api/academy/admin/chapters`. This is a content gap, not a bug.

---

### 2026-08-28 — Academy: fixed password-reset bug, added chapter upload UI + exam question builder UI
- Status: complete. Continuation of the 2026-08-27 Academy fix session — user reported credentials/progress changing unexpectedly on repeat admin actions, plus two backend endpoints (chapter upload, exam questions) that had no UI to drive them.
- **Bug fix — `components/academy/AcademyAdminClient.tsx`:** for an already-paying student, the roster showed a "Resend Login" button that called the `mark_paid` action. `mark_paid`'s server-side branch unconditionally regenerates the password **and** resets `current_week` back down to the first `weeks_per_payment` block (e.g. week 4), even for a student who'd already progressed further. So clicking what looked like a harmless "resend their info" button silently issued a brand-new password and rewound their unlocked weeks. Fixed by pointing that button at the existing (previously unused by the UI) `reissue_credentials` action instead — which only regenerates the password, leaving `current_week`/`status` untouched — and renamed it "Reset Password" with a confirm() prompt, since it does invalidate the old password. The normal renewal flow ("Record Next Payment" → `record_payment` action) was already correct: same username and password every time, only the next block of weeks unlocks. Verified via direct API calls with a disposable test student.
- **Gap fix — price display on `/academy`:** `track.price_amount`/`price_currency` were fetched but never rendered anywhere on the public enrollment page — a parent couldn't see it costs $40/month until after registering. Added to both the track-picker cards and the enrollment form header.
- **Gap fix — chapter file upload UI:** `POST /api/academy/admin/chapters/upload` (Storage bucket `academy-materials`, 20MB cap, PDF/Word/image) existed since the 2026-08-27 backend work but had no UI. Added an "Upload" button next to the material URL field in the chapter dialog — uploads via `FormData`, drops the returned public URL into `file_url`. Verified end-to-end with a real file upload + public-read fetch + cleanup.
- **Gap fix — exam question builder UI:** `/api/academy/admin/exam-questions` (+ `[id]`) existed since 2026-08-27 with full CRUD but no UI — the only way to add the multiple-choice questions that power the student "end-of-week check-in" was raw API calls. Added a "Questions" icon button per chapter row in `AcademyAdminClient.tsx` opening a dialog: lists existing questions (correct answer marked), inline add/edit form with 2–6 dynamic answer options and a radio to mark the correct one, delete per question. Reuses the same rate-limited, ownership-checked API routes already in place.
- Validated end-to-end with fully disposable test data (created and deleted directly against the live Supabase project via service-role scripts, never left in the DB): admin creates a track → chapter → exam question → enrolls a student via the public `/api/academy/enroll` → marks them paid (credentials issued) → student logs in → `/api/academy/me` shows the unlocked chapter → fetches the exam (correct answer withheld) → submits and gets scored correctly → result persists on next `/me` call. `npx tsc --noEmit --incremental false` clean throughout.
- Still needed: none of this reduces the "only 1 real chapter exists" content gap noted above — the Questions/Upload UI just makes filling that content in easier than raw `curl`.

---

### 2026-08-30 — Academy: 100-concurrent-user load test + fixed real event-loop-blocking bug
- Status: complete. User asked to seed fake demo content and 100 fake students, then simulate 100 real people using the Academy at the same time, and fix anything that broke.
- **Demo data added (intentionally left in the live DB for visual review — not cleaned up):** 12 weeks of lesson content + 1 exam question per chapter across all 5 real tracks (60 chapters total, body text prefixed `[DEMO CONTENT]` so it's easy to find), plus 100 demo students (`username: demo0`–`demo99`, `name` suffixed `DEMO<n>`, `phone` starting `+1555777`) spread across all 5 tracks and 3 progress stages (week 4/8/12, matching the real monthly-unlock model). All created via one-off scripts run directly against Supabase with the service-role key — never touched the 2 real pre-existing students, verified before and after. **These need to be deleted before real students are onboarded** — they're realistic-looking, not sandboxed in any way the UI would flag as fake.
- **Real bug found and fixed — `lib/academy-auth.ts`:** `hashPassword`/`verifyPassword` used `crypto.scryptSync`, which runs synchronously on Node's single main thread. First load test (100 simulated students logging in at the exact same moment, each with a distinct spoofed IP via `x-forwarded-for` so the per-IP rate limiter didn't interfere — same as 100 real users would each have a different IP) took **47 seconds wall-clock**, with every single login taking ~21-23 seconds regardless of when it started — the textbook signature of full serialization: the whole Node process queues behind one blocking operation, meaning **any other request to the app** (an already-logged-in student's course page, the coach's admin dashboard, the public tracks page) would also freeze during a login pile-up. Fixed by switching both functions to the async `crypto.scrypt` (via `util.promisify`), which moves the CPU-bound hashing onto libuv's thread pool instead of the main event loop. Updated the two call sites (`app/api/academy/login/route.ts`, `app/api/academy/admin/students/[id]/route.ts`) to `await` them (both functions are now `Promise`-returning).
- **Verified the fix with two follow-up tests:** (1) re-ran the identical 100-concurrent-login test — total time dropped to ~19-27s (run-to-run variance from this being a shared/constrained sandbox VM, not a clean signal either way) with genuine spread in per-login latency (3.9s–14s) instead of everyone converging on the same ~22s, confirming real parallelism instead of a single queue. (2) The test that actually matters: polled the **unrelated** `/api/academy/tracks` endpoint every 300ms for 30s while the 100-login flood ran concurrently — it kept responding the entire time (100% success, no hangs), just slower during the peak (avg 3.6s, some spikes to 9s) — proving the fix's real value isn't raw login speed, it's that a login stampede no longer takes the whole app down with it.
- Tried tuning `UV_THREADPOOL_SIZE` (default 4) up to 32 and down to 12 (this machine's logical core count) — neither gave a clean, reproducible improvement over the default in this environment, so left it untouched. Not worth chasing further: this specific test (100 truly-simultaneous logins on one shared local dev process) is a harsher scenario than real usage will ever produce — Vercel production runs serverless function invocations rather than one shared Node process, and no small parenting-course business will see literally 100 people click "log in" in the same second.
- Full functional correctness held throughout every load-test run: 100/100 logins succeeded, 100/100 exam fetches/submissions succeeded, zero 500s, zero crashes, zero data corruption. This was purely a performance/contention finding, not a correctness one.
- `npx tsc --noEmit --incremental false` clean throughout.
- Still needed: delete the 100 demo students + 60 demo chapters/questions before real onboarding (see markers above — `DEMO` in student names/usernames, `[DEMO CONTENT]` in chapter bodies). Ask before deleting since the business owner asked for these to stay visible for review.

---

### 2026-08-27 — Academy backend: schema, API, monthly-unlock model, security hardening
- Status: complete. This is the backend Codex's frontend redesign (below) builds against.
- Changed: `supabase/migrations/026_academy_schema.sql` through `030_academy_storage.sql` (5 migrations — run in order, none yet applied to production), all routes under `app/api/academy/**`, `lib/academy-auth.ts`.
- What it covers:
  - Core schema: `academy_tracks`, `academy_chapters`, `academy_students`, `academy_exam_questions`, `academy_exam_results`, `academy_sessions`, `academy_payments`. RLS on every owner-scoped table.
  - Student auth is deliberately NOT Supabase auth — students log in with a username (first name + 3 random digits, e.g. `yusuf482`) and an 8-character password (unambiguous alphabet, no 0/O/1/l/I), issued only after the coach marks them paid (never at signup). Session = `academy_sessions` cookie, 90-day expiry. Per-account lockout after 5 failed logins (15 min), on top of the existing IP rate limit.
  - Unlock model is monthly, not weekly: first payment (`mark_paid`) unlocks the first `weeks_per_payment` block (default 4) all at once; every payment after that (`record_payment`) unlocks the next block. There is no per-week manual "advance" step — that was an earlier wrong design, corrected in `029_academy_monthly_unlock.sql`. `renewal_due_at` is computed server-side (`last_payment_at + weeks_per_payment`) so the roster can show when the next payment is expected.
  - `academy_payments` logs every mark-paid/record-payment event with the track's price at that moment — there was previously no payment history at all.
  - Track deletion is blocked (409) if the track has any enrolled students, to stop the FK cascade from silently deleting paid students' records.
  - Two admin endpoints exist but have **no UI wired to them yet**: `POST/GET /api/academy/admin/exam-questions` (+ `[id]` for PATCH/DELETE) for building multiple-choice exams per chapter, and `POST /api/academy/admin/chapters/upload` (Supabase Storage, bucket `academy-materials`, 20MB cap, PDF/Word/image only) so chapter material can be a real upload instead of a pasted URL.
- Validated: `npx tsc --noEmit` clean after every change. Seed/query scripts run directly against the live Supabase project (via `SUPABASE_SERVICE_ROLE_KEY`) confirmed track creation, student enrollment, and mark-paid all round-trip correctly.
- Still needed: run migrations `026`–`030` in Supabase SQL Editor, in order (none are applied yet — dev testing so far has been against a live but unmigrated-in-prod database, confirm before deploying). Codex (or whoever owns Academy frontend next) still needs to build UI for the two unwired endpoints above.

---

### 2026-08-27 — Academy frontend redesign
- Status: partial - public enrolment, student login/course experience, and the coach's Academy control panel have been visually redesigned by Codex. Academy API routes and `lib/academy-auth.ts` were not changed.
- Changed: `app/academy/page.tsx`, `app/academy/login/page.tsx`, `app/academy/course/page.tsx`, and `components/academy/AcademyAdminClient.tsx`. The public flow now presents age-track selection, mobile-money expectations, and registration clearly; the student view is a weekly learning journey; the admin view prioritises tracks, chapters, payments, and roster context.
- Validated: `npx tsc --noEmit --incremental false` passed. A second `npm run build` could not run because another Next build process already held the build lock; do not terminate it without checking who owns it.
- Still needed: visual review in the running app with real Academy data, then feedback from the business owner. Storage upload remains a backend/API change for Claude Code if drag-and-drop materials are required.

---

## Current State

**Build status:** Production build passes clean (`npm run build`). ~93 routes. Deployed live at **https://guri-dagan.vercel.app** (Vercel CLI — GitHub auto-deploy is disconnected, deploy manually with `vercel --prod`).
**Runtime status:** `npm run dev` works at `http://localhost:3010`. `.env.local` has Supabase + OpenAI keys.
**Phase:** Phase 17.1 complete (latest). All phases 1–17 complete. See phase log below.
**Recent fixes (June 2026):** Dark mode now defaults on fresh install (ThemeProvider reads localStorage, falls back to dark). DnD fully removed from Calendar + Queue + Leads — React 19 incompatible. Real error messages surfaced on leads save/move/add failures.
**Recent additions (July 2026):** Public contact form `/contact` + email delivery via Resend. See full change log below.
**Recent change (July 2026):** Removed all AI-written video scripts from the weekly content system — `/weekly-assignment` and `/batch/plan` now generate a fresh TITLE only per video slot (no hook/problem/reframe/teaching/close/cta). The presenter already knows the on-camera format; she no longer gets a new script to read every week, just a new topic. Stress-tested for 100 simulated consecutive weeks (both the pure-fallback path and an adversarial AI-output path) with zero duplicate-title or scheduling bugs. See "Titles-Only System" section below.
**Recent addition (August 2026):** WhatsApp intake bot at `/api/whatsapp` — see "WhatsApp Bot" section below. Code is done; **not yet activated** — needs a Meta WhatsApp Business API connection set up by the business owner (see that section for exact steps).
**Business context (June 2026, pricing updated August 2026):** ~~US/UK/Europe: $100/month (1-on-1, 2x/week). Africa/Somalia/Kenya: $25/month (group 5–10 families, 2x/month). All 5 programs same price.~~ **Superseded** — see "WhatsApp Bot (v2)" below for current pricing: Africa $25/mo parent · $50/mo child; outside Africa $100/mo either track. WhatsApp: +1 (763) 412-7695.
**Deployment plan:** Vercel production. Developer uses laptop locally. End user (mum) installs as PWA on her phone via https://guri-dagan.vercel.app

---

## August 2026 — WhatsApp Bot (v2 — Gemini-driven, supersedes the v1 button-only design)

### History — read this before changing anything
This feature went through two designs in the same week. **v1** (button-menu only, $0, no AI) was built first, explicitly chosen over an AI-conversation bot for cost reasons. The business owner then rejected v1 as "too robotic" and, after describing exactly how her real WhatsApp conversations go, asked for a redesign. **v2** (below) is what's actually in the code now. Don't revert to pure buttons without being asked — that was already tried and explicitly rejected.

### What it does (v2)
1. **First message in** (any free text) → the bot calls **Gemini** (`lib/gemini.ts`, needs `GEMINI_API_KEY`) with a Somali-language system prompt asking for a short, natural, everyday-tone reply with one real piece of advice relevant to what they said — not a canned response. Gemini was chosen specifically over the OpenAI/Groq models already used elsewhere in this app because its Somali output reads more like normal conversation, less like a translated document.
2. That advice reply is **not sent immediately** — it's queued in `whatsapp_pending_replies` with a random 60-120s delay, so it doesn't feel instantly AI-generated. See "The delay mechanism" below for why this needed its own infrastructure.
3. Once sent, the advice message also carries **2 buttons**: "I want coaching" (parent track) or "My child needs it" (child track). No third "both" option in v2 — simplified to exactly these two.
4. **Child track only:** asks the child's age. Under **8** (`MIN_CHILD_AGE` in `lib/pricing.ts`) → explains the program isn't suited yet and stops (no lead created, no price shown). 8+ → continues.
5. **Asks country** (free text, matched against `lib/countries.ts`). This answer is **final** — the state machine only reads it once, in the `awaiting_country` step, and immediately advances past it; there is no "go back and change your country" path anywhere in the flow. This was an explicit requirement — don't add a way to revise it later without being asked.
6. **Quotes the price** via `lib/pricing.ts`'s `getPrice(country, track)`: Africa = **$25/mo parent, $50/mo child**; outside Africa = **$100/mo for either track**. (This replaced the old flat $25/$100-regardless-of-track pricing from v1 — see Current State pricing note above, which is now stale and superseded by this.)
7. Explains what happens next in plain terms — parent track: Coach Rahma assesses the situation/habits first (gym-coach analogy the business owner used), then builds a plan. Child track: a structured, set program.
8. Gives **payment instructions** — a Somali money-transfer number (EVC Plus/Zaad/etc.), not a card, via `PAYMENT_INFO_TEXT` env var. No Calendly/booking-call step in v2 (v1 had one; superseded — `CALENDLY_EVENT_URL` env var is left in `.env.local.example` unused in case it's wanted back later).
9. Creates a lead in the existing `leads` table (source `whatsapp`, country, track, child age if applicable) — same as v1, still no separate dashboard needed, `/leads` already is one.
10. Session marked `done`. Further messages aren't auto-replied to — logged as `lead_activity` notes so a human (Coach Rahma, from the same WhatsApp number) takes over, same handoff behavior as v1.

### The delay mechanism — why it needed its own table + external cron
A naive `setTimeout` inside the webhook handler won't survive a 60-120 second delay on Vercel serverless — function execution just ends. So the delayed advice message is written to **`whatsapp_pending_replies`** (`send_after` timestamp + the exact message payload as JSON) instead of sent directly, and a separate route, **`/api/whatsapp/send-pending`**, sends anything that's due and marks it sent.

That route needs to be *triggered* on a short interval (~every 1 minute). **Vercel's free/Hobby cron tier only runs once a day** — nowhere near frequent enough — so this can't use `vercel.json`'s existing cron setup (that's still fine for the daily `/api/push-send` job, just not this). Instead, **use a free external cron service** (e.g. cron-job.org, EasyCron's free tier, or a scheduled GitHub Action) to hit `https://guri-dagan.vercel.app/api/whatsapp/send-pending` every minute, with header `Authorization: Bearer <CRON_SECRET>` (set `CRON_SECRET` to any random string in env vars — optional but recommended, otherwise that route is unauthenticated).

### Files
- `app/api/whatsapp/route.ts` — the webhook (GET = Meta's verification handshake, POST = incoming messages, full state machine)
- `app/api/whatsapp/send-pending/route.ts` — sends due delayed messages; needs the external cron above
- `lib/gemini.ts` — minimal fetch-based Gemini client (no SDK dependency) for the advice reply
- `lib/pricing.ts` — track-based (parent/child) × region (Africa/not) pricing, plus `MIN_CHILD_AGE`
- `supabase/migrations/024_whatsapp_bot_schema.sql` then `025_whatsapp_bot_v2.sql` — run both, in order. 025 drops and recreates `whatsapp_sessions` with the new v2 shape (`track`, `child_age`, new step names) and adds `whatsapp_pending_replies`. Safe to run even if only 024 was applied so far.

### What's NOT done yet — needs the business owner
Same Meta setup as before, plus one new piece:
1. Meta Developer account + Meta App with WhatsApp product added (developers.facebook.com); WhatsApp Business Account + phone number; **permanent System User access token** (not the 24-hour temporary one) → `WHATSAPP_ACCESS_TOKEN`; Phone Number ID → `WHATSAPP_PHONE_NUMBER_ID`.
2. `WHATSAPP_VERIFY_TOKEN` — any random string, matching value in Meta's webhook config.
3. Webhook URL in Meta's dashboard: `https://guri-dagan.vercel.app/api/whatsapp`, subscribed to `messages`.
4. **New:** `GEMINI_API_KEY` — already present in this project's `.env.local` from earlier, just needs to carry over to Vercel's env vars for production.
5. **New:** set up the external cron (cron-job.org or similar, free) hitting `/api/whatsapp/send-pending` every minute, per "The delay mechanism" above. Without this step, advice replies get queued but **never actually sent** — this is easy to miss and will look like the bot is silently broken.
6. **New:** `PAYMENT_INFO_TEXT` — the actual EVC Plus/Zaad number, from the business owner.
7. Run both SQL migrations (024, then 025) in Supabase's SQL Editor.

### Deliberately not doing (from a WhatsApp-agent tutorial the business owner referenced)
A common agency pattern for this kind of bot is: brand-new Supabase project, brand-new GitHub repo, brand-new Vercel deploy, and a dedicated dashboard to view conversations. That pattern is for building a system from zero for a brand-new client. Guri Dagan already has all of that — the leads pipeline (`/leads`) already *is* the dashboard, this repo already *is* the deploy target. Don't spin up parallel infrastructure for this feature.

---

## July 2026 — Titles-Only Weekly System (no more scripts)

### Why
The mom (end user) was getting a brand-new AI-written script every week for months — new hooks, new phrasing, new talking points to memorize each time. She already knows her on-camera format/delivery; what she actually needs is a fresh topic, not a new script to learn. This was flagged as the top pain point after 6+ weeks of live use.

### What changed
- **`app/api/weekly-assignment/route.ts`** — no longer generates `hook/problem/reframe/teaching/close/cta` per video. Returns `{ theme, youtube: {program, title}, tiktoks: [{day, program, title}] }` only.
- **`app/api/batch-plan/route.ts`** — same simplification. Returns `{ youtube_title, youtube_program, tiktok_scripts: [{title, program, day}] }`.
- **`components/weekly-assignment/WeeklyAssignmentClient.tsx`** and **`components/batch/BatchPlanClient.tsx`** — removed all script-preview UI (expand/collapse hook-problem-reframe-teaching-close-cta sections). Cards now show title + program badge only.
- **`lib/seed-first-week.ts`** and **`app/api/batch-repair/route.ts`** — bootstrap/repair paths now write `angle_notes: "PROGRAM: X"` only, no script text.
- **`lib/programs.ts`** (`parseScriptNotes`) is untouched and still used by `BatchRecordClient`/`TodayClient`/`ChannelClient` to read `PROGRAM:` off `angle_notes` — those components already degrade gracefully when `hasScript` is `false` (they just show the title, no crash), so no changes were needed there.
- Both routes now accept a `recentTitles` array (last ~40 scheduled post titles, fetched server-side in `weekly-assignment/page.tsx` and `batch/plan/page.tsx`) and de-duplicate against it so no week echoes a recent title.
- Fallback title pools (used only when Groq/OpenAI are unreachable) were sized generously per program: MePower™ 26 titles (appears 3x/week), Inner Power™ 18 (2x/week), MindPower™/DreamPower™/Slaying Dragons™ 12 each (1x/week) — comfortably above the ~5-week recent-history window so pure-fallback operation still doesn't force early repeats.

### Bugs found and fixed during stress testing
Wrote two offline simulations (mirroring the real route logic exactly) and ran 100 straight simulated weeks:
1. **Pure-fallback path** (`buildFallback` / `pickTitle`) — caught a bug where, once the recent-title filter excluded every pool item, the code fell back to the *entire unfiltered pool* — which could reintroduce a title already used elsewhere in the *same* week. Fixed with a two-tier picker: never violate same-week uniqueness (hard rule); prefer titles outside the recent window, else pick whichever pool title was used longest ago (LRU) instead of a random unfiltered pick.
2. **AI-success dedupe path** (`dedupe()` closure in both routes) — caught a bug where `pickTitle(program, seenTitles)` was called with only 2 args, conflating "recent history to avoid" and "already used this week" into a single set passed as the wrong parameter. Once that combined set grew large enough, the same unfiltered-pool bug above resurfaced. Fixed by splitting into `seenTitles` (soft avoid-recent, passed as 3rd arg) and a fresh `usedThisRun` Set per request (hard same-week exclusion, passed as 2nd arg).
3. Removed a module-level mutable `Set` that would have been shared/corrupted across concurrent requests on the same edge isolate — state is now always passed explicitly per-request.

Both simulations were re-run 50+ times with randomized seeds (plus 10 fixed seeds for the adversarial AI-output fuzzer, which forces empty titles, exact duplicates, missing slots, and echoed history) after the fixes — 0 issues across all runs.

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
- Email goes to: `ymo441993@gmail.com` (Resend account owner — changed 2026-09-04, was `yusufabdi2007@gmail.com`; see constraint below)
- Previously forwarded automatically to `rhussein612@gmail.com` (Rahma's inbox) via a Gmail rule tied to the old address — **that forwarding rule needs to be recreated on `ymo441993@gmail.com` if Rahma should still receive a copy**, it will not carry over automatically.

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
│   ├── sw.js                         Service worker — network-only for page navigations (never caches SSR/auth routes), stale-while-revalidate for static assets (JS/CSS/fonts/images) as of 2026-08-30 (was cache-first, which could serve a stale build forever — see log)
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
| `CRON_SECRET` | Any random string — required for `/api/push-send` and `/api/whatsapp/send-pending` to accept requests (they reject everything without it as of the 2026-09-04 security pass) |
| `WHATSAPP_APP_SECRET` | Meta App → Settings → Basic → App Secret — required for the WhatsApp webhook to accept incoming messages (verifies `X-Hub-Signature-256`) |

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
