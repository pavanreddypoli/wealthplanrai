import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateAssessmentPDF } from '@/lib/generatePDF'
import { sendAdvisorReport } from '@/lib/email'
import type { ScoreResults } from '@/lib/scoring'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

function clamp(v: number) { return Math.max(0, Math.min(100, Math.round(v))) }

function computePillarScores(sr: ScoreResults | null) {
  if (!sr) return { protect: 0, grow: 0, legacy: 0 }
  return {
    protect: clamp((sr.sub_scores.insurance + sr.sub_scores.estate) / 2),
    grow:    clamp((sr.sub_scores.investments + sr.sub_scores.retirement + sr.sub_scores.cashflow + sr.sub_scores.tax) / 4),
    legacy:  clamp(sr.sub_scores.estate),
  }
}

export async function POST(req: NextRequest) {
  try {
    const { assessmentId } = await req.json() as { assessmentId: string }
    if (!assessmentId) {
      return NextResponse.json({ error: 'assessmentId required' }, { status: 400 })
    }

    const supabase = adminClient()
    const { data, error } = await supabase
      .from('assessments')
      .select('id, full_name, email, risk_profile, score, score_results, answers, created_at')
      .eq('id', assessmentId)
      .single()

    if (error || !data) {
      console.error('[send-report] assessment not found:', error)
      return NextResponse.json({ error: 'assessment not found' }, { status: 404 })
    }

    const sr      = data.score_results as ScoreResults | null
    const answers = (data.answers ?? {}) as Record<string, unknown>
    const name    = (data.full_name as string | null) ?? 'Client'
    const email   = (data.email as string | null) ?? null
    const pillarScores = computePillarScores(sr)

    const topRecommendations = sr?.recommendations
      ?.slice()
      .sort((a: { priority: string }, b: { priority: string }) => {
        const ord: Record<string, number> = { high: 0, medium: 1, low: 2 }
        return (ord[a.priority] ?? 2) - (ord[b.priority] ?? 2)
      })
      .slice(0, 3)
      .map((r: { message: string }) => r.message) ?? []

    // Generate PDF
    const pdfBuffer = await generateAssessmentPDF({
      clientName:   name,
      clientEmail:  email,
      riskProfile:  data.risk_profile as string,
      overallScore: (data.score as number) ?? 0,
      scoreResults: sr,
      answers,
      createdAt:    data.created_at as string,
    })

    // Send email
    await sendAdvisorReport(
      {
        assessmentId,
        clientName:         name,
        clientEmail:        email,
        overallScore:       (data.score as number) ?? 0,
        riskProfile:        data.risk_profile as string,
        pillarScores,
        topRecommendations,
        scoreResults:       sr,
      },
      pdfBuffer,
    )

    return NextResponse.json({ success: true })

  } catch (err) {
    console.error('[send-report] error:', err)
    return NextResponse.json({ error: 'Report send failed' }, { status: 500 })
  }
}
