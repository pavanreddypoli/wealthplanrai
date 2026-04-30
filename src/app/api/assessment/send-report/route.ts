import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateClientPDF, generateAdvisorPDF } from '@/lib/generatePDF'
import { sendClientEmail, sendInfoEmail, sendAdvisorEmail } from '@/lib/email'
import type { ScoreResults } from '@/lib/scoring'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

function clamp(v: number) { return Math.max(0, Math.min(100, Math.round(v))) }

function computePillars(sr: ScoreResults | null) {
  if (!sr) return { protect: 0, grow: 0, legacy: 0 }
  return {
    protect: clamp((sr.sub_scores.insurance + sr.sub_scores.estate) / 2),
    grow:    clamp((sr.sub_scores.investments + sr.sub_scores.retirement + sr.sub_scores.cashflow + sr.sub_scores.tax) / 4),
    legacy:  clamp(sr.sub_scores.estate),
  }
}

function topGaps(sr: ScoreResults | null): string[] {
  if (!sr?.recommendations) return []
  return [...sr.recommendations]
    .sort((a, b) => ({ high: 0, medium: 1, low: 2 }[a.priority] ?? 2) - ({ high: 0, medium: 1, low: 2 }[b.priority] ?? 2))
    .slice(0, 3)
    .map(r => r.message)
}

export async function POST(req: NextRequest) {
  try {
    const { assessmentId } = await req.json() as { assessmentId: string }
    if (!assessmentId) {
      return NextResponse.json({ error: 'assessmentId required' }, { status: 400 })
    }

    const supabase = adminClient()

    // Fetch assessment + selected advisor in one go
    const { data, error } = await supabase
      .from('assessments')
      .select('id, full_name, email, risk_profile, score, score_results, answers, created_at, selected_advisor_id')
      .eq('id', assessmentId)
      .single()

    if (error || !data) {
      console.error('[send-report] assessment not found:', error)
      return NextResponse.json({ error: 'assessment not found' }, { status: 404 })
    }

    const sr       = data.score_results as ScoreResults | null
    const answers  = (data.answers ?? {}) as Record<string, unknown>
    const name     = (data.full_name as string | null) ?? 'Client'
    const email    = (data.email as string | null) ?? (answers.email as string | null) ?? null
    const pillars  = computePillars(sr)
    const gaps     = topGaps(sr)

    // Fetch selected advisor if present
    let advisorEmail: string | null = null
    let advisorName: string | null  = null
    if (data.selected_advisor_id) {
      const { data: advisor } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', data.selected_advisor_id)
        .single()
      advisorEmail = advisor?.email ?? null
      advisorName  = advisor?.full_name ?? null
    }

    const assessmentForPDF = {
      clientName:   name,
      clientEmail:  email,
      riskProfile:  data.risk_profile as string,
      overallScore: (data.score as number) ?? 0,
      scoreResults: sr,
      answers,
      createdAt:    data.created_at as string,
      assessmentId,
      advisorName,
    }

    // Generate both PDFs in parallel
    const [clientPDF, advisorPDF] = await Promise.all([
      generateClientPDF(assessmentForPDF),
      generateAdvisorPDF(assessmentForPDF),
    ])

    // Build email promises
    const emailJobs: Promise<void>[] = [
      sendInfoEmail(name, email, (data.score as number) ?? 0, data.risk_profile as string, pillars, gaps, assessmentId, advisorPDF),
    ]

    if (email) {
      emailJobs.push(
        sendClientEmail(email, name, assessmentId, (data.score as number) ?? 0, data.risk_profile as string, pillars, clientPDF),
      )
    }

    if (advisorEmail) {
      emailJobs.push(
        sendAdvisorEmail(
          advisorEmail,
          advisorName ?? 'Advisor',
          name,
          email,
          (data.score as number) ?? 0,
          data.risk_profile as string,
          pillars,
          String(answers.biggestConcern ?? ''),
          [String(answers.topPriority1 ?? ''), String(answers.topPriority2 ?? ''), String(answers.topPriority3 ?? '')],
          assessmentId,
          advisorPDF,
        ),
      )
    }

    // Send all emails in parallel; update status regardless of email outcome
    const results = await Promise.allSettled(emailJobs)
    results.forEach((r, i) => {
      if (r.status === 'rejected') console.error(`[send-report] email job ${i} failed:`, r.reason)
    })

    // Update assessment status to emailed
    await supabase
      .from('assessments')
      .update({ status: 'emailed' })
      .eq('id', assessmentId)

    const emailsSent = results.filter(r => r.status === 'fulfilled').length
    return NextResponse.json({ success: true, emailsSent })

  } catch (err) {
    console.error('[send-report] error:', err)
    return NextResponse.json({ error: 'Report send failed' }, { status: 500 })
  }
}
