'use client'
import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { BarChart3, ArrowLeft, ArrowRight, User, Briefcase } from 'lucide-react'

type Mode = 'landing' | 'signin' | 'signup'

const EXPERIENCE_OPTIONS = ['0–2 years', '3–5 years', '6–10 years', '11–20 years', '20+ years']

// ── Reusable field components ─────────────────────────────────────────────────

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

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-colors resize-none"
    />
  )
}

function SubmitButton({ loading, children }: { loading: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full py-3 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-semibold text-sm rounded-xl transition-colors flex items-center justify-center gap-2"
    >
      {loading
        ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Working…</>
        : children
      }
    </button>
  )
}

function ErrorBox({ msg }: { msg: string }) {
  const isInfo = msg.includes('Check your email') || msg.includes('confirm')
  return (
    <div className={`px-4 py-3 rounded-xl border text-sm ${isInfo ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
      {msg}
    </div>
  )
}

// ── Logo ──────────────────────────────────────────────────────────────────────

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 font-semibold text-gray-900 mb-8">
      <span className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center">
        <BarChart3 className="w-5 h-5 text-white" />
      </span>
      <span className="text-lg">RedCube <span className="text-brand-600">WealthOS</span></span>
    </Link>
  )
}

// ── MODE 1: Landing ───────────────────────────────────────────────────────────

function Landing({ onSignIn, onSignUp }: { onSignIn: () => void; onSignUp: () => void }) {
  return (
    <div className="w-full max-w-2xl">
      <Logo />

      <div className="text-center mb-8">
        <h1 className="font-heading text-3xl font-bold text-gray-900 mb-2">Welcome to RedCube WealthOS</h1>
        <p className="text-gray-500 text-base">Who are you here as today?</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

        {/* Client card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-7 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
            <User className="w-7 h-7 text-blue-600" />
          </div>
          <h2 className="font-heading text-lg font-bold text-gray-900 mb-2">I want financial guidance</h2>
          <p className="text-sm text-gray-500 mb-5 leading-relaxed">
            Take our free financial assessment and get matched with a licensed advisor.
          </p>
          <Link
            href="/assessment"
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            Take Free Assessment <ArrowRight className="w-4 h-4" />
          </Link>
          <span className="mt-3 text-[11px] text-green-600 font-medium bg-green-50 border border-green-200 rounded-full px-3 py-1">
            No account required
          </span>
        </div>

        {/* Advisor card */}
        <div className="bg-white rounded-2xl border-2 border-brand-200 shadow-sm p-7 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-brand-50 flex items-center justify-center mb-4">
            <Briefcase className="w-7 h-7 text-brand-600" />
          </div>
          <h2 className="font-heading text-lg font-bold text-gray-900 mb-2">I am a financial professional</h2>
          <p className="text-sm text-gray-500 mb-5 leading-relaxed">
            Join RedCube to manage clients, receive leads, and grow your practice.
          </p>
          <button
            onClick={onSignUp}
            className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            Sign Up as Advisor <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={onSignIn}
            className="mt-3 text-xs text-brand-600 hover:underline font-medium"
          >
            Already have an account? Sign in
          </button>
        </div>

      </div>

      <p className="mt-8 text-xs text-gray-400 text-center">
        By signing up you agree to our Terms of Service and Privacy Policy.
      </p>
    </div>
  )
}

// ── MODE 2: Sign In ───────────────────────────────────────────────────────────

function SignIn({ onBack }: { onBack: () => void }) {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      window.location.href = '/dashboard'
    } catch (err: unknown) {
      setError("We didn't recognize those credentials — double-check your email and password.")
      console.error('[signin]', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-sm">
      <Logo />
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
        <h1 className="font-heading text-xl font-bold text-gray-900 mb-1">Welcome back</h1>
        <p className="text-sm text-gray-500 mb-6">Sign in to your advisor account.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Email address">
            <TextInput type="email" autoComplete="email" required placeholder="you@firm.com"
              value={email} onChange={e => setEmail(e.target.value)} />
          </Field>
          <Field label="Password">
            <TextInput type="password" autoComplete="current-password" required placeholder="••••••••"
              value={password} onChange={e => setPassword(e.target.value)} />
          </Field>

          {error && <ErrorBox msg={error} />}

          <SubmitButton loading={loading}>Sign in <ArrowRight className="w-4 h-4" /></SubmitButton>
        </form>
      </div>

      <p className="mt-6 text-xs text-gray-400 text-center">
        By signing in you agree to our Terms of Service and Privacy Policy.
        For licensed financial advisors only.
      </p>
    </div>
  )
}

// ── MODE 3: Advisor Signup ────────────────────────────────────────────────────

interface SignupForm {
  full_name: string
  email: string
  password: string
  confirm_password: string
  advisor_type: string
  advisor_specialty: string
  phone: string
  bio: string
  years_experience: string
  is_accepting_clients: boolean
}

function AdvisorSignup({ onBack }: { onBack: () => void }) {
  const [form, setForm] = useState<SignupForm>({
    full_name: '', email: '', password: '', confirm_password: '',
    advisor_type: 'Financial Advisor', advisor_specialty: '',
    phone: '', bio: '', years_experience: '3–5 years', is_accepting_clients: true,
  })
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  function set(field: keyof SignupForm, value: string | boolean) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirm_password) {
      setError('Passwords do not match.')
      return
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/advisor-signup', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(form),
      })
      const data = await res.json() as { error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Signup failed')
      window.location.href = '/pricing?newAdvisor=true'
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-xl">
      <Logo />
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
        <h1 className="font-heading text-xl font-bold text-gray-900 mb-1">Join RedCube as a Financial Professional</h1>
        <p className="text-sm text-gray-500 mb-8">Create your account and start receiving client matches today.</p>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Section 1: Account */}
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4">Account</p>
            <div className="space-y-4">
              <Field label="Full Name">
                <TextInput type="text" required placeholder="Jane Smith"
                  value={form.full_name} onChange={e => set('full_name', e.target.value)} />
              </Field>
              <Field label="Email Address">
                <TextInput type="email" autoComplete="email" required placeholder="you@firm.com"
                  value={form.email} onChange={e => set('email', e.target.value)} />
              </Field>
              <Field label="Password">
                <TextInput type="password" autoComplete="new-password" required placeholder="Minimum 8 characters"
                  value={form.password} onChange={e => set('password', e.target.value)} />
              </Field>
              <Field label="Confirm Password">
                <TextInput type="password" autoComplete="new-password" required placeholder="Re-enter your password"
                  value={form.confirm_password} onChange={e => set('confirm_password', e.target.value)} />
              </Field>
            </div>
          </div>

          <div className="border-t border-gray-100" />

          {/* Section 2: Professional Profile */}
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4">Professional Profile</p>
            <div className="space-y-4">

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
                <TextArea rows={3} placeholder="Tell clients about your experience and approach — 2–3 sentences"
                  value={form.bio} onChange={e => set('bio', e.target.value)} />
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

            </div>
          </div>

          {error && <ErrorBox msg={error} />}

          <SubmitButton loading={loading}>
            Create My Advisor Account <ArrowRight className="w-4 h-4" />
          </SubmitButton>
        </form>
      </div>

      <p className="mt-6 text-xs text-gray-400 text-center">
        By creating an account you agree to our Terms of Service and Privacy Policy.
        For licensed financial professionals only.
      </p>
    </div>
  )
}

// ── Page shell ────────────────────────────────────────────────────────────────

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>('landing')

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center px-4 py-12">
      {mode === 'landing' && (
        <Landing onSignIn={() => setMode('signin')} onSignUp={() => setMode('signup')} />
      )}
      {mode === 'signin' && (
        <SignIn onBack={() => setMode('landing')} />
      )}
      {mode === 'signup' && (
        <AdvisorSignup onBack={() => setMode('landing')} />
      )}
    </div>
  )
}
