import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, useNavigate } from 'react-router-dom'
import { getChurchByInviteToken, joinChurchByToken, setActiveChurchDB } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

export default function JoinChurch() {
  const { t } = useTranslation()
  const { token } = useParams()
  const navigate = useNavigate()
  const { user, loading: authLoading, refreshChurches } = useAuth()
  const [church, setChurch] = useState(null)
  const [fetching, setFetching] = useState(true)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState('')
  const [joined, setJoined] = useState(false)

  useEffect(() => {
    if (!token) { setFetching(false); return }
    getChurchByInviteToken(token)
      .then(c => setChurch(c))
      .catch(() => setChurch(null))
      .finally(() => setFetching(false))
  }, [token])

  const handleJoin = async () => {
    setError('')
    setJoining(true)
    try {
      await joinChurchByToken(token)
      await setActiveChurchDB(user.id, church.id)
      await refreshChurches()
      setJoined(true)
      setTimeout(() => navigate('/'), 1500)
    } catch (err) {
      setError(err.message || t('settings.failedToJoin'))
      setJoining(false)
    }
  }

  const handleSignUpToJoin = () => {
    // Store token in sessionStorage so it survives the email confirmation redirect
    sessionStorage.setItem('pendingJoinToken', token)
    navigate(`/signup?join=${token}`)
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
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontFamily: 'var(--font-head)', fontSize: 28, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.5px' }}>
            WorshipFlow
          </div>
        </div>

        <div className="card" style={{ padding: 32, textAlign: 'center' }}>
          {!authLoading && fetching && (
            <div style={{ color: 'var(--muted)', fontSize: 14 }}>{t('joinChurch.lookingUpInvite')}</div>
          )}

          {!fetching && !church && (
            <>
              <div style={{ fontSize: 40, marginBottom: 16 }}>🔗</div>
              <div style={{ fontFamily: 'var(--font-head)', fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
                {t('joinChurch.invalidLink')}
              </div>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                {t('joinChurch.invalidLinkDesc')}
              </div>
            </>
          )}

          {!fetching && church && !joined && (
            <>
              <div style={{ fontSize: 40, marginBottom: 16 }}>🏛</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 6 }}>{t('joinChurch.youveBeenInvited')}</div>
              <div style={{ fontFamily: 'var(--font-head)', fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 24 }}>
                {church.name}
              </div>

              {!authLoading && !user && (
                <>
                  <button
                    onClick={handleSignUpToJoin}
                    className="btn btn-primary"
                    style={{ width: '100%', justifyContent: 'center', fontSize: 14, padding: '10px 0', marginBottom: 12 }}
                  >
                    {t('joinChurch.signUpToJoin', { name: church.name })}
                  </button>
                  <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                    {t('auth.haveAccount')}{' '}
                    <span
                      style={{ color: 'var(--accent)', cursor: 'pointer' }}
                      onClick={() => navigate(`/?join=${token}`)}
                    >
                      {t('auth.signInLink')}
                    </span>
                  </div>
                </>
              )}

              {!authLoading && user && (
                <>
                  {error && (
                    <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#ef4444', marginBottom: 16 }}>
                      {error}
                    </div>
                  )}
                  <button
                    onClick={handleJoin}
                    disabled={joining}
                    className="btn btn-primary"
                    style={{ width: '100%', justifyContent: 'center', fontSize: 14, padding: '10px 0' }}
                  >
                    {joining ? t('onboarding.joining') : t('onboarding.joinChurchName', { name: church.name })}
                  </button>
                </>
              )}
            </>
          )}

          {joined && (
            <>
              <div style={{ fontSize: 40, marginBottom: 16 }}>✓</div>
              <div style={{ fontFamily: 'var(--font-head)', fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
                {t('joinChurch.joinedTitle', { name: church?.name })}
              </div>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>{t('joinChurch.redirecting')}</div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
