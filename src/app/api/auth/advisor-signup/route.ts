import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function anonClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

const TYPE_MAP: Record<string, string> = {
  'Financial Advisor': 'advisor',
  'Financial Planner': 'planner',
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      full_name: string
      email: string
      password: string
      advisor_type: string
      advisor_specialty: string
      phone: string
      bio: string
      years_experience: string
      is_accepting_clients: boolean
    }

    const { full_name, email, password, advisor_type, advisor_specialty, phone, bio, years_experience, is_accepting_clients } = body

    // Create auth user
    const supabase = anonClient()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/api/auth/callback`,
        data: { full_name },
      },
    })

    if (error) {
      console.error('[advisor-signup] auth.signUp error:', error.message)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    if (!data.user) {
      return NextResponse.json({ error: 'No user returned from signup' }, { status: 500 })
    }

    // Wait for handle_new_user trigger to create profiles row
    await new Promise(r => setTimeout(r, 500))

    // Update profiles row with advisor info using admin client
    const admin = adminClient()
    const { error: profileError } = await admin
      .from('profiles')
      .update({
        full_name,
        advisor_type:         TYPE_MAP[advisor_type] ?? 'advisor',
        advisor_specialty:    advisor_specialty || null,
        phone:                phone || null,
        bio:                  bio || null,
        years_experience:     years_experience || null,
        is_accepting_clients: is_accepting_clients ?? true,
      })
      .eq('id', data.user.id)

    if (profileError) {
      console.error('[advisor-signup] profile update error:', profileError.message)
      // Non-fatal — auth user was created, profile update failed but can be fixed later
    }

    return NextResponse.json({ success: true, userId: data.user.id })

  } catch (err) {
    console.error('[advisor-signup] fatal error:', err)
    return NextResponse.json({ error: 'Signup failed — please try again' }, { status: 500 })
  }
}
