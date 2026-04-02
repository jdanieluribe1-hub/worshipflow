import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { createProfile, createChurch, joinChurchByToken, getChurchByInviteToken, setActiveChurchDB } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

export default function Onboarding() {
  const { user, setProfile, refreshChurches } = useAuth()
  const [searchParams] = useSearchParams()
  const [step, setStep] = useState(1) // 1 = name/church, 2 = create or join
  const [name, setName] = useState('')
  const [churchName, setChurchName] = useState('')
  const [joinMode, setJoinMode] = useState(false) // true = joining existing
  const [inviteInput, setInviteInput] = useState('')
  const [joinChurchPreview, setJoinChurchPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // If arriving from /signup?join=TOKEN, pre-populate invite and skip to join
  const pendingJoinToken = searchParams.get('join')
  useEffect(() => {
    if (pendingJoinToken) {
      setInviteInput(pendingJoinToken)
      setJoinMode(true)
      getChurchByInviteToken(pendingJoinToken).then(c => setJoinChurchPreview(c)).catch(() => {})
    }
  }, [pendingJoinToken])

  // Extract token from a full URL like https://app.com/join/TOKEN
  function extractToken(input) {
    try {
      const url = new URL(input)
      const parts = url.pathname.split('/')
      return parts[parts.length - 1] || input.trim()
    } catch {
      return input.trim()
    }
  }

  const handleInviteChange = async (val) => {
    setInviteInput(val)
    setJoinChurchPreview(null)
    const token = extractToken(val)
    if (token.length === 36) { // UUID length
      try {
        const c = await getChurchByInviteToken(token)
        setJoinChurchPreview(c)
      } catch { /* ignore */ }
    }
  }

  const handleStep1 = async (e) => {
    e.preventDefault()
    if (!name.trim()) { setError('Please enter your name'); return }
    setError('')
    // If arriving via invite link, auto-join immediately after name entry — skip step 2
    if (pendingJoinToken) {
      setLoading(true)
      try {
        const token = extractToken(pendingJoinToken)
        const profile = await createProfile(user.id, name.trim(), churchName.trim())
        await joinChurchByToken(token)
        const church = await getChurchByInviteToken(token)
        if (church) await setActiveChurchDB(user.id, church.id)
        const result = await refreshChurches()
        setProfile({ ...profile, active_church_id: result?.activeChurch?.id })
      } catch (err) {
        setError(err.message || 'Something went wrong')
        setLoading(false)
      }
      return
    }
    setStep(2)
  }

  const handleCreate = async () => {
    setError('')
    setLoading(true)
    try {
      const profile = await createProfile(user.id, name.trim(), churchName.trim())
      await createChurch(churchName.trim() || 'My Church')
      const result = await refreshChurches()
      setProfile({ ...profile, active_church_id: result?.activeChurch?.id })
    } catch (err) {
      setError(err.message || 'Something went wrong')
      setLoading(false)
    }
  }

  const handleJoin = async () => {
    const token = extractToken(inviteInput)
    if (!token) { setError('Please enter an invite link'); return }
    setError('')
    setLoading(true)
    try {
      const profile = await createProfile(user.id, name.trim(), churchName.trim())
      await joinChurchByToken(token)
      const church = await getChurchByInviteToken(token)
      if (church) await setActiveChurchDB(user.id, church.id)
      const result = await refreshChurches()
      setProfile({ ...profile, active_church_id: result?.activeChurch?.id })
    } catch (err) {
      setError(err.message || 'Failed to join church')
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
            {step === 1 ? "Let's set up your account" : "Set up your church"}
          </div>
        </div>

        {/* Step indicator — only show 2 dots when not on an invite link */}
        {!pendingJoinToken && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 28 }}>
            {[1, 2].map(s => (
              <div key={s} style={{
                width: 8, height: 8, borderRadius: '50%',
                background: step === s ? 'var(--accent)' : 'var(--border)',
                transition: 'background 0.2s',
              }} />
            ))}
          </div>
        )}

        <div className="card" style={{ padding: 32 }}>
          {step === 1 && (
            <form onSubmit={handleStep1}>
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
                <label className="form-label">Church Name <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(optional)</span></label>
                <input
                  type="text"
                  placeholder="e.g. Calvary Chapel"
                  value={churchName}
                  onChange={e => setChurchName(e.target.value)}
                  style={{ width: '100%' }}
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
                style={{ width: '100%', justifyContent: 'center', fontSize: 14, padding: '10px 0' }}
              >
                Continue →
              </button>
            </form>
          )}

          {step === 2 && !joinMode && (
            <div>
              <div style={{ fontFamily: 'var(--font-head)', fontSize: 16, fontWeight: 600, marginBottom: 20, color: 'var(--text)' }}>
                How would you like to get started?
              </div>

              <button
                onClick={handleCreate}
                disabled={loading}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                  width: '100%', background: 'var(--bg3)', border: '2px solid var(--border)',
                  borderRadius: 12, padding: '18px 20px', marginBottom: 12,
                  cursor: loading ? 'not-allowed' : 'pointer', textAlign: 'left',
                  transition: 'border-color 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                <div style={{ fontSize: 24, marginBottom: 6 }}>🏛</div>
                <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
                  {loading ? 'Creating...' : 'Create a new church'}
                </div>
                <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                  You'll be the admin — invite your team later
                </div>
              </button>

              <button
                onClick={() => { setJoinMode(true); setError('') }}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                  width: '100%', background: 'var(--bg3)', border: '2px solid var(--border)',
                  borderRadius: 12, padding: '18px 20px',
                  cursor: 'pointer', textAlign: 'left',
                  transition: 'border-color 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                <div style={{ fontSize: 24, marginBottom: 6 }}>🔗</div>
                <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>Join an existing church</div>
                <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                  Paste an invite link from your admin
                </div>
              </button>

              {error && (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#ef4444', marginTop: 16 }}>
                  {error}
                </div>
              )}
            </div>
          )}

          {step === 2 && joinMode && (
            <div>
              <button
                onClick={() => { setJoinMode(false); setError('') }}
                style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 13, cursor: 'pointer', padding: 0, marginBottom: 16 }}
              >
                ← Back
              </button>
              <div style={{ fontFamily: 'var(--font-head)', fontSize: 16, fontWeight: 600, marginBottom: 16, color: 'var(--text)' }}>
                Join an existing church
              </div>
              <div className="form-group" style={{ marginBottom: 20 }}>
                <label className="form-label">Invite link or token</label>
                <input
                  type="text"
                  placeholder="https://worshipflow.app/join/..."
                  value={inviteInput}
                  onChange={e => handleInviteChange(e.target.value)}
                  style={{ width: '100%' }}
                  autoFocus
                />
                {joinChurchPreview && (
                  <div style={{ marginTop: 8, fontSize: 13, color: 'var(--green)' }}>
                    ✓ Found: <strong>{joinChurchPreview.name}</strong>
                  </div>
                )}
                {inviteInput.length > 10 && !joinChurchPreview && (
                  <div style={{ marginTop: 8, fontSize: 13, color: 'var(--muted)' }}>
                    Church not found — check the link
                  </div>
                )}
              </div>

              {error && (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#ef4444', marginBottom: 16 }}>
                  {error}
                </div>
              )}

              <button
                onClick={handleJoin}
                disabled={loading || !joinChurchPreview}
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', fontSize: 14, padding: '10px 0' }}
              >
                {loading ? 'Joining...' : `Join ${joinChurchPreview?.name || 'Church'}`}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
