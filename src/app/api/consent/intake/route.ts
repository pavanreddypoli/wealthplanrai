import { NextRequest, NextResponse } from 'next/server'
import {
  INTAKE_CONSENT_ITEMS,
  DISCLAIMER_VERSION,
  type DisclosureAcknowledgment,
} from '@/lib/wealthplanr/compliance-module'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      acknowledgedKeys: string[]
      assessmentDraftId?: string
    }

    const { acknowledgedKeys = [] } = body

    // Verify all required items are acknowledged
    const required = INTAKE_CONSENT_ITEMS.filter(c => c.required).map(c => c.key)
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
    const intake_consents: DisclosureAcknowledgment[] = acknowledgedKeys.map(key => ({
      disclosureKey:     key,
      disclosureVersion: DISCLAIMER_VERSION,
      acknowledgedAt:    now,
      ipAddress:         ip,
      userAgent,
    }))

    return NextResponse.json({ ok: true, intake_consents })

  } catch (e: any) {
    console.error('[consent/intake] error:', e.message)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
