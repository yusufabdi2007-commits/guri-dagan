-- Security fix: program_knowledge had a "public read" policy (USING (true))
-- that let anyone holding the anon key read the owner's proprietary curriculum
-- text directly from Supabase. Every actual consumer (app/api/program-knowledge,
-- app/api/recovery, app/api/health-check) already authenticates via
-- supabase.auth.getUser() and is scoped by the "Users manage own program
-- knowledge" policy, so the public policy was unused and unnecessary.

drop policy if exists "Public read program knowledge" on program_knowledge;
