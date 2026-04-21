import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import {
  createProfile, createChurch,
  joinChurchByToken, getChurchByInviteToken,
  joinChurchByShortCode, getChurchByShortCode,
  setActiveChurchDB
} from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

export default function Onboarding() {
  const { t } = useTranslation()
  const { user, setProfile, refreshChurches } = useAuth()
  const [searchParams] = useSearchParams()
  const [step, setStep] = useState(1) // 1 = name/church, 2 = create or join
  const [name, setName] = useState('')
  const [churchName, setChurchName] = useState('')
  const [joinMode, setJoinMode] = useState(false) // true = joining existing
  const [inviteInput, setInviteInput] = useState('')
  const [joinChurchPreview, setJoinChurchPreview] = useState(null)
  const [inviteFormat, setInviteFormat] = useState(null) // 'token' | 'short_code' | null
  const [lookupLoading, setLookupLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // If arriving from /signup?join=TOKEN, pre-populate invite and skip to join
  // Also check sessionStorage as fallback (survives email confirmation redirects)
  const pendingJoinToken = searchParams.get('join') || sessionStorage.getItem('pendingJoinToken') || null
  useEffect(() => {
    if (pendingJoinToken) {
      setInviteInput(pendingJoinToken)
      setJoinMode(true)
      const token = extractToken(pendingJoinToken)
      if (token.length === 36) {
        getChurchByInviteToken(token).then(c => setJoinChurchPreview(c)).catch(() => {})
      } else if (/^[a-zA-Z0-9]{4,12}$/.test(token)) {
        getChurchByShortCode(token).then(c => setJoinChurchPreview(c)).catch(() => {})
      }
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

  function detectFormat(token) {
    if (token.length === 36) return 'token'
    if (/^[a-zA-Z0-9]{4,12}$/.test(token)) return 'short_code'
    return null
  }

  const handleInviteChange = async (val) => {
    setInviteInput(val)
    setJoinChurchPreview(null)
    setInviteFormat(null)
    const token = extractToken(val)
    const format = detectFormat(token)
    if (!format) return
    setLookupLoading(true)
    try {
      if (format === 'token') {
        const c = await getChurchByInviteToken(token)
        setJoinChurchPreview(c)
        setInviteFormat('token')
      } else {
        const c = await getChurchByShortCode(token)
        setJoinChurchPreview(c)
        setInviteFormat('short_code')
      }
    } catch { /* ignore */ } finally {
      setLookupLoading(false)
    }
  }

  // Helper used by both handleStep1 and handleJoin
  async function doJoin(rawToken, userId, nameVal, churchNameVal) {
    const token = extractToken(rawToken)
    const format = detectFormat(token)
    const profile = await createProfile(userId, nameVal, churchNameVal)
    if (format === 'short_code') {
      await joinChurchByShortCode(token)
      const church = await getChurchByShortCode(token)
      if (church) await setActiveChurchDB(userId, church.id)
    } else {
      await joinChurchByToken(token)
      const church = await getChurchByInviteToken(token)
      if (church) await setActiveChurchDB(userId, church.id)
    }
    sessionStorage.removeItem('pendingJoinToken')
    return profile
  }

  const handleStep1 = async (e) => {
    e.preventDefault()
    if (!name.trim()) { setError(t('onboarding.pleaseEnterName')); return }
    setError('')
    // If arriving via invite link, auto-join immediately after name entry — skip step 2
    if (pendingJoinToken) {
      setLoading(true)
      try {
        const profile = await doJoin(pendingJoinToken, user.id, name.trim(), '')
        const result = await refreshChurches()
        setProfile({ ...profile, active_church_id: result?.activeChurch?.id })
      } catch (err) {
        setError(err.message || t('onboarding.somethingWentWrong'))
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
      setError(err.message || t('onboarding.somethingWentWrong'))
      setLoading(false)
    }
  }

  const handleJoin = async () => {
    if (!joinChurchPreview) { setError(t('onboarding.pleaseEnterInvite')); return }
    setError('')
    setLoading(true)
    try {
      const profile = await doJoin(inviteInput, user.id, name.trim(), churchName.trim())
      const result = await refreshChurches()
      setProfile({ ...profile, active_church_id: result?.activeChurch?.id })
    } catch (err) {
      setError(err.message || t('onboarding.failedToJoinChurch'))
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
            {t('onboarding.welcome')}
          </div>
          <div style={{ fontSize: 14, color: 'var(--muted)', marginTop: 8 }}>
            {pendingJoinToken
              ? joinChurchPreview
                ? t('onboarding.invitedToJoinName', { name: joinChurchPreview.name })
                : t('onboarding.invitedToJoinGeneric')
              : step === 1 ? t('onboarding.setupAccount') : t('onboarding.setupChurch')}
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
                <label className="form-label">{t('onboarding.yourName')}</label>
                <input
                  type="text"
                  placeholder={t('onboarding.yourNamePlaceholder')}
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  style={{ width: '100%' }}
                  autoFocus
                />
              </div>
              {!pendingJoinToken && (
                <div className="form-group" style={{ marginBottom: 28 }}>
                  <label className="form-label">{t('onboarding.churchNameLabel')} <span style={{ color: 'var(--muted)', fontWeight: 400 }}>({t('common.optional')})</span></label>
                  <input
                    type="text"
                    placeholder={t('onboarding.churchNamePlaceholder2')}
                    value={churchName}
                    onChange={e => setChurchName(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>
              )}

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
                {loading ? t('onboarding.joining') : pendingJoinToken ? t('onboarding.joinChurchName', { name: joinChurchPreview?.name || t('onboarding.joinChurch') }) : t('onboarding.continue')}
              </button>
            </form>
          )}

          {step === 2 && !joinMode && (
            <div>
              <div style={{ fontFamily: 'var(--font-head)', fontSize: 16, fontWeight: 600, marginBottom: 20, color: 'var(--text)' }}>
                {t('onboarding.howGetStarted')}
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
                  {loading ? t('onboarding.creatingChurch') : t('onboarding.createChurch')}
                </div>
                <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                  {t('onboarding.adminDesc')}
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
                <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>{t('onboarding.joinExistingChurch')}</div>
                <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                  {t('onboarding.inviteOrCodeDesc')}
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
                {t('onboarding.backArrow')}
              </button>
              <div style={{ fontFamily: 'var(--font-head)', fontSize: 16, fontWeight: 600, marginBottom: 16, color: 'var(--text)' }}>
                {t('onboarding.joinExistingChurch')}
              </div>
              <div className="form-group" style={{ marginBottom: 20 }}>
                <label className="form-label">{t('onboarding.inviteOrCodeLabel')}</label>
                <input
                  type="text"
                  placeholder={t('onboarding.invitePlaceholder')}
                  value={inviteInput}
                  onChange={e => handleInviteChange(e.target.value)}
                  style={{ width: '100%' }}
                  autoFocus
                />
                {lookupLoading && (
                  <div style={{ marginTop: 8, fontSize: 12, color: 'var(--muted)' }}>{t('onboarding.lookingUp')}</div>
                )}
                {joinChurchPreview && (
                  <div style={{ marginTop: 8, fontSize: 13, color: 'var(--green)' }}>
                    {t('onboarding.churchFoundPreview', { name: joinChurchPreview.name })}
                  </div>
                )}
                {inviteInput.length > 3 && !lookupLoading && !joinChurchPreview && (
                  <div style={{ marginTop: 8, fontSize: 13, color: 'var(--muted)' }}>
                    {t('onboarding.churchNotFoundCode')}
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
                {loading ? t('onboarding.joining') : t('onboarding.joinChurchName', { name: joinChurchPreview?.name || t('onboarding.joinChurch') })}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
