'use client'
import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Check, ArrowRight, ChevronDown } from 'lucide-react'
import { PLANS, PlanKey } from '@/lib/stripe'

function NewAdvisorBanner() {
  const params = useSearchParams()
  if (!params.get('newAdvisor')) return null
  return (
    <div className="bg-brand-600 text-white text-center py-3 px-4">
      <p className="text-sm font-medium">
        Almost done! Choose a plan to activate your advisor profile and start receiving clients.
      </p>
    </div>
  )
}

const PLAN_KEYS: PlanKey[] = ['starter', 'professional', 'enterprise']

const FAQ = [
  {
    q: 'Is there a free trial?',
    a: 'Yes — every paid plan includes a 14-day free trial. No credit card required to start.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Absolutely. Cancel with one click from your billing portal. No cancellation fees.',
  },
  {
    q: 'Do you offer refunds?',
    a: 'Yes. If you are unsatisfied within 7 days of your first charge, we will issue a full refund.',
  },
  {
    q: 'Is my data secure?',
    a: 'Yes. All data is encrypted in transit and at rest. Our infrastructure is SOC 2 Type II compliant.',
  },
]

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-6 py-4 text-left text-sm font-medium text-gray-900 hover:bg-gray-50 transition-colors"
      >
        {q}
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-6 pb-4 text-sm text-gray-600 border-t border-gray-100 pt-3">
          {a}
        </div>
      )}
    </div>
  )
}

export default function PricingPage() {
  const [loading, setLoading] = useState<PlanKey | null>(null)

  async function handleCheckout(plan: PlanKey) {
    setLoading(plan)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      const { url, error } = await res.json()
      if (error) { alert(error); return }
      window.location.href = url
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">

      <Suspense fallback={null}>
        <NewAdvisorBanner />
      </Suspense>

      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-brand-600 text-[18px] font-bold">■</span>
            <span className="text-[13px] font-bold text-gray-900 tracking-tight">RedCube WealthOS</span>
          </Link>
          <Link href="/dashboard" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
            Back to Dashboard
          </Link>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-16">

        {/* Hero */}
        <div className="text-center mb-14">
          <p className="text-brand-600 text-sm font-semibold tracking-widest uppercase mb-3">Pricing</p>
          <h1 className="font-heading text-4xl font-bold text-gray-900 mb-4 tracking-tight">
            Simple, transparent pricing
          </h1>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">
            Start free for 14 days. No credit card required. Cancel anytime.
          </p>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
          {PLAN_KEYS.map(key => {
            const plan = PLANS[key]
            const isPro = key === 'professional'
            return (
              <div
                key={key}
                className={`relative rounded-2xl p-8 flex flex-col ${
                  isPro
                    ? 'border-2 border-brand-600 bg-white shadow-lg shadow-brand-100'
                    : 'border border-gray-200 bg-white'
                }`}
              >
                {isPro && (
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-brand-600 text-white text-xs font-semibold px-4 py-1 rounded-full">
                    Most popular
                  </span>
                )}

                <div className="mb-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-1">{plan.name}</h2>
                  <p className="text-sm text-gray-500">{plan.description}</p>
                </div>

                <div className="mb-6">
                  <span className="text-4xl font-bold text-gray-900">${plan.price}</span>
                  <span className="text-gray-400 text-sm">/month</span>
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-gray-600">
                      <Check className="w-4 h-4 text-brand-600 flex-shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleCheckout(key)}
                  disabled={loading === key}
                  className={`w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-60 ${
                    isPro
                      ? 'bg-brand-600 hover:bg-brand-700 text-white'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                  }`}
                >
                  {loading === key ? 'Loading…' : (
                    <>Start free trial <ArrowRight className="w-4 h-4" /></>
                  )}
                </button>
              </div>
            )
          })}
        </div>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto mb-16">
          <h2 className="font-heading text-2xl font-bold text-gray-900 text-center mb-8">
            Frequently asked questions
          </h2>
          <div className="space-y-3">
            {FAQ.map(item => <FaqItem key={item.q} {...item} />)}
          </div>
        </div>

        {/* Regulatory disclaimer */}
        <div className="border border-gray-200 rounded-xl p-6 bg-white max-w-3xl mx-auto text-center">
          <p className="text-xs text-gray-400 leading-relaxed">
            RedCube WealthOS is a practice-management tool for licensed financial advisors. It does not
            constitute investment advice and is not regulated by the FCA, SEC, or any financial authority.
            All scoring and recommendations are for illustrative purposes only. Advisors are solely
            responsible for ensuring their advice meets applicable regulatory requirements.
          </p>
        </div>

      </div>
    </div>
  )
}
