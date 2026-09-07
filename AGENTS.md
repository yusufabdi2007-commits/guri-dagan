# Guri Dagan OS — Agent Operating Guide

This is the canonical collaboration guide for Codex and Claude Code. `CLAUDE.md`
points here; keep the two files aligned if the workflow changes.

## Read first

Before proposing or editing work, read these in order:

1. `HANDOFF.md` — current product context, architecture, credentials/setup notes,
   and decisions that must not be reversed.
2. `IMPLEMENTATION_PLAN.md` — intended roadmap and reliability rules.
3. `git status --short` and the relevant existing code.

`IMPLEMENTATION_PLAN.md` is a historical roadmap (dated 2026-05-31), not a
complete statement of the current repository. Reconcile it with the code and
`HANDOFF.md` before treating an item as missing or complete.

## Product contract

Guri Dagan is a coaching-business operating system. Preserve the core journey:
content planning and publishing → leads → consultations/enrollments → child
outcomes. The app also contains a WhatsApp intake bot and Academy features.

- Do not replace the WhatsApp v2 conversational flow with a button-only bot
  unless the user explicitly asks. This was a rejected design.
- Keep the five programmes and their naming intact: MePower, Inner Power,
  MindPower, DreamPower, and Slaying Dragons.
- Never invent analytics, notification data, programme outcomes, or AI results.
  Empty data needs a useful empty state or a suppressed notification.

## Current delivery responsibility

The current priority is **The Academy** (structured, paid, cohort-style parenting
course — separate from the existing WhatsApp quick-coaching flow). Backend
(schema, API routes, auth, payment/unlock logic) is done and owned by Claude
Code. **Codex owns the frontend/design of the Academy** — the user was
explicitly dissatisfied with the current UI and wants it redesigned:

- `app/academy/page.tsx` (public track picker + registration)
- `app/academy/login/page.tsx` (student login)
- `app/academy/course/page.tsx` (student weekly dashboard)
- `app/(dashboard)/academy/admin/page.tsx` + `components/academy/AcademyAdminClient.tsx`
  (mom's admin panel: tracks, chapters, roster)

Build against the existing API contract in `app/api/academy/**` rather than
changing request/response shapes — if a design needs a shape the API doesn't
support, flag it back to Claude Code rather than editing `app/api/academy/**`
or `lib/academy-auth.ts` directly. Known gap already flagged: chapter material
is a pasted URL, not a real file upload — a Storage upload endpoint is Claude's
to add first if the design calls for drag-and-drop upload.

**Phase 18: Creator Accountability & Smart Notifications** is still on the
roadmap but is not current priority — do not start it unless the user
explicitly redirects you to it. If/when it resumes, own the complete vertical
slice:

1. Verify existing build and the relevant Supabase schema; do not assume the
   plan's migration numbering still applies. Migrations through `029` already
   exist (Academy schema + hardening), so notification migrations must start
   at `030`.
2. Build notification preferences, logs, live-data payload builders, delivery,
   missed-task recovery, CEO report, motivation copy, notification UI, and cron
   configuration in small reviewable changes.
3. Ensure Vercel cron routes authenticate with `CRON_SECRET`, are idempotent,
   and respect each user's timezone/preferences.
4. Verify with type/build checks and safe local tests. Deployment, Supabase
   migration application, Vercel configuration, and production cron triggering
   require the user's explicit authority or supplied access.
5. Update `HANDOFF.md` and the relevant plan status after meaningful delivery.

## Non-negotiable engineering rules

- API routes must use top-level error handling and return structured JSON; no
  uncaught 500s or exposed stack traces.
- All new user-owned Supabase tables require RLS, `auth.uid() = user_id`
  policies, and indexes for their access paths.
- SQL migrations must be safe to rerun (`IF NOT EXISTS` / equivalent guards).
- AI calls must time out within 45 seconds and return a useful fallback.
- Prefer suppression to irrelevant notifications. Log only genuine delivery
  attempts; do not fabricate activity.
- Preserve mobile and empty-data states. Do not let optional integrations make a
  page fail to render.
- Never expose, log, commit, or edit secrets in `.env.local`. Use
  `.env.local.example` for documenting required variables.

## Shared-worktree protocol

Codex and Claude Code use the same checkout. Assume any uncommitted file belongs
to the other agent or the user until confirmed otherwise.

- Begin by checking `git status --short`; mention unrelated dirty files in your
  handoff rather than changing, staging, reverting, or formatting them.
- Work only in files necessary for the requested scope. Avoid broad refactors.
- Before editing a file that is already modified, inspect its diff and preserve
  the existing intent. If ownership or intent is unclear, stop and ask.
- Never use `git reset --hard`, `git checkout --`, or a destructive clean.
- Do not commit, push, deploy, modify hosted configuration, or run database
  migrations unless explicitly asked.
- End work with: files changed, validation actually run and its result, known
  limitations, and the single clearest next action.

## Commands and validation

- Use `npm run build` for the production compile check. `npm run lint` is not a
  reliable default here because the project’s Next.js version no longer exposes
  `next lint`.
- Run the narrowest meaningful validation first, then build for cross-cutting
  changes. Do not report unrun checks as passing.
- For Supabase changes, inspect existing migrations and the consuming queries
  before writing a migration.

## Handoff format

Leave concise, factual handoffs in `HANDOFF.md` for completed or blocked work:

```md
### YYYY-MM-DD — [area]
- Status: complete / partial / blocked
- Changed: [files and behaviour]
- Validated: [commands and observed result]
- Still needed: [external setup, decision, or next implementation step]
```

Do not record secret values, tokens, private URLs, or personal data.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
