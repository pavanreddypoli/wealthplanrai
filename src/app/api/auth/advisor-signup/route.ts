import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { ADVISOR_AGREEMENT_ITEMS } from '@/lib/wealthplanr/compliance-module'

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
      upgradeExistingId?: string
      advisor_agreement?: unknown[]
    }

    const {
      full_name, email, password, advisor_type, advisor_specialty,
      phone, bio, years_experience, is_accepting_clients,
    } = body

    // Advisor agreement validation — required for new signups (skip for upgrade flow)
    if (!body.upgradeExistingId) {
      const required = ADVISOR_AGREEMENT_ITEMS.filter(c => c.required).map(c => c.key)
      const provided = new Set((body.advisor_agreement ?? []).map((c: any) => c.disclosureKey))
      const missing  = required.filter(k => !provided.has(k))
      if (missing.length > 0) {
        return NextResponse.json({ error: 'agreement_required', missing }, { status: 403 })
      }
    }

    const advisorType = TYPE_MAP[advisor_type] ?? 'advisor'
    const admin = adminClient()

    // Handle upgrade request from duplicate flow
    if (body.upgradeExistingId) {
      await admin.from('profiles').update({
        advisor_type:      advisorType,
        full_name,
        advisor_specialty: advisor_specialty || null,
        phone:             phone || null,
        bio:               bio || null,
        years_experience:  years_experience || null,
        is_accepting_clients: is_accepting_clients ?? true,
      }).eq('id', body.upgradeExistingId)
      return NextResponse.json({ success: true })
    }

    // Duplicate check using admin client (bypasses RLS)
    const { data: existingProfile } = await admin
      .from('profiles')
      .select('id, email, advisor_type')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle()

    if (existingProfile) {
      const existingType      = existingProfile.advisor_type as string | null
      const existingTypeLabel = existingType === 'advisor' ? 'Financial Advisor'
        : existingType === 'planner' ? 'Financial Planner' : 'advisor'

      if (existingType === advisorType) {
        return NextResponse.json({
          error:   'already_exists_same_type',
          message: `You already have a ${advisor_type} account. Please sign in instead.`,
        }, { status: 409 })
      }

      if (existingType === 'advisor' || existingType === 'planner') {
        return NextResponse.json({
          error:        'already_exists_different_type',
          message:      `You already have a ${existingTypeLabel} account. Would you like to also register as a ${advisor_type}?`,
          canUpgrade:   true,
          existingType,
          existingId:   existingProfile.id,
        }, { status: 409 })
      }

      // Existing account with no advisor type (was a client) — upgrade to advisor
      await admin.from('profiles').update({
        advisor_type:      advisorType,
        full_name,
        advisor_specialty: advisor_specialty || null,
        phone:             phone || null,
        bio:               bio || null,
        years_experience:  years_experience || null,
        is_accepting_clients: is_accepting_clients ?? true,
      }).eq('id', existingProfile.id)

      return NextResponse.json({
        success:  true,
        upgraded: true,
        message:  'Your account has been upgraded to advisor access. Please sign in.',
      })
    }

    // Create new auth user
    const normalizedEmail = email.toLowerCase().trim()
    console.log('Signup received - email:', normalizedEmail, 'password length:', password?.length, 'first char:', password?.[0])

    const supabase = anonClient()
    const { data, error } = await supabase.auth.signUp({
      email:    normalizedEmail,
      password, // passed exactly as received — never trim or transform
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/auth/confirm`,
        data: { full_name, advisor_type: advisorType },
      },
    })

    console.log('SignUp response:', JSON.stringify({
      userId:         data?.user?.id,
      emailConfirmed: data?.user?.email_confirmed_at,
      error:          error?.message,
    }))

    if (error) {
      console.error('[advisor-signup] auth.signUp error:', error.message)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    if (!data.user) {
      return NextResponse.json({ error: 'No user returned from signup' }, { status: 500 })
    }

    // Wait for handle_new_user trigger to create profiles row
    await new Promise(r => setTimeout(r, 500))

    // Update profiles row with advisor info and trial
    const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
    const { error: profileError } = await admin
      .from('profiles')
      .update({
        full_name,
        advisor_type:         advisorType,
        advisor_specialty:    advisor_specialty || null,
        phone:                phone || null,
        bio:                  bio || null,
        years_experience:     years_experience || null,
        is_accepting_clients: is_accepting_clients ?? true,
        plan:                 'professional',
        subscription_status:  'trialing',
        trial_ends_at:        trialEndsAt,
        advisor_agreement:    body.advisor_agreement ?? null,
      })
      .eq('id', data.user.id)

    if (profileError) {
      console.error('[advisor-signup] profile update error:', profileError.message)
    }

    // Determine if email confirmation is required
    const requiresConfirmation = !data.user.email_confirmed_at

    if (requiresConfirmation) {
      return NextResponse.json({
        success:              true,
        requiresConfirmation: true,
        message:              'Please check your email and click the confirmation link before signing in.',
      })
    }

    return NextResponse.json({
      success:          true,
      requiresCheckout: true,
      message:          'Account created! Complete your plan selection to activate your trial.',
    })

  } catch (err) {
    console.error('[advisor-signup] fatal error:', err)
    return NextResponse.json({ error: 'Signup failed — please try again' }, { status: 500 })
  }
}
