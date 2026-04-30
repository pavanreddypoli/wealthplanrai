'use client'
import { useState } from 'react'
import Link from 'next/link'
import { ArrowUpRight, ExternalLink } from 'lucide-react'
import { PLANS, PlanKey } from '@/lib/stripe'

interface Props {
  plan: string
  status: string | null
  trialEndsAt: string | null
  hasCustomer: boolean
}

const STATUS_LABEL: Record<string, string> = {
  trialing:         'Trial',
  active:           'Active',
  canceled:         'Canceled',
  past_due:         'Past due',
  incomplete:       'Incomplete',
  incomplete_expired: 'Expired',
  unpaid:           'Unpaid',
}

const STATUS_COLOR: Record<string, string> = {
  trialing: 'bg-blue-50 text-blue-700 border-blue-200',
  active:   'bg-green-50 text-green-700 border-green-200',
  canceled: 'bg-gray-100 text-gray-600 border-gray-200',
  past_due: 'bg-amber-50 text-amber-700 border-amber-200',
}

export function BillingClient({ plan, status, trialEndsAt, hasCustomer }: Props) {
  const [portalLoading, setPortalLoading] = useState(false)

  const planInfo = PLANS[plan as PlanKey]
  const statusLabel = status ? (STATUS_LABEL[status] ?? status) : 'No subscription'
  const statusColor = status ? (STATUS_COLOR[status] ?? 'bg-gray-100 text-gray-600 border-gray-200') : 'bg-gray-100 text-gray-600 border-gray-200'

  async function openPortal() {
    setPortalLoading(true)
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const { url, error } = await res.json()
      if (error) { alert(error); return }
      window.location.href = url
    } finally {
      setPortalLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Current plan card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Current plan</p>
            <h2 className="text-xl font-bold text-gray-900 capitalize">
              {planInfo?.name ?? (plan === 'free' ? 'Free' : plan)}
            </h2>
            {planInfo && (
              <p className="text-sm text-gray-500 mt-0.5">${planInfo.price}/month</p>
            )}
          </div>
          <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${statusColor}`}>
            {statusLabel}
          </span>
        </div>

        {trialEndsAt && status === 'trialing' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-4">
            <p className="text-sm text-blue-700">
              Your free trial ends on{' '}
              <strong>{new Date(trialEndsAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>.
              Add a payment method before then to keep access.
            </p>
          </div>
        )}

        <div className="flex gap-3 flex-wrap">
          <Link
            href="/pricing"
            className="inline-flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
          >
            Upgrade plan <ArrowUpRight className="w-4 h-4" />
          </Link>

          {hasCustomer && (
            <button
              onClick={openPortal}
              disabled={portalLoading}
              className="inline-flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-semibold px-4 py-2 rounded-xl transition-colors disabled:opacity-60"
            >
              {portalLoading ? 'Loading…' : (
                <><ExternalLink className="w-4 h-4" /> Manage billing</>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Plan features */}
      {planInfo && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-3">Included in your plan</p>
          <ul className="space-y-2">
            {planInfo.features.map(f => (
              <li key={f} className="flex items-center gap-2 text-sm text-gray-700">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-600 flex-shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-xs text-gray-400 text-center">
        Need help?{' '}
        <a href="mailto:support@redcube.io" className="text-brand-600 hover:underline">
          Contact support
        </a>
      </p>
    </div>
  )
}
