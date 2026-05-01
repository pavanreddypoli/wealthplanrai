'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function AdvisorRegisterPage() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const [form, setForm] = useState({
    full_name:            '',
    advisor_type:         'Financial Advisor',
    advisor_specialty:    '',
    phone:                '',
    bio:                  '',
    is_accepting_clients: true,
  })
  const [submitting, setSubmitting] = useState(false)
  const [success,    setSuccess]    = useState(false)
  const [error,      setError]      = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/auth/login')
      } else {
        // Pre-fill name from profile if available
        supabase
          .from('profiles')
          .select('full_name, advisor_type, advisor_specialty, phone, bio, is_accepting_clients')
          .eq('id', user.id)
          .single()
          .then(({ data }) => {
            if (data) {
              const typeLabel =
                data.advisor_type === 'planner' ? 'Financial Planner' :
                data.advisor_type === 'advisor' ? 'Financial Advisor' : 'Financial Advisor'
              setForm({
                full_name:            data.full_name ?? '',
                advisor_type:         typeLabel,
                advisor_specialty:    data.advisor_specialty ?? '',
                phone:                data.phone ?? '',
                bio:                  data.bio ?? '',
                is_accepting_clients: data.is_accepting_clients ?? true,
              })
            }
            setChecking(false)
          })
      }
    })
  }, [router])

  function set(field: string, value: string | boolean) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/advisor/register', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(form),
      })
      if (!res.ok) {
        const d = await res.json() as { error?: string }
        throw new Error(d.error ?? 'Failed to save')
      }
      setSuccess(true)
      setTimeout(() => router.push('/dashboard'), 2500)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <span className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center px-4">
        <div className="bg-green-50 border border-green-200 rounded-2xl p-10 text-center max-w-md w-full">
          <p className="text-4xl mb-3">✓</p>
          <h2 className="text-lg font-bold text-green-800 mb-2">Your advisor profile is live!</h2>
          <p className="text-sm text-green-700">Clients can now find and select you. Redirecting to dashboard…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <header className="bg-white border-b border-gray-200 px-6 h-14 flex items-center justify-between sticky top-0 z-20">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="text-brand-600 text-lg font-bold leading-none">■</span>
          <span className="text-[15px] text-gray-900 font-semibold">RedCube <span className="text-brand-600">WealthOS</span></span>
        </Link>
        <span className="text-[11px] text-gray-400 tracking-[1.2px] uppercase">Advisor Registration</span>
      </header>

      <div className="max-w-xl mx-auto px-4 py-10">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          <h1 className="font-heading text-xl font-bold text-gray-900 mb-1">Advisor Profile</h1>
          <p className="text-sm text-gray-500 mb-6">Complete your profile so clients can find and connect with you.</p>

          <form onSubmit={handleSubmit} className="space-y-5">

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Full Name</label>
              <input
                type="text"
                required
                value={form.full_name}
                onChange={e => set('full_name', e.target.value)}
                placeholder="Jane Smith"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Advisor Type</label>
              <select
                value={form.advisor_type}
                onChange={e => set('advisor_type', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 bg-white focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              >
                <option>Financial Advisor</option>
                <option>Financial Planner</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Specialty</label>
              <input
                type="text"
                value={form.advisor_specialty}
                onChange={e => set('advisor_specialty', e.target.value)}
                placeholder="e.g. Retirement Planning, Estate Planning, Wealth Management"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Phone Number</label>
              <input
                type="tel"
                value={form.phone}
                onChange={e => set('phone', e.target.value)}
                placeholder="(555) 000-0000"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Bio</label>
              <textarea
                rows={3}
                value={form.bio}
                onChange={e => set('bio', e.target.value)}
                placeholder="Write 2–3 sentences about your background, approach, and who you work best with."
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 resize-none"
              />
            </div>

            <div className="flex items-center gap-3">
              <input
                id="accepting"
                type="checkbox"
                checked={form.is_accepting_clients}
                onChange={e => set('is_accepting_clients', e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
              />
              <label htmlFor="accepting" className="text-sm text-gray-700">Currently accepting new clients</label>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-semibold text-sm rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {submitting
                ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Saving…</>
                : 'Complete Advisor Profile'
              }
            </button>

          </form>
        </div>
      </div>
    </div>
  )
}
