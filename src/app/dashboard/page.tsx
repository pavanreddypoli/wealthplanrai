import { createClient } from '@/lib/supabase/server'
import { AssessmentTable } from './AssessmentTable'
import type { ScoreResults } from '@/lib/scoring'

// ── Shared types ──────────────────────────────────────────────────────────────

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
  protect_score: number
  grow_score: number
  legacy_score: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function computePillars(sr: ScoreResults | null) {
  const s = sr?.sub_scores
  if (!s) return { protect: 0, grow: 0, legacy: 0 }
  return {
    protect: Math.round((s.insurance + s.cashflow) / 2),
    grow:    Math.round((s.investments + s.retirement) / 2),
    legacy:  Math.round((s.estate + s.tax) / 2),
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const supabase = await createClient()

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

  const noteCounts: Record<string, number> = {}
  for (const row of noteRowsResult.data ?? []) {
    if (row.assessment_id) {
      noteCounts[row.assessment_id] = (noteCounts[row.assessment_id] ?? 0) + 1
    }
  }

  const rows: AssessmentRow[] = (assessmentsResult.data ?? []).map(a => {
    const raw = a as Record<string, unknown>
    const scoreResults = raw.score_results as ScoreResults | null ?? null
    const pillars = computePillars(scoreResults)
    return {
      id:                  a.id,
      full_name:           raw.full_name as string | null ?? null,
      email:               raw.email as string | null ?? null,
      created_at:          a.created_at,
      score:               raw.score as number ?? 0,
      risk_profile:        raw.risk_profile as string ?? 'moderate',
      score_results:       scoreResults,
      status:              raw.status as string | null ?? null,
      assigned_advisor_id: raw.assigned_advisor_id as string | null ?? null,
      note_count:          noteCounts[a.id] ?? 0,
      protect_score:       pillars.protect,
      grow_score:          pillars.grow,
      legacy_score:        pillars.legacy,
    }
  })

  return <AssessmentTable initialAssessments={rows} />
}
