import React, { useState } from 'react'
import { createProfile } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

export default function Onboarding() {
  const { user, setProfile } = useAuth()
  const [name, setName] = useState('')
  const [churchName, setChurchName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) { setError('Please enter your name'); return }
    setError('')
    setLoading(true)
    try {
      const profile = await createProfile(user.id, name.trim(), churchName.trim())
      setProfile(profile)
    } catch (err) {
      setError(err.message || 'Something went wrong')
      setLoading(false)
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
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🎸</div>
          <div style={{ fontFamily: 'var(--font-head)', fontSize: 24, fontWeight: 800, color: 'var(--text)' }}>
            Welcome to WorshipFlow!
          </div>
          <div style={{ fontSize: 14, color: 'var(--muted)', marginTop: 8 }}>
            Let's set up your account
          </div>
        </div>

        <div className="card" style={{ padding: 32 }}>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Your Name</label>
              <input
                type="text"
                placeholder="e.g. Daniel"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                style={{ width: '100%' }}
                autoFocus
              />
            </div>
            <div className="form-group" style={{ marginBottom: 28 }}>
              <label className="form-label">Church Name</label>
              <input
                type="text"
                placeholder="e.g. Calvary Chapel"
                value={churchName}
                onChange={e => setChurchName(e.target.value)}
                style={{ width: '100%' }}
              />
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>
                You can change this anytime in Settings
              </div>
            </div>

            {error && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#ef4444', marginBottom: 16 }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%', justifyContent: 'center', fontSize: 14, padding: '10px 0' }}
            >
              {loading ? '...' : 'Get Started →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
