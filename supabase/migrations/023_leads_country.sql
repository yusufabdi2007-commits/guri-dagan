-- Add country column to leads table
ALTER TABLE leads ADD COLUMN IF NOT EXISTS country text;
