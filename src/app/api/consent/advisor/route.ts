import { NextRequest, NextResponse } from 'next/server'
import {
  ADVISOR_AGREEMENT_ITEMS,
  DISCLAIMER_VERSION,
  type DisclosureAcknowledgment,
} from '@/lib/wealthplanr/compliance-module'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      acknowledgedKeys: string[]
      email: string
    }

    const { acknowledgedKeys = [], email } = body

    // Verify all required items are acknowledged
    const required = ADVISOR_AGREEMENT_ITEMS.filter(c => c.required).map(c => c.key)
    const provided = new Set(acknowledgedKeys)
    const missing  = required.filter(k => !provided.has(k))

    if (missing.length > 0) {
      return NextResponse.json(
        { error: 'incomplete_consent', missing },
        { status: 400 },
      )
    }

    // Capture request metadata
    const ip        = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
                   ?? request.headers.get('x-real-ip')
                   ?? 'unknown'
    const userAgent = request.headers.get('user-agent') ?? undefined
    const now       = new Date().toISOString()

    // Build acknowledgment records
    const advisor_agreement: DisclosureAcknowledgment[] = acknowledgedKeys.map(key => ({
      disclosureKey:     key,
      disclosureVersion: DISCLAIMER_VERSION,
      acknowledgedAt:    now,
      ipAddress:         ip,
      userAgent,
      ...(email ? { email } : {}),
    }))

    console.log('[consent/advisor] agreement recorded for:', email, '— keys:', acknowledgedKeys.length)

    return NextResponse.json({ ok: true, advisor_agreement })

  } catch (e: any) {
    console.error('[consent/advisor] error:', e.message)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
