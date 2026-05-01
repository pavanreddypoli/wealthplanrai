import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json() as {
      full_name: string
      advisor_type: string
      advisor_specialty: string
      phone: string
      bio: string
      is_accepting_clients: boolean
    }

    const typeMap: Record<string, string> = {
      'Financial Advisor': 'advisor',
      'Financial Planner': 'planner',
    }

    const admin = adminClient()
    const { error } = await admin
      .from('profiles')
      .upsert({
        id:                   user.id,
        full_name:            body.full_name,
        advisor_type:         typeMap[body.advisor_type] ?? 'advisor',
        advisor_specialty:    body.advisor_specialty,
        phone:                body.phone,
        bio:                  body.bio,
        is_accepting_clients: body.is_accepting_clients,
      }, { onConflict: 'id' })

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[advisor/register POST] error:', err)
    return NextResponse.json({ error: 'Failed to register advisor' }, { status: 500 })
  }
}
