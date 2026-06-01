-- Phase 15: Enrollment & Conversion System
-- Run this in Supabase SQL Editor

-- client_enrollments: tracks enrolled clients per program
CREATE TABLE IF NOT EXISTS client_enrollments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  parent_name TEXT NOT NULL,
  child_name TEXT,
  program TEXT,
  enrollment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'completed', 'paused', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- consultations: tracks scheduled + completed consultation calls
CREATE TABLE IF NOT EXISTS consultations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  outcome TEXT CHECK (outcome IN ('enrolled', 'follow_up', 'no_show', 'not_interested')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- payments: tracks payment records per enrollment
CREATE TABLE IF NOT EXISTS payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  enrollment_id UUID REFERENCES client_enrollments(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'GBP',
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_status TEXT NOT NULL DEFAULT 'paid'
    CHECK (payment_status IN ('pending', 'paid', 'refunded')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- testimonial_requests: track requests sent to enrolled clients
CREATE TABLE IF NOT EXISTS testimonial_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  enrollment_id UUID REFERENCES client_enrollments(id) ON DELETE CASCADE NOT NULL,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  received_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'received')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS enrollments_user_idx ON client_enrollments(user_id);
CREATE INDEX IF NOT EXISTS enrollments_lead_idx ON client_enrollments(lead_id);
CREATE INDEX IF NOT EXISTS enrollments_program_idx ON client_enrollments(user_id, program);
CREATE INDEX IF NOT EXISTS consultations_user_idx ON consultations(user_id);
CREATE INDEX IF NOT EXISTS consultations_lead_idx ON consultations(lead_id);
CREATE INDEX IF NOT EXISTS payments_user_idx ON payments(user_id);
CREATE INDEX IF NOT EXISTS payments_enrollment_idx ON payments(enrollment_id);
CREATE INDEX IF NOT EXISTS testimonial_requests_user_idx ON testimonial_requests(user_id);
CREATE INDEX IF NOT EXISTS testimonial_requests_enrollment_idx ON testimonial_requests(enrollment_id);

-- RLS
ALTER TABLE client_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE testimonial_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own enrollments" ON client_enrollments
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage own consultations" ON consultations
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage own payments" ON payments
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage own testimonial_requests" ON testimonial_requests
  FOR ALL USING (auth.uid() = user_id);
