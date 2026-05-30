# Hooyada Coaching OS — Setup Guide

## 1. Environment Variables

Copy `.env.local.example` to `.env.local` and fill in:

```bash
cp .env.local.example .env.local
```

```
NEXT_PUBLIC_SUPABASE_URL=        # from Supabase project settings
NEXT_PUBLIC_SUPABASE_ANON_KEY=   # from Supabase project settings
OPENAI_API_KEY=                  # from platform.openai.com
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

---

## 2. Supabase Setup

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Go to **SQL Editor** in your Supabase dashboard
3. Paste and run the entire contents of `supabase/migrations/001_initial_schema.sql`
4. Go to **Project Settings → API** and copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## 3. OpenAI Setup

1. Go to [platform.openai.com](https://platform.openai.com)
2. Create an API key
3. Paste it as `OPENAI_API_KEY` in `.env.local`

---

## 4. Run Locally

```bash
npm run dev
```

Open http://localhost:3010

---

## 5. Deploy to Vercel

1. Push this folder to a GitHub repository
2. Go to [vercel.com](https://vercel.com) → Import Project
3. Select your repo
4. Add all environment variables from `.env.local`
5. Deploy

---

## 6. Install as Mobile App (PWA)

**iPhone / Safari:**
1. Open the app in Safari
2. Tap the Share button
3. Tap "Add to Home Screen"
4. Tap "Add"

**Android / Chrome:**
1. Open the app in Chrome
2. Tap the 3 dots menu
3. Tap "Add to Home Screen" or "Install App"

---

## App Pages

| Page | URL | Description |
|------|-----|-------------|
| Dashboard | `/dashboard` | Stats, streak, quick actions |
| Ideas | `/ideas` | Content idea database |
| AI Generator | `/generator` | Generate content with AI |
| Calendar | `/calendar` | Weekly content planner |
| Streak | `/streak` | Daily checkmark + heat map |
| Videos | `/videos` | Video status tracker |
| Analytics | `/analytics` | Charts and progress |

---

## Features Built

- Supabase auth (sign up / sign in)
- Dashboard with streak, weekly stats, consistency score
- Content idea database (add, edit, delete, filter, search)
- AI content generator (TikTok hooks, YouTube titles, captions, scripts, CTAs, hashtags)
- Weekly content calendar with status tracking
- Daily streak system with heat map and milestones
- Video tracker with status pipeline
- Analytics with bar charts, pie charts, activity heatmap
- Dark mode toggle
- PWA installable on phones
- Mobile bottom navigation
- Responsive design (mobile-first)
- Row Level Security on all Supabase tables
