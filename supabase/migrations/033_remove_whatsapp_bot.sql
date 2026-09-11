-- ============================================================
-- The WhatsApp intake bot was removed (never activated in
-- production — no Meta webhook was ever connected). Drops the
-- tables it used. Safe to run: only ever held test data.
-- ============================================================

drop table if exists public.whatsapp_pending_replies;
drop table if exists public.whatsapp_sessions;
