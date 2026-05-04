'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const EXPERIENCE_OPTIONS = ['0–2 years', '3–5 years', '6–10 years', '11–20 years', '20+ years']

const TYPE_LABEL: Record<string, string> = {
  advisor: 'Financial Advisor',
  planner: 'Financial Planner',
}

interface ProfileData {
  full_name: string | null
  advisor_type: string | null
  advisor_specialty: string | null
  phone: string | null
  bio: string | null
  years_experience: string | null
  is_accepting_clients: boolean | null
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-gray-700">{label}</label>
      {children}
    </div>
  )
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-colors"
    />
  )
}

export default function AdvisorProfilePage() {
  const router  = useRouter()
  const [userEmail, setUserEmail] = useState<string | undefined>()
  const [form, setForm] = useState({
    full_name:            '',
    advisor_type:         'Financial Advisor',
    advisor_specialty:    '',
    phone:                '',
    bio:                  '',
    years_experience:     '3–5 years',
    is_accepting_clients: true,
  })
  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState(false)
  const [success,   setSuccess]   = useState(false)
  const [error,     setError]     = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/auth/login'); return }
      setUserEmail(user.email ?? undefined)

      fetch('/api/advisor/profile')
        .then(r => r.json())
        .then((data: ProfileData) => {
          setForm({
            full_name:            data.full_name ?? '',
            advisor_type:         TYPE_LABEL[data.advisor_type ?? ''] ?? 'Financial Advisor',
            advisor_specialty:    data.advisor_specialty ?? '',
            phone:                data.phone ?? '',
            bio:                  data.bio ?? '',
            years_experience:     data.years_experience ?? '3–5 years',
            is_accepting_clients: data.is_accepting_clients ?? true,
          })
        })
        .catch(() => {})
        .finally(() => setLoading(false))
    })
  }, [router])

  function set(field: string, value: string | boolean) {
    setForm(f => ({ ...f, [field]: value }))
    setSuccess(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess(false)
    try {
      const res = await fetch('/api/advisor/profile', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(form),
      })
      if (!res.ok) {
        const d = await res.json() as { error?: string }
        throw new Error(d.error ?? 'Save failed')
      }
      setSuccess(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto px-6 py-8">

        <div className="mb-6">
          <h1 className="font-heading text-xl font-bold text-gray-900 mb-1">My Advisor Profile</h1>
          <p className="text-sm text-gray-500">Keep your profile up to date so clients can find and connect with you.</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          <form onSubmit={handleSubmit} className="space-y-5">

            <Field label="Full Name">
              <TextInput type="text" required placeholder="Jane Smith"
                value={form.full_name} onChange={e => set('full_name', e.target.value)} />
            </Field>

            <Field label="I am a:">
              <div className="flex gap-3">
                {['Financial Advisor', 'Financial Planner'].map(type => (
                  <label key={type} className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border cursor-pointer text-sm font-medium transition-colors ${
                    form.advisor_type === type
                      ? 'border-brand-500 bg-brand-50 text-brand-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}>
                    <input type="radio" name="advisor_type" value={type} checked={form.advisor_type === type}
                      onChange={() => set('advisor_type', type)} className="sr-only" />
                    {type}
                  </label>
                ))}
              </div>
            </Field>

            <Field label="Specialty">
              <TextInput type="text" placeholder="e.g. Retirement Planning, Wealth Management, Estate Planning"
                value={form.advisor_specialty} onChange={e => set('advisor_specialty', e.target.value)} />
            </Field>

            <Field label="Phone Number">
              <TextInput type="tel" placeholder="(555) 000-0000"
                value={form.phone} onChange={e => set('phone', e.target.value)} />
            </Field>

            <Field label="Professional Bio">
              <textarea
                rows={3}
                placeholder="Tell clients about your experience and approach — 2–3 sentences"
                value={form.bio}
                onChange={e => set('bio', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-colors resize-none"
              />
            </Field>

            <Field label="Years of Experience">
              <select
                value={form.years_experience}
                onChange={e => set('years_experience', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 bg-white focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              >
                {EXPERIENCE_OPTIONS.map(o => <option key={o}>{o}</option>)}
              </select>
            </Field>

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

            {success && (
              <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                <p className="text-green-700 text-sm font-medium">✓ Profile saved successfully.</p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-semibold text-sm rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {saving
                ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Saving…</>
                : 'Save Profile'
              }
            </button>

          </form>
        </div>

      </div>
  )
}
