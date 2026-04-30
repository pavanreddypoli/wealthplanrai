import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { BillingClient } from './BillingClient'

export default async function BillingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan, subscription_status, trial_ends_at, stripe_customer_id')
    .eq('id', user.id)
    .single()

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your subscription and billing details.</p>
      </div>

      <BillingClient
        plan={profile?.plan ?? 'free'}
        status={profile?.subscription_status ?? null}
        trialEndsAt={profile?.trial_ends_at ?? null}
        hasCustomer={!!profile?.stripe_customer_id}
      />
    </div>
  )
}
