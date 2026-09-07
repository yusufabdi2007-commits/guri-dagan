-- Adds a "country currently living in" column wherever a phone/WhatsApp
-- number is collected but residence country wasn't previously tracked.
-- (leads and whatsapp_sessions already had this from earlier migrations.)

ALTER TABLE academy_students ADD COLUMN IF NOT EXISTS country text;
ALTER TABLE booking_requests ADD COLUMN IF NOT EXISTS country text;
ALTER TABLE crm_clients ADD COLUMN IF NOT EXISTS country text;
