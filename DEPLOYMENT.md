# Hooyada Coaching OS — Deployment Checklist

Deploy to Vercel. Run through this list before and after every deployment.

---

## 1. Supabase — Database Migrations

Run these SQL files in order in **Supabase → SQL Editor**.
Apply any that haven't been run yet.

- [ ] `supabase/migrations/001_initial_schema.sql`
- [ ] `supabase/migrations/002_phase2_schema.sql`
- [ ] `supabase/migrations/003_phase3_schema.sql`
- [ ] `supabase/migrations/004_phase4_schema.sql`
- [ ] `supabase/migrations/005_phase5_schema.sql`
- [ ] `supabase/migrations/011_review_schema.sql`

**Verify RLS is enabled** on all tables:
Supabase → Table Editor → each table → RLS toggle = ON

---

## 2. Environment Variables — Vercel

In **Vercel → Project → Settings → Environment Variables**, add all of these.

### Required (app will not work without these)

| Variable | Where to find it |
|----------|-----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → anon public |
| `OPENAI_API_KEY` | platform.openai.com → API keys |

### Optional (features disabled if missing — app still loads)

| Variable | Feature | Where to find it |
|----------|---------|-----------------|
| `SUPABASE_SERVICE_ROLE_KEY` | Public /book endpoint | Supabase → Project Settings → API → service_role |
| `OWNER_USER_ID` | Public /book endpoint | Supabase → Auth → Users → your UUID |
| `NEXT_PUBLIC_APP_URL` | Push notifications, absolute URLs | Your Vercel deployment URL, e.g. `https://your-app.vercel.app` |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Web push notifications | Generate with `npx web-push generate-vapid-keys` |
| `VAPID_PRIVATE_KEY` | Web push notifications | Same command as above |
| `YOUTUBE_API_KEY` | YouTube channel sync | Google Cloud Console → YouTube Data API v3 |

**Important:** `YOUTUBE_API_KEY` must NOT have the `NEXT_PUBLIC_` prefix — it stays server-side only.

---

## 3. Deploy to Vercel

```bash
# Option A: Vercel CLI
npm i -g vercel
vercel --prod

# Option B: Git push (if repo is connected to Vercel)
git push origin main
```

Vercel will automatically build and deploy on push.

---

## 4. Post-Deploy Verification

Visit **`https://your-app.vercel.app/status`** immediately after deployment.

Check:
- [ ] Core Requirements: all green
- [ ] Supabase Live Connection: green
- [ ] Optional features: matches what you've configured

Then test the critical flows:
- [ ] Log in at `/login`
- [ ] Dashboard loads with stats
- [ ] "Mark Posted Today" works and shows success
- [ ] Generate content at `/generator` returns results
- [ ] Add a new idea at `/ideas`

---

## 5. PWA Install (Mobile)

To install on your phone:

1. Open the deployed URL in **Chrome** (Android) or **Safari** (iPhone)
2. Chrome: tap the three-dot menu → "Add to Home Screen"
3. Safari: tap the Share button → "Add to Home Screen"

The app will open in standalone mode (no browser bar) after install.

---

## 6. Before Each Future Deployment

- [ ] Run `npm run build` locally and confirm zero errors
- [ ] If you changed Supabase tables, write a new migration file and run it first
- [ ] Never rename or delete Supabase columns without a migration — this breaks live data
- [ ] Test on mobile after deploy — layout and PWA install

---

## 7. Rollback

If something breaks after a deploy:

1. Go to **Vercel → Deployments**
2. Find the last good deployment
3. Click the three-dot menu → **"Promote to Production"**

This restores the previous version instantly with zero downtime.

---

## 8. Local Development

```bash
# Install dependencies
npm install --legacy-peer-deps

# Start dev server (port 3010)
npm run dev

# Open
http://localhost:3010/dashboard
```

Environment: copy `.env.local.example` to `.env.local` and fill in all required values.
