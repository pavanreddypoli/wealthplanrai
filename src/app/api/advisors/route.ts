import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function GET() {
  try {
    const supabase = adminClient()
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, advisor_type, advisor_specialty')
      .in('advisor_type', ['advisor', 'planner'])
      .eq('is_accepting_clients', true)
      .order('full_name', { ascending: true })

    if (error) throw error

    return NextResponse.json(data ?? [])
  } catch (err) {
    console.error('[advisors GET] error:', err)
    return NextResponse.json([], { status: 200 })
  }
}
