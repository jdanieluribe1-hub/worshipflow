import React, { useState } from 'react'
import { getSpotifyAuthUrl, isSpotifyConnected, disconnectSpotify } from '../lib/spotify'

export default function Settings({ spotifyConnected, setSpotifyConnected }) {
  const [churchName, setChurchName] = useState(localStorage.getItem('wf_church_name') || '')
  const [directorName, setDirectorName] = useState(localStorage.getItem('wf_director_name') || '')
  const [saved, setSaved] = useState(false)

  const connected = isSpotifyConnected()

  const connectSpotify = () => {
    window.location.href = getSpotifyAuthUrl()
  }

  const handleDisconnect = () => {
    if (!window.confirm('Disconnect Spotify?')) return
    disconnectSpotify()
    setSpotifyConnected(false)
    window.location.reload()
  }

  const saveSettings = () => {
    localStorage.setItem('wf_church_name', churchName)
    localStorage.setItem('wf_director_name', directorName)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const bandLink = `${window.location.origin}/band`

  return (
    <div style={{ maxWidth:560 }}>

      {/* CONNECTIONS */}
      <div style={{ fontFamily:'var(--font-head)', fontSize:16, fontWeight:600, marginBottom:16 }}>Connections</div>

      <div className="card" style={{ marginBottom:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ width:40,height:40,borderRadius:10,background:'#1DB954',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20 }}>🎵</div>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:500 }}>Spotify</div>
            <div style={{ fontSize:12,color:'var(--muted)' }}>Auto-sync this week's playlist</div>
          </div>
          {connected ? (
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <span style={{ fontSize:12, color:'var(--green)' }}>● Connected</span>
              <button className="btn btn-ghost btn-sm" onClick={handleDisconnect}>Disconnect</button>
            </div>
          ) : (
            <button className="btn btn-ghost btn-sm" style={{ color:'#1DB954' }} onClick={connectSpotify}>Connect</button>
          )}
        </div>
      </div>

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
      <div className="card">
        <div className="form-group">
          <label className="form-label">Church Name</label>
          <input type="text" placeholder="e.g. Calvary Chapel" value={churchName} onChange={e=>setChurchName(e.target.value)} style={{ width:'100%' }} />
        </div>
        <div className="form-group">
          <label className="form-label">Worship Director</label>
          <input type="text" placeholder="Your name" value={directorName} onChange={e=>setDirectorName(e.target.value)} style={{ width:'100%' }} />
        </div>
        <button className="btn btn-primary btn-sm" onClick={saveSettings}>{saved ? '✓ Saved!' : 'Save Settings'}</button>
      </div>
    </div>
  )
}
