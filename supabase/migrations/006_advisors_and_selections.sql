-- RedCube WealthOS — Migration 006
-- Adds advisor profile fields and assessment advisor selection

-- ─── profiles: advisor columns ───────────────────────────────────────────────

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS advisor_type          text DEFAULT 'client';
-- Values: client, advisor, planner, admin

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_accepting_clients  boolean DEFAULT true;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS advisor_specialty     text;
-- e.g. "Retirement Planning", "Estate Planning", "Small Business"

-- ─── assessments: advisor selection ──────────────────────────────────────────

ALTER TABLE assessments ADD COLUMN IF NOT EXISTS selected_advisor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- client_email is a denormalized copy for quick access (email already exists, this is a no-op if so)
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS client_email text;

-- ─── RLS: clients can read advisor profiles ───────────────────────────────────

-- Drop if exists to make this idempotent, then recreate
DO $$ BEGIN
  DROP POLICY IF EXISTS "clients_can_view_advisors" ON profiles;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY "clients_can_view_advisors" ON profiles
  FOR SELECT USING (advisor_type IN ('advisor', 'planner'));

-- ─── Indexes ──────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_profiles_advisor_type        ON profiles (advisor_type);
CREATE INDEX IF NOT EXISTS idx_assessments_selected_advisor ON assessments (selected_advisor_id);
