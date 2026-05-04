import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AssessmentTable } from '../AssessmentTable'
import { computePillars } from '../page'
import type { AssessmentRow } from '../page'

export const dynamic = 'force-dynamic'

export default async function ClientsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, advisor_type')
    .eq('id', user.id)
    .single()

  const [assessmentsResult, noteRowsResult] = await Promise.all([
    supabase
      .from('assessments')
      .select('id, full_name, email, created_at, score, risk_profile, score_results, status, assigned_advisor_id, selected_advisor_id')
      .or(`selected_advisor_id.eq.${user.id},assigned_advisor_id.eq.${user.id}`)
      .order('created_at', { ascending: false }),
    supabase
      .from('advisor_notes')
      .select('assessment_id'),
  ])

  const noteCounts: Record<string, number> = {}
  for (const row of noteRowsResult.data ?? []) {
    if (row.assessment_id) {
      noteCounts[row.assessment_id] = (noteCounts[row.assessment_id] ?? 0) + 1
    }
  }

  const rows: AssessmentRow[] = (assessmentsResult.data ?? []).map(a => {
    const raw = a as Record<string, unknown>
    const scoreResults = raw.score_results as import('@/lib/scoring').ScoreResults | null ?? null
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
      selected_advisor_id: raw.selected_advisor_id as string | null ?? null,
      note_count:          noteCounts[a.id] ?? 0,
      protect_score:       pillars.protect,
      grow_score:          pillars.grow,
      legacy_score:        pillars.legacy,
    }
  })

  return (
    <div>
      <div className="px-6 py-3 bg-gray-50 border-b border-gray-100 text-xs text-gray-500 flex items-center gap-2">
        <a href="/dashboard" className="hover:text-blue-600 transition-colors">Dashboard</a>
        <span>→</span>
        <span className="text-gray-900 font-medium">Clients</span>
      </div>
      <AssessmentTable
        initialAssessments={rows}
        currentUserId={user.id}
        currentUserRole={profile?.advisor_type ?? null}
        showOnlyMyClients={true}
      />
    </div>
  )
}
