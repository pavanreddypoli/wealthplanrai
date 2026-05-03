'use client'
import { useState } from 'react'
import { ArrowRight } from 'lucide-react'

interface Props {
  plan: string
  label: string
  highlighted?: boolean
}

export function CheckoutButton({ plan, label, highlighted }: Props) {
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  async function handleClick() {
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/stripe/checkout', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ plan }),
      })
      const data = await response.json() as { url?: string; error?: string }
      if (response.status === 401) {
        window.location.href = '/auth/login?redirectTo=/pricing'
        return
      }
      if (!response.ok) throw new Error(data.error ?? 'Failed to start checkout')
      if (data.url) window.location.href = data.url
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setLoading(false)
    }
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={loading}
        className={`w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-60 ${
          highlighted
            ? 'bg-brand-600 hover:bg-brand-700 text-white'
            : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
        }`}
      >
        {loading ? 'Setting up your trial…' : <>{label} <ArrowRight className="w-4 h-4" /></>}
      </button>
      {error && (
        <p className="text-red-500 text-xs mt-2 text-center">{error}</p>
      )}
    </div>
  )
}
