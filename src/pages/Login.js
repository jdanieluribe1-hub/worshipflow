import React, { useState } from 'react'
import { signIn, signUp, signInWithGoogle } from '../lib/supabase'

export default function Login({ onNeedsOnboarding, defaultMode = 'signin' }) {
  const [mode, setMode] = useState(defaultMode) // 'signin' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'signin') {
        const { error } = await signIn(email, password)
        if (error) throw error
      } else {
        const { error } = await signUp(email, password)
        if (error) throw error
        onNeedsOnboarding()
      }
    } catch (err) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    setError('')
    setOauthLoading(true)
    try {
      const { error } = await signInWithGoogle()
      if (error) throw error
      // redirect happens automatically
    } catch (err) {
      setError(err.message || 'Google sign-in failed')
      setOauthLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
      padding: 20,
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontFamily: 'var(--font-head)', fontSize: 28, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.5px' }}>
            WorshipFlow
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
            Worship Director Dashboard
          </div>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: 32 }}>
          <div style={{ fontFamily: 'var(--font-head)', fontSize: 18, fontWeight: 700, marginBottom: 24, color: 'var(--text)' }}>
            {mode === 'signin' ? 'Sign in to your account' : 'Create your account'}
          </div>

          {/* Google button */}
          <button
            onClick={handleGoogle}
            disabled={oauthLoading || loading}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              padding: '10px 0',
              marginBottom: 20,
              background: 'var(--bg3)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              color: 'var(--text)',
              fontSize: 14,
              fontWeight: 500,
              cursor: oauthLoading ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => { if (!oauthLoading) e.currentTarget.style.background = 'var(--bg4, var(--bg2))' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg3)' }}
          >
            {/* Google logo */}
            {!oauthLoading ? (
              <svg width="18" height="18" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.14 0 5.95 1.08 8.17 2.86l6.1-6.1C34.46 3.19 29.52 1 24 1 14.82 1 7.07 6.48 3.82 14.27l7.13 5.54C12.66 13.78 17.9 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.5 24.5c0-1.64-.15-3.22-.43-4.75H24v9h12.7c-.55 2.97-2.2 5.48-4.68 7.17l7.14 5.55C43.02 37.37 46.5 31.36 46.5 24.5z"/>
                <path fill="#FBBC05" d="M10.95 28.19A14.57 14.57 0 0 1 9.5 24c0-1.45.25-2.86.69-4.18L3.06 14.27A23.94 23.94 0 0 0 .5 24c0 3.87.92 7.53 2.56 10.76l7.89-6.57z"/>
                <path fill="#34A853" d="M24 47c5.52 0 10.16-1.83 13.54-4.97l-7.14-5.55C28.55 38.1 26.38 38.5 24 38.5c-6.1 0-11.34-4.28-13.2-10.04l-7.13 5.54C7.07 41.52 14.82 47 24 47z"/>
              </svg>
            ) : (
              <span style={{ fontSize: 13 }}>...</span>
            )}
            {oauthLoading ? 'Redirecting...' : `${mode === 'signin' ? 'Sign in' : 'Sign up'} with Google`}
          </button>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>or continue with email</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                style={{ width: '100%' }}
                autoComplete="email"
              />
            </div>
            <div className="form-group" style={{ marginBottom: 24 }}>
              <label className="form-label">Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                style={{ width: '100%' }}
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                minLength={6}
              />
            </div>

            {error && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#ef4444', marginBottom: 16 }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || oauthLoading}
              style={{ width: '100%', justifyContent: 'center', fontSize: 14, padding: '10px 0' }}
            >
              {loading ? '...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--muted)' }}>
            {mode === 'signin' ? (
              <>New here?{' '}
                <span style={{ color: 'var(--accent)', cursor: 'pointer', fontWeight: 500 }} onClick={() => { setMode('signup'); setError('') }}>
                  Create an account
                </span>
              </>
            ) : (
              <>Already have an account?{' '}
                <span style={{ color: 'var(--accent)', cursor: 'pointer', fontWeight: 500 }} onClick={() => { setMode('signin'); setError('') }}>
                  Sign in
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      <div style={{ position: 'fixed', bottom: 16, left: 0, right: 0, textAlign: 'center', fontSize: 10, color: 'var(--muted)', opacity: 0.5, letterSpacing: '0.03em', pointerEvents: 'none' }}>
        © {new Date().getFullYear()} WorshipFlow · Designed &amp; built by Daniel Uribe
      </div>
    </div>
  )
}
