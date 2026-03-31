import React, { useState } from 'react'
import { upsertSet, finalizeSet } from '../lib/supabase'
import { syncWeeklyPlaylist, isSpotifyConnected } from '../lib/spotify'

function tempoEmoji(t) { return t==='Fast'?'⚡':t==='Medium'?'♩':'🎶' }

function getNextSunday() {
  const d = new Date()
  const day = d.getDay()
  const diff = day === 0 ? 0 : 7 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().slice(0, 10)
}

export default function ThisWeek({ songs, weekSongIds, setWeekSongIds, weekSongs, refreshSets, setPage, spotifyConnected }) {
  const [serviceDate, setServiceDate] = useState(getNextSunday())
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [finalizing, setFinalizing] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [waModal, setWaModal] = useState(false)
  const [spotifyUrl, setSpotifyUrl] = useState(null)

  const fast = weekSongs.filter(s=>s.tempo==='Fast').length
  const med = weekSongs.filter(s=>s.tempo==='Medium').length
  const slow = weekSongs.filter(s=>s.tempo==='Slow').length

  const saveSet = async () => {
    if (!weekSongIds.length) return alert('Add some songs first.')
    setSaving(true)
    try {
      await upsertSet(serviceDate, weekSongIds, notes)
      await refreshSets()
      alert('Set saved!')
    } catch(e) { alert('Error: ' + e.message) }
    setSaving(false)
  }

  const finalize = async () => {
    if (!weekSongIds.length) return alert('Add some songs first.')
    if (!window.confirm(`Finalize this set and log plays for ${serviceDate}?`)) return
    setFinalizing(true)
    try {
      await finalizeSet(serviceDate, weekSongIds)
      await refreshSets()
      setWeekSongIds([])
      setNotes('')
      alert('Set finalized! Play counts updated.')
    } catch(e) { alert('Error: ' + e.message) }
    setFinalizing(false)
  }

  const syncSpotify = async () => {
    if (!isSpotifyConnected()) return alert('Connect Spotify in Settings first.')
    setSyncing(true)
    try {
      const url = await syncWeeklyPlaylist(weekSongs, serviceDate)
      setSpotifyUrl(url)
      alert('Spotify playlist synced!')
    } catch(e) { alert('Spotify error: ' + e.message) }
    setSyncing(false)
  }

  const waMessage = () => {
    const date = new Date(serviceDate + 'T12:00:00').toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric', year:'numeric' })
    const bandLink = `${window.location.origin}/band`
    const recommendLink = `${window.location.origin}/recommend`
    return `*Worship Set — ${date}* 🎵\n\n${weekSongs.map((s,i)=>`${i+1}. *${s.title}* — ${s.artist||''}\n   Key: ${s.key} | ${s.tempo}`).join('\n\n')}\n\n📋 Chord Charts & Lyrics:\n${bandLink}${spotifyUrl?`\n\n🎵 Spotify Playlist:\n${spotifyUrl}`:''}\n\n💡 Have a song you'd like me to listen to? Share it here:\n${recommendLink}\n\nSee you Sunday! 🙌`
  }

  return (
    <div>
      <div className="grid-2" style={{ marginBottom:24 }}>
        <div className="stat-card">
          <div className="stat-label">Service Date</div>
          <input type="date" value={serviceDate} onChange={e=>setServiceDate(e.target.value)} style={{ marginTop:4, width:'100%', fontSize:15 }} />
        </div>
        <div className="stat-card">
          <div className="stat-label">Tempo Mix</div>
          <div style={{ fontSize:15, fontWeight:500, marginTop:6, color:'var(--text)' }}>
            <span style={{ color:'var(--fast)' }}>{fast} fast</span> · <span style={{ color:'var(--medium)' }}>{med} mid</span> · <span style={{ color:'var(--slow)' }}>{slow} slow</span>
          </div>
          <div style={{ display:'flex',gap:3,height:6,borderRadius:6,overflow:'hidden',marginTop:8 }}>
            {fast>0&&<div style={{ flex:fast,background:'var(--fast)',opacity:0.7,borderRadius:6 }}/>}
            {med>0&&<div style={{ flex:med,background:'var(--medium)',opacity:0.7,borderRadius:6 }}/>}
            {slow>0&&<div style={{ flex:slow,background:'var(--slow)',opacity:0.7,borderRadius:6 }}/>}
          </div>
        </div>
      </div>

      {weekSongs.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📅</div>
          <div className="empty-text">No songs added yet<br />Go to the Library and press "+ Week" on songs</div>
          <button className="btn btn-ghost" style={{ marginTop:16 }} onClick={()=>setPage('library')}>Go to Library</button>
        </div>
      ) : (
        <>
          <div style={{ marginBottom:8 }}>
            <div className="form-label" style={{ marginBottom:8 }}>Set Order</div>
            {weekSongs.map((s,i) => (
              <div key={s.id} className="week-song">
                <div className="week-order">{i+1}</div>
                <div className="song-thumb" style={{ width:38,height:38 }}>{tempoEmoji(s.tempo)}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:500,fontSize:14 }}>{s.title}</div>
                  <div style={{ fontSize:12,color:'var(--muted)' }}>{s.artist} · Key of {s.key}</div>
                </div>
                <span className={`tag tag-${s.tempo?.toLowerCase()}`}>{s.tempo}</span>
                {s.pdf_url && <a href={s.pdf_url} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">📄</a>}
                <button className="btn btn-ghost btn-sm" style={{ color:'var(--red)' }} onClick={()=>setWeekSongIds(p=>p.filter(x=>x!==s.id))}>✕</button>
              </div>
            ))}
          </div>

          <div className="form-group" style={{ marginBottom:16 }}>
            <label className="form-label">Service Notes</label>
            <textarea placeholder="Any notes for this service..." value={notes} onChange={e=>setNotes(e.target.value)} style={{ width:'100%' }} />
          </div>

          <div className="divider" />

          <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
            <button className="btn btn-ghost" onClick={saveSet} disabled={saving}>{saving?'Saving...':'💾 Save Set'}</button>
            <button className="btn btn-gold" onClick={()=>setWaModal(true)}>📱 WhatsApp Message</button>
            <button className="btn btn-ghost" onClick={syncSpotify} disabled={syncing} style={{ color:'#1DB954' }}>
              {syncing?'Syncing...':'🎵 Sync Spotify'}
            </button>
            <button className="btn btn-primary" onClick={finalize} disabled={finalizing}>{finalizing?'Finalizing...':'✓ Finalize & Log Plays'}</button>
          </div>

          {spotifyUrl && (
            <div style={{ marginTop:12, padding:'10px 14px', background:'rgba(29,185,84,0.1)', borderRadius:8, fontSize:13 }}>
              Spotify playlist synced. <a href={spotifyUrl} target="_blank" rel="noreferrer" style={{ color:'#1DB954' }}>Open playlist →</a>
            </div>
          )}
        </>
      )}

      {waModal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setWaModal(false)}>
          <div className="modal">
            <div className="modal-title">WhatsApp Message</div>
            <div style={{ marginBottom:14, fontSize:13, color:'var(--muted)' }}>Copy and paste into your team group chat.</div>
            <div style={{ background:'#111b21', borderRadius:14, padding:20 }}>
              <div style={{ fontSize:11, color:'#8696a0', textAlign:'center', marginBottom:14 }}>
                {new Date().toLocaleDateString('en-US',{weekday:'long'})}
              </div>
              <div style={{ background:'#005c4b', borderRadius:'10px 10px 10px 2px', padding:'12px 14px', fontSize:13, lineHeight:1.6, color:'#e9edef', whiteSpace:'pre-wrap' }}
                dangerouslySetInnerHTML={{ __html: waMessage().replace(/\*(.*?)\*/g,'<b>$1</b>') }} />
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={()=>setWaModal(false)}>Close</button>
              <button className="btn btn-green" onClick={()=>{navigator.clipboard.writeText(waMessage());alert('Copied!')}}>Copy Message</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
