'use client'

import { useState } from 'react'
import { Shield, Briefcase, Check } from 'lucide-react'

export interface ConsentGateItem {
  key: string
  text: string
  required: boolean
}

interface ConsentGateProps {
  variant: 'client_intake' | 'advisor_agreement'
  title: string
  subtitle: string
  items: ConsentGateItem[]
  onAccept: (acknowledgedKeys: string[]) => Promise<void> | void
  onCancel?: () => void
  acceptLabel?: string
  cancelLabel?: string
  disclaimerNote?: string
}

export function ConsentGate({
  variant,
  title,
  subtitle,
  items,
  onAccept,
  onCancel,
  acceptLabel = 'I Understand & Agree — Continue',
  cancelLabel = 'Go Back',
  disclaimerNote,
}: ConsentGateProps) {
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(false)

  const toggle = (key: string) =>
    setChecked(prev => ({ ...prev, [key]: !prev[key] }))

  const allRequiredChecked = items
    .filter(i => i.required)
    .every(i => checked[i.key])

  async function handleAccept() {
    if (!allRequiredChecked || loading) return
    setLoading(true)
    try {
      const keys = items.filter(i => checked[i.key]).map(i => i.key)
      await onAccept(keys)
    } finally {
      setLoading(false)
    }
  }

  const Icon = variant === 'advisor_agreement' ? Briefcase : Shield
  const iconBg = variant === 'advisor_agreement' ? 'bg-indigo-50' : 'bg-blue-50'
  const iconColor = variant === 'advisor_agreement' ? 'text-indigo-600' : 'text-blue-600'

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-start justify-center py-10 px-4">
      <div className="w-full max-w-2xl">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8">

          {/* Header */}
          <div className="flex items-start gap-4 mb-6">
            <div className={`w-11 h-11 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
              <Icon className={`w-5 h-5 ${iconColor}`} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900" style={{ fontFamily: 'Sora, sans-serif' }}>
                {title}
              </h2>
              <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">{subtitle}</p>
            </div>
          </div>

          {/* Consent items */}
          <div className="space-y-3 mb-6">
            {items.map(item => {
              const isChecked = !!checked[item.key]
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => toggle(item.key)}
                  className={`w-full flex items-start gap-3 text-left px-4 py-3.5 rounded-xl border transition-colors ${
                    isChecked
                      ? 'border-brand-300 bg-blue-50'
                      : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                    isChecked
                      ? 'border-brand-500 bg-brand-500'
                      : 'border-gray-300 bg-white'
                  }`}>
                    {isChecked && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                  </div>
                  <span className="text-sm text-gray-700 leading-relaxed">
                    {item.text}
                    {item.required && (
                      <span className="text-red-500 ml-1 text-xs">*required</span>
                    )}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={handleAccept}
              disabled={!allRequiredChecked || loading}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-6 bg-brand-600 hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors"
            >
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3"/>
                    <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                  </svg>
                  Please wait…
                </>
              ) : acceptLabel}
            </button>

            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="sm:w-auto py-3 px-5 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors"
              >
                {cancelLabel}
              </button>
            )}
          </div>

          {/* Footer note */}
          {disclaimerNote && (
            <p className="text-xs text-gray-400 mt-4 leading-relaxed">{disclaimerNote}</p>
          )}
          <p className="text-xs text-gray-400 mt-2 leading-relaxed">
            * All required items must be acknowledged to continue. Your acknowledgments are recorded with a timestamp for compliance purposes.
          </p>
        </div>
      </div>
    </div>
  )
}
