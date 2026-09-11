-- ============================================================
-- Track the last-processed WhatsApp message id per session, so
-- a webhook redelivery of the SAME message (Meta retries on any
-- slow/non-2xx response) doesn't get processed twice — e.g.
-- creating two duplicate leads or queuing two duplicate delayed
-- replies for one real incoming message.
-- ============================================================

alter table public.whatsapp_sessions
  add column if not exists last_message_id text;
