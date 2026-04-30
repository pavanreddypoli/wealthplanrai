-- RedCube WealthOS — Migration 005
-- Safety: ensure all expected columns on assessments exist (idempotent)

alter table assessments
  add column if not exists score_results       jsonb,
  add column if not exists full_name           text,
  add column if not exists email               text,
  add column if not exists status              text default 'submitted',
  add column if not exists assigned_advisor_id uuid references auth.users(id) on delete set null;

-- Re-create index if it was somehow dropped
create index if not exists idx_assessments_created_at on assessments (created_at desc);
