import React, { useState, useEffect } from 'react'
import { updateProfile, signOut, getChurchMembers, updateMemberRole, removeMember, regenerateInviteToken, deleteOwnAccount } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

export default function Settings({ theme, setTheme, user }) {
  const { profile, setProfile, churches, activeChurch, setActiveChurch, refreshChurches } = useAuth()
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
    if (activeChurch?.id && isAdmin) {
      setMembersLoading(true)
      getChurchMembers(activeChurch.id)
        .then(m => setMembers(m))
        .catch(() => {})
        .finally(() => setMembersLoading(false))
    }
  }, [activeChurch?.id, isAdmin])

  const saveSettings = async () => {
    setSaving(true)
    try {
      const updated = await updateProfile(user.id, { name, churchName })
      setProfile(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      alert('Error saving: ' + e.message)
    }
    setSaving(false)
  }

  const bandLink = church?.band_token
    ? `${window.location.origin}/band/${church.band_token}`
    : `${window.location.origin}/band`

  const recommendLink = church?.id
    ? `${window.location.origin}/recommend?church=${church.id}&name=${encodeURIComponent(church.name || '')}`
    : `${window.location.origin}/recommend`

  const inviteLink = church?.invite_token
    ? `${window.location.origin}/join/${church.invite_token}`
    : ''

  const [deletingAccount, setDeletingAccount] = useState(false)

  const handleSignOut = async () => {
    await signOut()
  }

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      'This will permanently delete your account and all data associated with it. This cannot be undone.\n\nAre you sure?'
    )
    if (!confirmed) return
    const doubleConfirmed = window.confirm('Last chance — delete your account forever?')
    if (!doubleConfirmed) return
    setDeletingAccount(true)
    try {
      await deleteOwnAccount()
      await signOut()
    } catch (e) {
      alert('Error deleting account: ' + e.message)
      setDeletingAccount(false)
    }
  }

  const handleRegenerateInvite = async () => {
    if (!window.confirm('This will invalidate the current invite link. Continue?')) return
    try {
      const updated = await regenerateInviteToken(church.id)
      setChurch(updated)
      await refreshChurches()
    } catch (e) {
      alert('Error: ' + e.message)
    }
  }

  const handleRoleChange = async (memberId, newRole) => {
    try {
      await updateMemberRole(church.id, memberId, newRole)
      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: newRole } : m))
    } catch (e) {
      alert('Error: ' + e.message)
    }
  }

  const handleRemoveMember = async (memberId) => {
    if (!window.confirm('Remove this member from the church?')) return
    try {
      await removeMember(church.id, memberId)
      setMembers(prev => prev.filter(m => m.id !== memberId))
    } catch (e) {
      alert('Error: ' + e.message)
    }
  }

  const handleSwitchChurch = async (c) => {
    await setActiveChurch(c)
  }

  return (
    <div style={{ maxWidth: 560 }}>

      {/* APPEARANCE */}
      <div style={{ fontFamily: 'var(--font-head)', fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Appearance</div>
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 500 }}>Theme</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>Choose how WorshipFlow looks</div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => setTheme('dark')} className={`btn btn-sm ${theme === 'dark' ? 'btn-primary' : 'btn-ghost'}`}>🌙 Dark</button>
            <button onClick={() => setTheme('light')} className={`btn btn-sm ${theme === 'light' ? 'btn-primary' : 'btn-ghost'}`}>☀️ Light</button>
          </div>
        </div>
      </div>

      {/* CONNECTIONS */}
      <div style={{ fontFamily: 'var(--font-head)', fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Connections</div>
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: '#25D366', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>💬</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 500 }}>WhatsApp</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>One-tap message generation — always ready</div>
          </div>
          <span style={{ fontSize: 12, color: 'var(--green)' }}>● Ready</span>
        </div>
      </div>

      {/* BAND VIEW LINK */}
      <div style={{ fontFamily: 'var(--font-head)', fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Band View Link</div>
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 10 }}>Share this with your team — shows this week's chord charts and lyrics with no login needed.</div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ flex: 1, background: 'var(--bg3)', borderRadius: 8, padding: '9px 12px', fontSize: 13, color: 'var(--accent)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {bandLink}
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => { navigator.clipboard.writeText(bandLink); alert('Copied!') }}>Copy</button>
        </div>
      </div>

      {/* SONG RECOMMENDATIONS LINK */}
      <div style={{ fontFamily: 'var(--font-head)', fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Song Recommendations Link</div>
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 10 }}>Share with your congregation so they can suggest songs.</div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ flex: 1, background: 'var(--bg3)', borderRadius: 8, padding: '9px 12px', fontSize: 13, color: 'var(--accent)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {recommendLink}
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => { navigator.clipboard.writeText(recommendLink); alert('Copied!') }}>Copy</button>
        </div>
      </div>

      {/* TEAM (admin only) */}
      {isAdmin && (
        <>
          <div style={{ fontFamily: 'var(--font-head)', fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Team Members</div>
          <div className="card" style={{ marginBottom: 24 }}>
            {membersLoading ? (
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>Loading...</div>
            ) : members.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>No members found</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {members.map(m => (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff', fontSize: 14, flexShrink: 0 }}>
                      {(m.name || m.id)?.[0]?.toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500, fontSize: 14 }}>{m.name || 'Unknown'} {m.id === user.id ? <span style={{ fontSize: 11, color: 'var(--muted)' }}>(you)</span> : ''}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>{m.role}</div>
                    </div>
                    {m.id !== user.id && (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleRoleChange(m.id, m.role === 'admin' ? 'editor' : 'admin')}
                          style={{ fontSize: 11 }}
                        >
                          {m.role === 'admin' ? 'Make Editor' : 'Make Admin'}
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleRemoveMember(m.id)}
                          style={{ fontSize: 11, color: '#ef4444' }}
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div style={{ borderTop: '1px solid var(--border)', marginTop: 20, paddingTop: 20 }}>
              <div style={{ fontWeight: 500, fontSize: 14, marginBottom: 8 }}>Invite Link</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 10 }}>
                Share this link to invite others to join {church?.name}. Regenerating invalidates the old link.
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ flex: 1, background: 'var(--bg3)', borderRadius: 8, padding: '9px 12px', fontSize: 12, color: 'var(--accent)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {inviteLink}
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => { navigator.clipboard.writeText(inviteLink); alert('Copied!') }}>Copy</button>
                <button className="btn btn-ghost btn-sm" onClick={handleRegenerateInvite} style={{ color: 'var(--muted)' }}>Regenerate</button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* SWITCH CHURCH (if member of multiple) */}
      {churches && churches.length > 1 && (
        <>
          <div style={{ fontFamily: 'var(--font-head)', fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Your Churches</div>
          <div className="card" style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {churches.map(c => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.id === activeChurch?.id ? 'var(--accent)' : 'var(--border)', flexShrink: 0 }} />
                  <div style={{ flex: 1, fontWeight: c.id === activeChurch?.id ? 600 : 400, fontSize: 14 }}>
                    {c.name} {c.id === activeChurch?.id && <span style={{ fontSize: 11, color: 'var(--muted)' }}>(active)</span>}
                  </div>
                  {c.id !== activeChurch?.id && (
                    <button className="btn btn-ghost btn-sm" onClick={() => handleSwitchChurch(c)}>Switch</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* CHURCH INFO */}
      <div style={{ fontFamily: 'var(--font-head)', fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Church Info</div>
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="form-group">
          <label className="form-label">Worship Director Name</label>
          <input type="text" placeholder="Your name" value={name} onChange={e => setName(e.target.value)} style={{ width: '100%' }} />
        </div>
        <div className="form-group">
          <label className="form-label">Church Name</label>
          <input type="text" placeholder="e.g. Calvary Chapel" value={churchName} onChange={e => setChurchName(e.target.value)} style={{ width: '100%' }} />
        </div>
        <button className="btn btn-primary btn-sm" onClick={saveSettings} disabled={saving}>
          {saved ? '✓ Saved!' : saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {/* ACCOUNT */}
      <div style={{ fontFamily: 'var(--font-head)', fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Account</div>
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 500 }}>Signed in as</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{user?.email}</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={handleSignOut} style={{ color: '#ef4444' }}>
            Sign Out
          </button>
        </div>
      </div>

      {/* DANGER ZONE */}
      <div style={{ fontFamily: 'var(--font-head)', fontSize: 16, fontWeight: 600, marginBottom: 16, color: '#ef4444' }}>Danger Zone</div>
      <div className="card" style={{ border: '1px solid rgba(239,68,68,0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 500 }}>Delete Account</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
              Permanently deletes your account and all associated data. This cannot be undone.
            </div>
          </div>
          <button
            className="btn btn-sm"
            onClick={handleDeleteAccount}
            disabled={deletingAccount}
            style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', flexShrink: 0 }}
          >
            {deletingAccount ? 'Deleting...' : 'Delete Account'}
          </button>
        </div>
      </div>
    </div>
  )
}
