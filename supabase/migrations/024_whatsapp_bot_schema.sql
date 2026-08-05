-- ============================================================
-- WHATSAPP BOT SCHEMA
-- Tracks conversation state per phone number for the free-tier
-- (Meta Cloud API, button-based) WhatsApp intake bot.
-- ============================================================

create table if not exists public.whatsapp_sessions (
  phone_number text primary key,
  step text not null default 'greeting'
    check (step in ('greeting', 'awaiting_who', 'awaiting_country', 'done')),
  who text check (who in ('parent', 'children', 'both')),
  country text,
  lead_id uuid references public.leads(id) on delete set null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- No RLS needed — this table is only ever touched server-side via the
-- service role key from the WhatsApp webhook route, never from the browser.
alter table public.whatsapp_sessions enable row level security;

create policy "service role only"
  on public.whatsapp_sessions
  for all
  using (false);
