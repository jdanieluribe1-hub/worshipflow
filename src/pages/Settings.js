import React, { useState } from 'react'
import { updateProfile, signOut } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

export default function Settings({ theme, setTheme, user }) {
  const { profile, setProfile } = useAuth()
  const [name, setName] = useState(profile?.name || '')
  const [churchName, setChurchName] = useState(profile?.church_name || '')
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

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

  const bandLink = profile?.band_token
    ? `${window.location.origin}/band/${profile.band_token}`
    : `${window.location.origin}/band`

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <div style={{ maxWidth:560 }}>

      {/* APPEARANCE */}
      <div style={{ fontFamily:'var(--font-head)', fontSize:16, fontWeight:600, marginBottom:16 }}>Appearance</div>
      <div className="card" style={{ marginBottom:24 }}>
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:500 }}>Theme</div>
            <div style={{ fontSize:12, color:'var(--muted)', marginTop:2 }}>Choose how WorshipFlow looks</div>
          </div>
          <div style={{ display:'flex', gap:6 }}>
            <button
              onClick={() => setTheme('dark')}
              className={`btn btn-sm ${theme === 'dark' ? 'btn-primary' : 'btn-ghost'}`}
            >
              🌙 Dark
            </button>
            <button
              onClick={() => setTheme('light')}
              className={`btn btn-sm ${theme === 'light' ? 'btn-primary' : 'btn-ghost'}`}
            >
              ☀️ Light
            </button>
          </div>
        </div>
      </div>

      {/* CONNECTIONS */}
      <div style={{ fontFamily:'var(--font-head)', fontSize:16, fontWeight:600, marginBottom:16 }}>Connections</div>
      <div className="card" style={{ marginBottom:24 }}>
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ width:40,height:40,borderRadius:10,background:'#25D366',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20 }}>💬</div>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:500 }}>WhatsApp</div>
            <div style={{ fontSize:12,color:'var(--muted)' }}>One-tap message generation — always ready</div>
          </div>
          <span style={{ fontSize:12, color:'var(--green)' }}>● Ready</span>
        </div>
      </div>

      {/* BAND VIEW LINK */}
      <div style={{ fontFamily:'var(--font-head)', fontSize:16, fontWeight:600, marginBottom:16 }}>Band View Link</div>
      <div className="card" style={{ marginBottom:24 }}>
        <div style={{ fontSize:13, color:'var(--muted)', marginBottom:10 }}>Share this link with your team. It shows this week's chord charts and lyrics — no login needed.</div>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          <div style={{ flex:1, background:'var(--bg3)', borderRadius:8, padding:'9px 12px', fontSize:13, color:'var(--accent)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {bandLink}
          </div>
          <button className="btn btn-ghost btn-sm" onClick={()=>{navigator.clipboard.writeText(bandLink);alert('Link copied!')}}>Copy</button>
        </div>
      </div>

      {/* SONG RECOMMENDATIONS LINK */}
      <div style={{ fontFamily:'var(--font-head)', fontSize:16, fontWeight:600, marginBottom:16 }}>Song Recommendations Link</div>
      <div className="card" style={{ marginBottom:24 }}>
        <div style={{ fontSize:13, color:'var(--muted)', marginBottom:10 }}>Share this link with your congregation. They can suggest songs, share the message behind them, and include a Spotify or YouTube link.</div>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          <div style={{ flex:1, background:'var(--bg3)', borderRadius:8, padding:'9px 12px', fontSize:13, color:'var(--accent)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {`${window.location.origin}/recommend`}
          </div>
          <button className="btn btn-ghost btn-sm" onClick={()=>{navigator.clipboard.writeText(`${window.location.origin}/recommend`);alert('Link copied!')}}>Copy</button>
        </div>
      </div>

      {/* CHURCH INFO */}
      <div style={{ fontFamily:'var(--font-head)', fontSize:16, fontWeight:600, marginBottom:16 }}>Church Info</div>
      <div className="card" style={{ marginBottom:24 }}>
        <div className="form-group">
          <label className="form-label">Worship Director Name</label>
          <input type="text" placeholder="Your name" value={name} onChange={e=>setName(e.target.value)} style={{ width:'100%' }} />
        </div>
        <div className="form-group">
          <label className="form-label">Church Name</label>
          <input type="text" placeholder="e.g. Calvary Chapel" value={churchName} onChange={e=>setChurchName(e.target.value)} style={{ width:'100%' }} />
        </div>
        <button className="btn btn-primary btn-sm" onClick={saveSettings} disabled={saving}>
          {saved ? '✓ Saved!' : saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {/* ACCOUNT */}
      <div style={{ fontFamily:'var(--font-head)', fontSize:16, fontWeight:600, marginBottom:16 }}>Account</div>
      <div className="card">
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:500 }}>Signed in as</div>
            <div style={{ fontSize:12, color:'var(--muted)', marginTop:2 }}>{user?.email}</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={handleSignOut} style={{ color:'var(--danger, #ef4444)' }}>
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}
