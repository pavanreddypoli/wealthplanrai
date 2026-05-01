import { createClient } from '@/lib/supabase/server'
import { AssessmentTable } from './AssessmentTable'
import type { ScoreResults } from '@/lib/scoring'

// ── Shared types (consumed by AssessmentTable) ────────────────────────────────

export interface AssessmentRow {
  id: string
  full_name: string | null
  email: string | null
  created_at: string
  score: number
  risk_profile: string
  score_results: ScoreResults | null
  status: string | null
  assigned_advisor_id: string | null
  note_count: number
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const supabase = await createClient()

  // Fetch assessments + note counts in parallel
  const [assessmentsResult, noteRowsResult] = await Promise.all([
    supabase
      .from('assessments')
      .select('id, full_name, email, created_at, score, risk_profile, score_results, status, assigned_advisor_id')
      .order('created_at', { ascending: false }),
    supabase
      .from('advisor_notes')
      .select('assessment_id'),
  ])

  if (assessmentsResult.error) {
    console.error('[Dashboard] assessments query error:', assessmentsResult.error.message)
  }

  if (noteRowsResult.error) {
    console.error('[Dashboard] advisor_notes query error:', noteRowsResult.error.message)
  }

  // Build per-assessment note count map
  const noteCounts: Record<string, number> = {}
  for (const row of noteRowsResult.data ?? []) {
    if (row.assessment_id) {
      noteCounts[row.assessment_id] = (noteCounts[row.assessment_id] ?? 0) + 1
    }
  }

  const rows: AssessmentRow[] = (assessmentsResult.data ?? []).map(a => ({
    id:                  a.id,
    full_name:           (a as Record<string, unknown>).full_name as string | null ?? null,
    email:               (a as Record<string, unknown>).email as string | null ?? null,
    created_at:          a.created_at,
    score:               (a as Record<string, unknown>).score as number ?? 0,
    risk_profile:        (a as Record<string, unknown>).risk_profile as string ?? 'moderate',
    score_results:       (a as Record<string, unknown>).score_results as ScoreResults | null ?? null,
    status:              (a as Record<string, unknown>).status as string | null ?? null,
    assigned_advisor_id: (a as Record<string, unknown>).assigned_advisor_id as string | null ?? null,
    note_count:          noteCounts[a.id] ?? 0,
  }))

  return <AssessmentTable initialAssessments={rows} />
}
