import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

const PLAN_PRICES: Record<string, number> = {
  starter: 149,
  professional: 399,
  enterprise: 999,
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { code, plan } = await request.json() as { code: string; plan: string }

    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )

    const { data: discountCode, error: codeError } = await serviceClient
      .from('discount_codes')
      .select('*')
      .eq('is_active', true)
      .ilike('code', code.trim())
      .maybeSingle()

    console.log('[apply] code lookup:', discountCode?.code, 'error:', codeError?.message)

    if (codeError) {
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    if (!discountCode) {
      return NextResponse.json({ error: 'Code not found' }, { status: 404 })
    }

    // Check expiry — end-of-day to avoid timezone edge cases
    if (discountCode.expires_at) {
      const expiryDate = new Date(discountCode.expires_at)
      expiryDate.setHours(23, 59, 59, 999)
      if (expiryDate < new Date()) {
        return NextResponse.json({ error: 'This discount code has expired' }, { status: 400 })
      }
    }

    const fullPrice = PLAN_PRICES[plan] ?? PLAN_PRICES.professional
    let discountedPrice = fullPrice
    let discountAmount = 0

    if (discountCode.discount_type === 'percentage') {
      discountAmount = fullPrice * (discountCode.discount_value / 100)
      discountedPrice = fullPrice - discountAmount
    } else {
      discountAmount = Math.min(discountCode.discount_value, fullPrice)
      discountedPrice = fullPrice - discountAmount
    }

    await serviceClient.from('referrals').insert({
      referrer_id: discountCode.referrer_id,
      referred_id: user.id,
      discount_code_id: discountCode.id,
      discount_code: discountCode.code,
      original_price: fullPrice,
      discount_type: discountCode.discount_type,
      discount_value: discountCode.discount_value,
      discounted_price: discountedPrice,
      commission_percentage: discountCode.commission_percentage,
      plan,
      status: 'active',
    })

    await serviceClient
      .from('discount_codes')
      .update({ current_uses: (discountCode.current_uses ?? 0) + 1, updated_at: new Date().toISOString() })
      .eq('id', discountCode.id)

    await serviceClient
      .from('profiles')
      .update({
        referred_by_code: discountCode.code,
        discount_applied_percentage: discountCode.discount_type === 'percentage' ? discountCode.discount_value : null,
        actual_monthly_payment: discountedPrice,
        plan: plan || 'professional',
        subscription_status: 'trialing',
        trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .eq('id', user.id)

    console.log('[discount/apply] referral recorded for user:', user.id, 'code:', discountCode.code)
    return NextResponse.json({ success: true, discounted_price: discountedPrice })

  } catch (e: any) {
    console.error('[discount/apply] error:', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
