import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStripe, PLANS, PlanKey } from '@/lib/stripe'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    console.log('[checkout] called, user:', user?.id)

    if (!user) {
      return NextResponse.json(
        { error: 'Please sign in to start your free trial' },
        { status: 401 },
      )
    }

    const { plan } = await req.json() as { plan: PlanKey }
    const planConfig = PLANS[plan]
    if (!planConfig) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    const stripe = getStripe()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: planConfig.priceId, quantity: 1 }],
      subscription_data: { trial_period_days: 14, metadata: { userId: user.id, plan } },
      customer_email: user.email,
      success_url: `${appUrl}/dashboard?upgraded=true`,
      cancel_url: `${appUrl}/pricing`,
      metadata: { userId: user.id, plan },
    })

    console.log('[checkout] session created:', session.id)
    return NextResponse.json({ url: session.url })

  } catch (e: any) {
    console.error('[checkout] error:', e.message)
    return NextResponse.json(
      { error: e.message ?? 'Failed to create checkout session' },
      { status: 500 },
    )
  }
}
