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
    console.log('[send-report] called for assessment:', assessmentId)
    console.log('[send-report] SendGrid key present:', !!process.env.SENDGRID_API_KEY)
    console.log('[send-report] From email:', process.env.SENDGRID_FROM_EMAIL)

    if (!assessmentId) {
      return NextResponse.json({ error: 'assessmentId required' }, { status: 400 })
    }

    const supabase = adminClient()

    const { data, error } = await supabase
      .from('assessments')
      .select('id, full_name, email, risk_profile, score, score_results, answers, created_at, selected_advisor_id')
      .eq('id', assessmentId)
      .single()

    if (error || !data) {
      console.error('[send-report] assessment not found:', error)
      return NextResponse.json({ error: 'assessment not found' }, { status: 404 })
    }

    console.log('[send-report] assessment fetched:', data.id, 'email:', data.email)

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
      console.log('[send-report] selected advisor:', advisorName, advisorEmail)
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
    console.log('[send-report] generating PDFs...')
    const [clientPDF, advisorPDF] = await Promise.all([
      generateClientPDF(assessmentForPDF),
      generateAdvisorPDF(assessmentForPDF),
    ])
    console.log('[send-report] PDFs generated. Client:', clientPDF.length, 'bytes. Advisor:', advisorPDF.length, 'bytes.')

    let emailsSent = 0

    // Info email always fires
    try {
      await sendInfoEmail(name, email, (data.score as number) ?? 0, data.risk_profile as string, pillars, gaps, assessmentId, advisorPDF)
      console.log('[send-report] info email sent successfully to company inbox')
      emailsSent++
    } catch (e) {
      console.error('[send-report] info email failed:', (e as Error).message)
    }

    // Client email if we have a valid address
    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (email && EMAIL_RE.test(email)) {
      try {
        await sendClientEmail(email, name, assessmentId, (data.score as number) ?? 0, data.risk_profile as string, pillars, clientPDF, gaps)
        console.log('[send-report] client email sent successfully to:', email)
        emailsSent++
      } catch (e) {
        console.error('[send-report] client email failed:', (e as Error).message)
      }
    } else {
      console.error('[send-report] No client email found for assessment:', assessmentId, '— raw value:', email)
    }

    // Advisor email if one was selected
    if (advisorEmail) {
      try {
        await sendAdvisorEmail(
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
        )
        console.log('[send-report] advisor email sent successfully to:', advisorEmail)
        emailsSent++
      } catch (e) {
        console.error('[send-report] advisor email failed:', (e as Error).message)
      }
    }

    // Update assessment status
    await supabase
      .from('assessments')
      .update({ status: 'emailed' })
      .eq('id', assessmentId)

    console.log('[send-report] done. Emails sent:', emailsSent)
    return NextResponse.json({ success: true, emailsSent })

  } catch (err) {
    console.error('[send-report] fatal error:', err)
    return NextResponse.json({ error: 'Report send failed' }, { status: 500 })
  }
}
