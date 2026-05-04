import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const PLAN_PRICES: Record<string, number> = {
  starter: 149,
  professional: 399,
  enterprise: 999,
}

export async function POST(request: NextRequest) {
  try {
    const { code, plan } = await request.json()

    if (!code) {
      return NextResponse.json({ error: 'Code is required' }, { status: 400 })
    }

    console.log('[validate] checking code:', code, 'for plan:', plan)

    // Use service role to bypass RLS — validation must work for unauthenticated users
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: discountCode, error } = await serviceClient
      .from('discount_codes')
      .select('*')
      .eq('is_active', true)
      .ilike('code', code.trim())
      .maybeSingle()

    console.log('[validate] query result:', discountCode?.code, 'error:', error?.message)

    if (error) {
      console.error('[validate] database error:', error.message)
      return NextResponse.json({ valid: false, error: 'Database error' })
    }

    if (!discountCode) {
      console.log('[validate] code not found:', code)
      return NextResponse.json({
        valid: false,
        error: 'This code is not valid or has expired',
      })
    }

    // Check expiry — use end-of-day to avoid timezone edge cases
    if (discountCode.expires_at) {
      const expiryDate = new Date(discountCode.expires_at)
      expiryDate.setHours(23, 59, 59, 999)
      if (expiryDate < new Date()) {
        console.log('[validate] code expired:', code)
        return NextResponse.json({
          valid: false,
          error: 'This discount code has expired',
        })
      }
    }

    // Check max uses
    if (discountCode.max_uses && discountCode.current_uses >= discountCode.max_uses) {
      console.log('[validate] code max uses reached:', code)
      return NextResponse.json({
        valid: false,
        error: 'This discount code has reached its maximum uses',
      })
    }

    const fullPrice = PLAN_PRICES[plan] ?? PLAN_PRICES.professional
    let discountAmount = 0
    let discountedPrice = fullPrice

    if (discountCode.discount_type === 'percentage') {
      discountAmount = fullPrice * (discountCode.discount_value / 100)
      discountedPrice = fullPrice - discountAmount
    } else {
      discountAmount = Math.min(discountCode.discount_value, fullPrice)
      discountedPrice = fullPrice - discountAmount
    }

    console.log('[validate] code valid! discount:', discountAmount, 'final price:', discountedPrice)

    return NextResponse.json({
      valid: true,
      code: discountCode.code,
      discount_type: discountCode.discount_type,
      discount_value: discountCode.discount_value,
      discount_amount: discountAmount,
      full_price: fullPrice,
      discounted_price: Math.max(0, discountedPrice),
      referrer_name: null,
      description: discountCode.description,
    })

  } catch (e: any) {
    console.error('[validate] error:', e.message)
    return NextResponse.json({
      valid: false,
      error: 'Could not validate code. Please try again.',
    }, { status: 500 })
  }
}
