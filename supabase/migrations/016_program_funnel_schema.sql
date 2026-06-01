-- Phase 14: Program Funnel Engine
-- Add program attribution to leads and content_attribution

-- Add program column to leads table
ALTER TABLE leads ADD COLUMN IF NOT EXISTS program TEXT;

-- Add program column to content_attribution table
ALTER TABLE content_attribution ADD COLUMN IF NOT EXISTS program TEXT;

-- Index for fast program-based queries
CREATE INDEX IF NOT EXISTS leads_program_idx ON leads(user_id, program);
CREATE INDEX IF NOT EXISTS content_attribution_program_idx ON content_attribution(user_id, program);
