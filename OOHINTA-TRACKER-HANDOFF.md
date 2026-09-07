# HANDOFF — Oohinta (Crying) Tracker → Website

**Read this file first if you are picking up work on the "crying tracker" for Guri Dagan.**
This is a separate, small deliverable from the main Guri Dagan Coaching OS app (see `HANDOFF.md` for that). Don't merge the two write-ups — this one is scoped narrowly to the tracker described below.

---

## What this is

A printable log sheet, built for the business owner's mother ("Hooyo") to hand to the moms she coaches. It has one job: help a mom notice **patterns** in when her child cries, so the trigger can be reduced.

It is **not** a general parenting worksheet. It asks exactly three things, in Somali:

| Column | Somali | English | Purpose |
|---|---|---|---|
| Day | Maalinta | Day | Pre-filled: Sabti, Axad, Isniin, Talaado, Arbaco, Khamiis, Jimco (Sat–Fri order, matches the business's existing weekly schedule convention) |
| Time | Waqtiga | Time | Blank — mom fills in when the crying happened |
| Trigger | Ka Hor Oohinta | Before the crying | Blank — mom fills in what happened right before |

Nothing else. No duration, no "during," no "after/response," no notes field, no summary/analysis section. Those were all cut deliberately after iteration — the business owner was explicit: **she doesn't want a lot of detail, just day, time, and what happened before.** If you're tempted to add fields back in "to make it more useful," don't — that request was already made and reversed once in this project's history. Ask first.

"Oohin" is the correct Somali word for "cry" (the business owner corrected an earlier draft that used "ooyid," which was wrong). Use **oohin** in any future Somali copy for this feature.

---

## Current state (as of this handoff)

- **Source file:** `ooyid-timeline.html` (project root). Self-contained HTML — no external font/CDN calls, uses a system font stack (`-apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`) so it never depends on network access. The filename still says "ooyid" for historical reasons; the visible text does not.
- **Output:** rendered to PDF via a throwaway Playwright script (not checked into the repo — it was a one-off scratchpad script, not project infra). Portrait A4, one page. Copies were placed at:
  - `c:\Users\hp\OneDrive\Desktop\MOM\Diiwaanka-Ooyidda.pdf`
  - `c:\Users\hp\OneDrive\Desktop\Diiwaanka-Ooyidda.pdf` (Desktop copy, for the business owner to find easily)
- **Not part of the Next.js app.** It doesn't touch Supabase, doesn't have a route, isn't in `app/`. It's a static print artifact today.

### Brand system used (reuse this, don't invent a new one)

Pulled from the existing `marketing-flyer.html` in this repo, which is the established Guri Dagan brand:

- Primary gradient: `linear-gradient(135deg, #4a1a8a 0%, #6b2fa0 60%, #7c3bb5 100%)`
- Text purple: `#4a1a8a` / `#5b2da0`
- Light purple tints for zebra-striping / backgrounds: `#f5f0ff`, `#ece2fb`, `#faf8ff`
- Typeface: system font stack only (no Google Fonts import — the brand's other HTML docs do import Inter from Google Fonts, but this one intentionally doesn't, since it needs to render reliably offline/in a CSP-restricted preview)

---

## Business context (important — don't build this like a startup MVP)

This is **not** a new, unproven idea. The business owner said explicitly: *"the business has been doing it for a long time, and we have everything."* Guri Dagan is a running parenting-coaching business with:
- An existing brand identity (purple, Somali-first copy, established weekly-schedule format — see the reference schedule image this tracker was modeled after)
- An existing Next.js 15 + Supabase production app (`guri-dagan.vercel.app`) with child profiles, check-ins, goals, and outcome tracking already built (Phase 16 "Parent Success System" — see `HANDOFF.md`, tables `child_profiles`, `progress_checkins`, `child_goals`, `milestones`)
- Real, existing clients/moms already being coached

**Decided (do not re-litigate this without the business owner asking):** the business already has a separate public website, built by a family member (cousin) a while ago, paid for out of pocket (~$300). **Do not build a new website or a new public-facing app from scratch.** The plan is to work *with* the cousin and update the existing site — e.g. adding this tracker as a downloadable resource — not to replace it or duplicate it with something built in this repo.

This repo (`guri-dagan.vercel.app`, the Next.js/Supabase coaching OS) is a **separate, internal operations tool** for running the business day-to-day (leads, content, client tracking) — it is not the same thing as the public-facing marketing/business website the cousin built. Keep that distinction clear. If the tracker needs to live somewhere public, the target is the cousin's existing site, not a new build here.

**Still unknown — needs the business owner or cousin to provide:**
- URL and platform of the existing site (WordPress? Wix? Squarespace? custom code?) — this determines whether "updating it" means editing a page builder, or needs a developer with code access
- What specifically should be added/changed (e.g. "add this PDF as a downloadable resource," "add a page about the coaching programs," etc.)
- Who currently has admin/edit access to that site

---

## What NOT to do

- Don't add fields back (duration, after/response, summary analytics) without being asked — this was explicitly cut down twice already in this project's history.
- Don't invent new brand colors/fonts — reuse what's in `marketing-flyer.html`.
- Don't assume Google Fonts / external CDNs are safe to use — this project has hit CSP restrictions before (Artifact previews block external font loading); prefer system fonts or inlined `@font-face` data URIs if a custom face is ever needed.
- Don't overwrite the main `HANDOFF.md` with this content — keep this a separate file so the two efforts (the big coaching OS vs. this small tracker) don't get tangled in one write-up.
