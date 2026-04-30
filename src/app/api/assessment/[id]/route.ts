import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const body = await request.json() as { selected_advisor_id?: string | null }

    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const supabase = adminClient()
    const { error } = await supabase
      .from('assessments')
      .update({ selected_advisor_id: body.selected_advisor_id ?? null })
      .eq('id', id)

    if (error) throw error

    // Trigger send-report to include selected advisor in emails
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    fetch(`${appUrl}/api/assessment/send-report`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ assessmentId: id }),
    }).catch(err => console.error('[assessment PATCH] send-report fire-and-forget:', err))

    return NextResponse.json({ success: true })

  } catch (err) {
    console.error('[assessment PATCH] error:', err)
    return NextResponse.json({ error: 'Failed to update assessment' }, { status: 500 })
  }
}
