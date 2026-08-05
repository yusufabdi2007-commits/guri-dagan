-- ============================================================
-- WHATSAPP BOT V2 — Gemini-driven advice, track-based pricing,
-- age gate, delayed replies.
-- Run this AFTER 024_whatsapp_bot_schema.sql (it replaces that
-- table's shape — safe to run even if 024 was already applied).
-- ============================================================

drop table if exists public.whatsapp_sessions;

create table public.whatsapp_sessions (
  phone_number text primary key,
  step text not null default 'greeting'
    check (step in ('greeting', 'awaiting_track', 'awaiting_age', 'awaiting_country', 'done', 'not_qualified')),
  track text check (track in ('parent', 'child')),
  child_age int,
  country text,
  lead_id uuid references public.leads(id) on delete set null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.whatsapp_sessions enable row level security;
create policy "service role only" on public.whatsapp_sessions for all using (false);

-- ============================================================
-- PENDING REPLIES QUEUE
-- The bot deliberately delays its replies (~60-120s) so it
-- doesn't feel instant/robotic. Vercel's free cron tier only
-- runs once/day, so the actual send happens via an external
-- free cron (e.g. cron-job.org) hitting /api/whatsapp/send-pending
-- every minute — see HANDOFF.md "WhatsApp Bot" section.
-- ============================================================

create table public.whatsapp_pending_replies (
  id uuid default gen_random_uuid() primary key,
  phone_number text not null,
  payload jsonb not null,       -- the WhatsApp message payload to send as-is
  send_after timestamptz not null,
  sent boolean default false not null,
  created_at timestamptz default now() not null
);

create index if not exists idx_whatsapp_pending_due
  on public.whatsapp_pending_replies (send_after)
  where not sent;

alter table public.whatsapp_pending_replies enable row level security;
create policy "service role only" on public.whatsapp_pending_replies for all using (false);
