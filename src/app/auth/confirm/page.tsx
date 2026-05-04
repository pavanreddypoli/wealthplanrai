'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function ConfirmPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    async function handleConfirmation() {
      try {
        const supabase = createClient()

        const hash = window.location.hash
        console.log('[confirm] hash present:', !!hash)

        const { data: { session }, error } = await supabase.auth.getSession()
        console.log('[confirm] session:', !!session, 'error:', error?.message)

        if (session) {
          setStatus('success')
          setMessage('Email confirmed! Redirecting to your dashboard...')
          setTimeout(() => { window.location.href = '/dashboard' }, 2000)
          return
        }

        if (hash) {
          const params = new URLSearchParams(hash.replace('#', ''))
          const access_token  = params.get('access_token')
          const refresh_token = params.get('refresh_token')
          const type          = params.get('type')

          console.log('[confirm] type:', type, 'access_token present:', !!access_token)

          if (access_token && refresh_token) {
            const { data, error: sessionError } = await supabase.auth.setSession({
              access_token,
              refresh_token,
            })

            if (sessionError) {
              console.error('[confirm] setSession error:', sessionError.message)
              setStatus('error')
              setMessage(sessionError.message)
              return
            }

            if (data.session) {
              setStatus('success')
              setMessage('Email confirmed successfully! Redirecting...')
              setTimeout(() => { window.location.href = '/dashboard' }, 2000)
              return
            }
          }
        }

        setStatus('error')
        setMessage('Could not confirm your email. The link may have expired. Please request a new confirmation email.')
      } catch (e: any) {
        console.error('[confirm] error:', e.message)
        setStatus('error')
        setMessage('Something went wrong. Please try again.')
      }
    }

    handleConfirmation()
  }, [])

  return (
    <div style={{
      minHeight: '100vh', background: '#F8FAFC',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
    }}>
      <div style={{
        background: 'white', borderRadius: '20px', border: '1px solid #E2E8F0',
        padding: '48px 40px', maxWidth: '400px', width: '100%', textAlign: 'center',
        boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '32px' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px',
            background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px',
          }}>📈</div>
          <span style={{ fontFamily: 'Sora,sans-serif', fontWeight: '700', fontSize: '16px', color: '#0F172A' }}>
            WealthPlanr<span style={{ color: '#2563EB' }}>AI</span>
          </span>
        </div>

        {status === 'loading' && (
          <>
            <div style={{
              width: '56px', height: '56px', borderRadius: '50%', background: '#EFF6FF',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px', fontSize: '28px',
            }}>⏳</div>
            <h2 style={{ fontFamily: 'Sora,sans-serif', fontSize: '20px', fontWeight: '700', color: '#0F172A', marginBottom: '8px' }}>
              Confirming your email...
            </h2>
            <p style={{ fontSize: '14px', color: '#64748B' }}>
              Please wait while we verify your account.
            </p>
            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center' }}>
              <svg style={{ width: '32px', height: '32px', animation: 'spin 1s linear infinite' }} viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="#E2E8F0" strokeWidth="3"/>
                <path d="M12 2a10 10 0 0110 10" stroke="#2563EB" strokeWidth="3" strokeLinecap="round"/>
              </svg>
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </>
        )}

        {status === 'success' && (
          <>
            <div style={{
              width: '56px', height: '56px', borderRadius: '50%', background: '#F0FDF4',
              border: '2px solid #BBF7D0', display: 'flex', alignItems: 'center',
              justifyContent: 'center', margin: '0 auto 20px', fontSize: '28px',
            }}>✓</div>
            <h2 style={{ fontFamily: 'Sora,sans-serif', fontSize: '20px', fontWeight: '700', color: '#0F172A', marginBottom: '8px' }}>
              Email confirmed!
            </h2>
            <p style={{ fontSize: '14px', color: '#64748B', lineHeight: '1.6' }}>{message}</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{
              width: '56px', height: '56px', borderRadius: '50%', background: '#FEF2F2',
              border: '2px solid #FECACA', display: 'flex', alignItems: 'center',
              justifyContent: 'center', margin: '0 auto 20px', fontSize: '28px',
            }}>⚠️</div>
            <h2 style={{ fontFamily: 'Sora,sans-serif', fontSize: '20px', fontWeight: '700', color: '#0F172A', marginBottom: '8px' }}>
              Confirmation failed
            </h2>
            <p style={{ fontSize: '14px', color: '#64748B', lineHeight: '1.6', marginBottom: '24px' }}>{message}</p>
            <a href="/auth/login" style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              background: '#2563EB', color: 'white', padding: '10px 24px',
              borderRadius: '10px', fontSize: '14px', fontWeight: '600', textDecoration: 'none',
            }}>
              Back to Sign In
            </a>
            <p style={{ fontSize: '12px', color: '#94A3B8', marginTop: '16px' }}>
              Need help? Contact{' '}
              <a href="mailto:info@wealthplanrai.com" style={{ color: '#2563EB', textDecoration: 'none' }}>
                info@wealthplanrai.com
              </a>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
