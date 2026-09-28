-- Phase: Finance ledger + region-based coaching pricing
-- Run this in Supabase SQL Editor

-- finance_transactions: unified money-in/money-out ledger for the business.
-- Coaching payments created via /api/enrollments are auto-mirrored here
-- (linked via enrollment_id/payment_id) so the ledger and /revenue never drift apart.
-- Manual entries (general income, expenses) have no enrollment_id/payment_id.
CREATE TABLE IF NOT EXISTS finance_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  category TEXT NOT NULL DEFAULT 'Other',
  client_name TEXT,
  enrollment_id UUID REFERENCES client_enrollments(id) ON DELETE SET NULL,
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS finance_transactions_user_idx ON finance_transactions(user_id);
CREATE INDEX IF NOT EXISTS finance_transactions_date_idx ON finance_transactions(user_id, transaction_date);
CREATE INDEX IF NOT EXISTS finance_transactions_enrollment_idx ON finance_transactions(enrollment_id);

ALTER TABLE finance_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own finance_transactions" ON finance_transactions
  FOR ALL USING (auth.uid() = user_id);

-- region: which price tier a coaching client falls into.
-- africa_arab = $25/month, other = $50/month (set by whoever enrolls the client).
ALTER TABLE client_enrollments ADD COLUMN IF NOT EXISTS region TEXT CHECK (region IN ('africa_arab', 'other'));
