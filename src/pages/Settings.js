import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { updateProfile, signOut, getChurchMembers, updateMemberRole, removeMember, leaveChurch, regenerateInviteToken, deleteOwnAccount, getChurchByShortCode, joinChurchByShortCode, setActiveChurchDB } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

export default function Settings({ theme, setTheme, user }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { profile, setProfile, churches, activeChurch, setActiveChurch, refreshChurches, setLanguage } = useAuth()
  const [name, setName] = useState(profile?.name || '')
  const [churchName, setChurchName] = useState(profile?.church_name || '')
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [members, setMembers] = useState([])
  const [membersLoading, setMembersLoading] = useState(false)
  const [church, setChurch] = useState(activeChurch)

  const isAdmin = activeChurch?.role === 'admin'

  useEffect(() => {
    setChurch(activeChurch)
    if (activeChurch?.id) {
      setMembersLoading(true)
      getChurchMembers(activeChurch.id)
        .then(m => setMembers(m))
        .catch(() => {})
        .finally(() => setMembersLoading(false))
    }
  }, [activeChurch?.id])

  const saveSettings = async () => {
    setSaving(true)
    try {
      const updated = await updateProfile(user.id, { name, churchName })
      setProfile(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      alert(t('errors.saveFailed', { msg: e.message }))
    }
    setSaving(false)
  }

  const bandLink = church?.short_code
    ? `${window.location.origin}/band?c=${church.short_code}`
    : `${window.location.origin}/band`

  const recommendLink = church?.short_code
    ? `${window.location.origin}/recommend?c=${church.short_code}`
    : `${window.location.origin}/recommend`

  const inviteLink = church?.invite_token
    ? `${window.location.origin}/join/${church.invite_token}`
    : ''

  const [deletingAccount, setDeletingAccount] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [joinPreview, setJoinPreview] = useState(null)
  const [joiningChurch, setJoiningChurch] = useState(false)
  const [joinError, setJoinError] = useState('')

  const handleJoinCodeChange = async (val) => {
    setJoinCode(val)
    setJoinPreview(null)
    setJoinError('')
    if (val.trim().length >= 6) {
      try {
        const c = await getChurchByShortCode(val.trim())
        setJoinPreview(c)
      } catch { /* ignore */ }
    }
  }

  const handleJoinChurch = async () => {
    if (!joinPreview) return
    setJoiningChurch(true)
    setJoinError('')
    try {
      await joinChurchByShortCode(joinCode.trim())
      await setActiveChurchDB(user.id, joinPreview.id)
      await refreshChurches()
      setJoinCode('')
      setJoinPreview(null)
    } catch (e) {
      setJoinError(e.message || t('settings.failedToJoin'))
    }
    setJoiningChurch(false)
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(t('settings.deleteAccountConfirm'))
    if (!confirmed) return
    const doubleConfirmed = window.confirm(t('settings.deleteAccountConfirm2'))
    if (!doubleConfirmed) return
    setDeletingAccount(true)
    try {
      await deleteOwnAccount()
      await signOut()
    } catch (e) {
      alert(t('errors.generic', { msg: e.message }))
      setDeletingAccount(false)
    }
  }

  const handleRegenerateInvite = async () => {
    if (!window.confirm(t('settings.regenerateConfirm'))) return
    try {
      const updated = await regenerateInviteToken(church.id)
      setChurch(updated)
      await refreshChurches()
    } catch (e) {
      alert(t('errors.generic', { msg: e.message }))
    }
  }

  const handleRoleChange = async (memberId, newRole) => {
    try {
      await updateMemberRole(church.id, memberId, newRole)
      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: newRole } : m))
    } catch (e) {
      alert(t('errors.generic', { msg: e.message }))
    }
  }

  const handleRemoveMember = async (memberId) => {
    if (!window.confirm(t('settings.removeMemberConfirm'))) return
    try {
      await removeMember(church.id, memberId)
      setMembers(prev => prev.filter(m => m.id !== memberId))
    } catch (e) {
      alert(t('errors.generic', { msg: e.message }))
    }
  }

  const handleSwitchChurch = async (c) => {
    await setActiveChurch(c)
  }

  const handleLeaveChurch = async () => {
    if (!window.confirm(t('settings.leaveChurchConfirm', { name: activeChurch?.name }))) return
    try {
      await leaveChurch(activeChurch.id)
      await refreshChurches()
    } catch (e) {
      alert(t('errors.generic', { msg: e.message }))
    }
  }

  return (
    <div style={{ maxWidth: 560 }}>

      {/* APPEARANCE */}
      <div style={{ fontFamily: 'var(--font-head)', fontSize: 16, fontWeight: 600, marginBottom: 16 }}>{t('settings.appearance')}</div>
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 500 }}>{t('settings.theme')}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{t('settings.themeDesc')}</div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => setTheme('dark')} className={`btn btn-sm ${theme === 'dark' ? 'btn-primary' : 'btn-ghost'}`}>{t('settings.darkMode')}</button>
            <button onClick={() => setTheme('light')} className={`btn btn-sm ${theme === 'light' ? 'btn-primary' : 'btn-ghost'}`}>{t('settings.lightMode')}</button>
          </div>
        </div>
      </div>

      {/* LANGUAGE */}
      <div style={{ fontFamily: 'var(--font-head)', fontSize: 16, fontWeight: 600, marginBottom: 16 }}>{t('settings.language')}</div>
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 500 }}>{t('settings.language')}</div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => setLanguage('en')}
              className={`btn btn-sm ${profile?.preferred_language !== 'es' ? 'btn-primary' : 'btn-ghost'}`}
            >{t('settings.english')}</button>
            <button
              onClick={() => setLanguage('es')}
              className={`btn btn-sm ${profile?.preferred_language === 'es' ? 'btn-primary' : 'btn-ghost'}`}
            >{t('settings.spanish')}</button>
          </div>
        </div>
      </div>

      {/* CONNECTIONS */}
      <div style={{ fontFamily: 'var(--font-head)', fontSize: 16, fontWeight: 600, marginBottom: 16 }}>{t('settings.connections')}</div>
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: '#25D366', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>💬</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 500 }}>WhatsApp</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>{t('settings.whatsappDesc')}</div>
          </div>
          <span style={{ fontSize: 12, color: 'var(--green)' }}>{t('settings.whatsappReady')}</span>
        </div>
      </div>

      {/* BAND VIEW LINK */}
      <div style={{ fontFamily: 'var(--font-head)', fontSize: 16, fontWeight: 600, marginBottom: 16 }}>{t('settings.bandViewLink')}</div>
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 10 }}>{t('settings.bandViewLinkDesc')}</div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ flex: 1, background: 'var(--bg3)', borderRadius: 8, padding: '9px 12px', fontSize: 13, color: 'var(--accent)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {bandLink}
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => { navigator.clipboard.writeText(bandLink); alert(t('common.copied')) }}>{t('common.copy')}</button>
        </div>
      </div>

      {/* SONG RECOMMENDATIONS LINK */}
      <div style={{ fontFamily: 'var(--font-head)', fontSize: 16, fontWeight: 600, marginBottom: 16 }}>{t('settings.songRecommendLink')}</div>
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 10 }}>{t('settings.songRecommendLinkDesc')}</div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ flex: 1, background: 'var(--bg3)', borderRadius: 8, padding: '9px 12px', fontSize: 13, color: 'var(--accent)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {recommendLink}
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => { navigator.clipboard.writeText(recommendLink); alert(t('common.copied')) }}>{t('common.copy')}</button>
        </div>
      </div>

      {/* TEAM */}
      {activeChurch?.id && (
        <>
          <div style={{ fontFamily: 'var(--font-head)', fontSize: 16, fontWeight: 600, marginBottom: 16 }}>{t('settings.teamMembers')}</div>
          <div className="card" style={{ marginBottom: 24 }}>
            {membersLoading ? (
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>{t('common.loading')}</div>
            ) : members.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>{t('settings.noMembersFound')}</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {members.map(m => (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff', fontSize: 14, flexShrink: 0 }}>
                      {(m.name || m.id)?.[0]?.toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500, fontSize: 14 }}>{m.name || 'Unknown'} {m.id === user.id ? <span style={{ fontSize: 11, color: 'var(--muted)' }}>{t('settings.you')}</span> : ''}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>{m.role}</div>
                    </div>
                    {isAdmin && m.id !== user.id && (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleRoleChange(m.id, m.role === 'admin' ? 'editor' : 'admin')}
                          style={{ fontSize: 11 }}
                        >
                          {m.role === 'admin' ? t('settings.makeEditor') : t('settings.makeAdmin')}
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleRemoveMember(m.id)}
                          style={{ fontSize: 11, color: '#ef4444' }}
                        >
                          {t('common.remove')}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {isAdmin && (
              <div style={{ borderTop: '1px solid var(--border)', marginTop: 20, paddingTop: 20 }}>
                <div style={{ fontWeight: 500, fontSize: 14, marginBottom: 8 }}>{t('settings.inviteCode')}</div>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 10 }}>
                  {t('settings.inviteCodeDesc')}
                </div>
                {/* Short code */}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: '9px 16px', fontSize: 20, fontWeight: 700, letterSpacing: '0.15em', color: 'var(--text)', fontFamily: 'monospace' }}>
                    {church?.short_code || '—'}
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => { navigator.clipboard.writeText(church?.short_code || ''); alert(t('settings.codeCopied')) }}>{t('settings.copyCode')}</button>
                </div>
                {/* Full link */}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <div style={{ flex: 1, background: 'var(--bg3)', borderRadius: 8, padding: '9px 12px', fontSize: 12, color: 'var(--accent)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {inviteLink}
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => { navigator.clipboard.writeText(inviteLink); alert(t('common.copied')) }}>{t('settings.copyLink')}</button>
                  <button className="btn btn-ghost btn-sm" onClick={handleRegenerateInvite} style={{ color: 'var(--muted)' }}>{t('settings.regenerate')}</button>
                </div>
              </div>
            )}

            {!isAdmin && (
              <div style={{ borderTop: '1px solid var(--border)', marginTop: 20, paddingTop: 20 }}>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={handleLeaveChurch}
                  style={{ color: '#ef4444' }}
                >
                  {t('settings.leaveChurchName', { name: activeChurch?.name })}
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* YOUR CHURCHES */}
      {churches && churches.length > 0 && (
        <>
          <div style={{ fontFamily: 'var(--font-head)', fontSize: 16, fontWeight: 600, marginBottom: 16 }}>{t('settings.yourChurches')}</div>
          <div className="card" style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {churches.map(c => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.id === activeChurch?.id ? 'var(--accent)' : 'var(--border)', flexShrink: 0 }} />
                  <div style={{ flex: 1, fontWeight: c.id === activeChurch?.id ? 600 : 400, fontSize: 14 }}>
                    {c.name} {c.id === activeChurch?.id && <span style={{ fontSize: 11, color: 'var(--muted)' }}>{t('settings.activeLabel')}</span>}
                  </div>
                  {c.id !== activeChurch?.id && (
                    <button className="btn btn-ghost btn-sm" onClick={() => handleSwitchChurch(c)}>{t('settings.switch')}</button>
                  )}
                </div>
              ))}
            </div>
            {churches.length === 1 && (
              <div style={{ marginTop: 12, fontSize: 12, color: 'var(--muted)' }}>
                {t('settings.servingAtMultiple')}
              </div>
            )}
          </div>
        </>
      )}

      {/* JOIN A CHURCH */}
      <div style={{ fontFamily: 'var(--font-head)', fontSize: 16, fontWeight: 600, marginBottom: 16 }}>{t('settings.joinAChurch')}</div>
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12 }}>
          {t('settings.joinDesc')}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 140 }}>
            <input
              type="text"
              placeholder={t('settings.codePlaceholder')}
              value={joinCode}
              onChange={e => handleJoinCodeChange(e.target.value.toUpperCase())}
              style={{ width: '100%', fontFamily: 'monospace', letterSpacing: '0.1em', textTransform: 'uppercase' }}
              maxLength={8}
            />
            {joinPreview && (
              <div style={{ marginTop: 6, fontSize: 13, color: 'var(--green)' }}>{t('settings.foundChurch', { name: joinPreview.name })}</div>
            )}
            {joinCode.length >= 6 && !joinPreview && (
              <div style={{ marginTop: 6, fontSize: 13, color: 'var(--muted)' }}>{t('settings.noChurchFound')}</div>
            )}
            {joinError && <div style={{ marginTop: 6, fontSize: 13, color: '#ef4444' }}>{joinError}</div>}
          </div>
          <button
            className="btn btn-primary btn-sm"
            onClick={handleJoinChurch}
            disabled={!joinPreview || joiningChurch}
            style={{ flexShrink: 0 }}
          >
            {joiningChurch ? t('settings.joiningDots') : t('joinChurch.join')}
          </button>
        </div>
      </div>

      {/* CHURCH INFO / MY INFO */}
      <div style={{ fontFamily: 'var(--font-head)', fontSize: 16, fontWeight: 600, marginBottom: 16 }}>{isAdmin ? t('settings.churchInfo') : t('settings.myInfo')}</div>
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="form-group">
          <label className="form-label">{isAdmin ? t('settings.worshipDirectorName') : t('settings.teamMemberName')}</label>
          <input type="text" placeholder={t('settings.yourName')} value={name} onChange={e => setName(e.target.value)} style={{ width: '100%' }} />
        </div>
        {isAdmin && (
          <div className="form-group">
            <label className="form-label">{t('settings.churchNameLabel')}</label>
            <input type="text" placeholder={t('settings.churchNamePlaceholder')} value={churchName} onChange={e => setChurchName(e.target.value)} style={{ width: '100%' }} />
          </div>
        )}
        <button className="btn btn-primary btn-sm" onClick={saveSettings} disabled={saving}>
          {saved ? t('settings.savedConfirm') : saving ? t('common.saving') : t('settings.saveSettings')}
        </button>
      </div>

      {/* ACCOUNT */}
      <div style={{ fontFamily: 'var(--font-head)', fontSize: 16, fontWeight: 600, marginBottom: 16 }}>{t('settings.account')}</div>
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 500 }}>{t('settings.signedInAs')}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{user?.email}</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={handleSignOut} style={{ color: '#ef4444' }}>
            {t('nav.signOut')}
          </button>
        </div>
      </div>

      {/* DANGER ZONE */}
      <div style={{ fontFamily: 'var(--font-head)', fontSize: 16, fontWeight: 600, marginBottom: 16, color: '#ef4444' }}>{t('settings.dangerZone')}</div>
      <div className="card" style={{ border: '1px solid rgba(239,68,68,0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 500 }}>{t('settings.deleteAccount')}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
              {t('settings.deleteAccountDesc')}
            </div>
          </div>
          <button
            className="btn btn-sm"
            onClick={handleDeleteAccount}
            disabled={deletingAccount}
            style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', flexShrink: 0 }}
          >
            {deletingAccount ? t('settings.deletingDots') : t('settings.deleteAccount')}
          </button>
        </div>
      </div>

      <div style={{ marginTop: 40, paddingTop: 24, borderTop: '1px solid var(--border)', textAlign: 'center', fontSize: 11, color: 'var(--muted)', opacity: 0.6, letterSpacing: '0.03em' }}>
        © {new Date().getFullYear()} WorshipFlow · Designed &amp; built by Daniel Uribe
      </div>
    </div>
  )
}
