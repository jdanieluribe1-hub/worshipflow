import React, { useState, useEffect, useRef } from 'react'
import { upsertSet, finalizeSet } from '../lib/supabase'
import { transposeLyrics } from '../lib/transpose'
import ChordDisplay from '../components/ChordDisplay'
import TransposeControl from '../components/TransposeControl'

function tempoEmoji(t) { return t==='Fast'?'⚡':t==='Medium'?'♩':'🎶' }

function getNextSunday() {
  const d = new Date()
  const day = d.getDay()
  const diff = day === 0 ? 0 : 7 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().slice(0, 10)
}

export default function ThisWeek({ songs, weekSongIds, setWeekSongIds, weekSongs, refreshSets, setPage, sets = [], activeChurch }) {
  const [serviceDate, setServiceDate] = useState(getNextSunday())
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [finalizing, setFinalizing] = useState(false)
  const [waModal, setWaModal] = useState(false)
  const [songSpotifyUrls, setSongSpotifyUrls] = useState({})
  const [songYoutubeUrls, setSongYoutubeUrls] = useState({})
  const [songAppleMusicUrls, setSongAppleMusicUrls] = useState({})
  const [dragIdx, setDragIdx] = useState(null)
  const [dragOverIdx, setDragOverIdx] = useState(null)
  const [keyOverrides, setKeyOverrides] = useState({})
  const [previewSong, setPreviewSong] = useState(null)

  useEffect(() => {
    const savedSet = sets.find(s => s.service_date === serviceDate)
    setKeyOverrides(savedSet?.key_overrides || {})
    const links = savedSet?.music_links || {}
    setSongSpotifyUrls(Object.fromEntries(Object.entries(links).map(([id, v]) => [id, v.spotify || ''])))
    setSongYoutubeUrls(Object.fromEntries(Object.entries(links).map(([id, v]) => [id, v.youtube || ''])))
    setSongAppleMusicUrls(Object.fromEntries(Object.entries(links).map(([id, v]) => [id, v.apple || ''])))
  }, [serviceDate, sets])

  const fast = weekSongs.filter(s=>s.tempo==='Fast').length
  const med = weekSongs.filter(s=>s.tempo==='Medium').length
  const slow = weekSongs.filter(s=>s.tempo==='Slow').length

  const effectiveKey = (s) => keyOverrides[s.id] || s.key

  const buildMusicLinks = () => {
    const ml = {}
    weekSongIds.forEach(id => {
      if (songSpotifyUrls[id] || songYoutubeUrls[id] || songAppleMusicUrls[id]) {
        ml[id] = { spotify: songSpotifyUrls[id] || '', youtube: songYoutubeUrls[id] || '', apple: songAppleMusicUrls[id] || '' }
      }
    })
    return ml
  }

  const handleDragStart = (i) => setDragIdx(i)
  const handleDragOver = (e, i) => { e.preventDefault(); setDragOverIdx(i) }
  const handleDrop = (i) => {
    if (dragIdx === null || dragIdx === i) { setDragIdx(null); setDragOverIdx(null); return }
    const newIds = [...weekSongIds]
    const [removed] = newIds.splice(dragIdx, 1)
    newIds.splice(i, 0, removed)
    setWeekSongIds(newIds)
    setDragIdx(null)
    setDragOverIdx(null)
  }
  const handleDragEnd = () => { setDragIdx(null); setDragOverIdx(null) }

  const touchDragRef = useRef({ active: false, startIdx: null, overIdx: null })

  const handleTouchStart = (e, i) => {
    touchDragRef.current = { active: true, startIdx: i, overIdx: i }
    setDragIdx(i)
  }
  const handleTouchMove = (e) => {
    if (!touchDragRef.current.active) return
    e.preventDefault()
    const touch = e.touches[0]
    let el = document.elementFromPoint(touch.clientX, touch.clientY)
    while (el && el.dataset.dragIndex === undefined) el = el.parentElement
    if (el && el.dataset.dragIndex !== undefined) {
      const over = parseInt(el.dataset.dragIndex)
      touchDragRef.current.overIdx = over
      setDragOverIdx(over)
    }
  }
  const handleTouchEnd = () => {
    if (!touchDragRef.current.active) return
    const { startIdx, overIdx } = touchDragRef.current
    touchDragRef.current = { active: false, startIdx: null, overIdx: null }
    if (overIdx !== null && startIdx !== overIdx) {
      const newIds = [...weekSongIds]
      const [removed] = newIds.splice(startIdx, 1)
      newIds.splice(overIdx, 0, removed)
      setWeekSongIds(newIds)
    }
    setDragIdx(null)
    setDragOverIdx(null)
  }

  const saveSet = async () => {
    if (!weekSongIds.length) return alert('Add some songs first.')
    setSaving(true)
    try {
      await upsertSet(activeChurch?.id, serviceDate, weekSongIds, notes, keyOverrides, buildMusicLinks())
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
      await finalizeSet(activeChurch?.id, serviceDate, weekSongIds, keyOverrides, buildMusicLinks())
      await refreshSets()
      setWeekSongIds([])
      setNotes('')
      setSongSpotifyUrls({})
      setSongYoutubeUrls({})
      setSongAppleMusicUrls({})
      setKeyOverrides({})
      alert('Set finalized! Play counts updated.')
    } catch(e) { alert('Error: ' + e.message) }
    setFinalizing(false)
  }

  const waMessage = (overrides = {}) => {
    const ids = overrides.songIds || weekSongIds
    const keys = overrides.keyOverrides || keyOverrides
    const spotify = overrides.spotify || songSpotifyUrls
    const youtube = overrides.youtube || songYoutubeUrls
    const apple = overrides.apple || songAppleMusicUrls
    const useSongs = ids.map(id => songs.find(s => s.id === id)).filter(Boolean)
    const date = new Date(serviceDate + 'T12:00:00').toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric', year:'numeric' })
    const bandLink = `${window.location.origin}/band`
    const recommendLink = `${window.location.origin}/recommend`
    const songLines = useSongs.map((s,i) => {
      const eff = keys[s.id] || s.key
      return `${i+1}. *${s.title}* — ${s.artist||''}\n   Key: ${eff} | ${s.tempo}${spotify[s.id] ? `\n   🎵 ${spotify[s.id]}` : ''}${youtube[s.id] ? `\n   ▶️ ${youtube[s.id]}` : ''}${apple[s.id] ? `\n   🍎 ${apple[s.id]}` : ''}`
    }).join('\n\n')
    return `*Worship Set — ${date}* 🎵\n\n${songLines}\n\n📋 Chord Charts & Lyrics:\n${bandLink}\n\n💡 Have a song you'd like me to listen to? Share it here:\n${recommendLink}\n\nSee you Sunday! 🙌`
  }

  return (
    <div>
      <div className="grid-2" style={{ marginBottom:24 }}>
        <div className="stat-card">
          <div className="stat-label">Service Date</div>
          <div style={{ display:'flex', justifyContent:'center', marginTop:4 }}>
            <input type="date" value={serviceDate} onChange={e=>setServiceDate(e.target.value)} style={{ width:'100%', maxWidth:'100%', fontSize:12, padding:'6px 8px', boxSizing:'border-box' }} />
          </div>
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
          <div className="empty-text">No songs added yet<br />Go to the Library and press "+ Set" on songs</div>
          <button className="btn btn-ghost" style={{ marginTop:16 }} onClick={()=>setPage('library')}>Go to Library</button>
        </div>
      ) : (
        <>
          <div style={{ marginBottom:8 }}>
            <div className="form-label" style={{ marginBottom:8 }}>Set Order <span style={{ fontSize:11, color:'var(--muted)', fontWeight:400 }}>— drag to reorder</span></div>
            {weekSongs.map((s,i) => (
              <div
                key={s.id}
                data-drag-index={i}
                draggable
                onDragStart={() => handleDragStart(i)}
                onDragOver={(e) => handleDragOver(e, i)}
                onDrop={() => handleDrop(i)}
                onDragEnd={handleDragEnd}
                onTouchStart={(e) => handleTouchStart(e, i)}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                style={{ marginBottom:4, opacity: dragIdx === i ? 0.4 : 1, transition:'opacity 0.15s', touchAction:'none' }}
              >
              <div className="week-song" style={{
                flexDirection:'column', gap:0, alignItems:'stretch',
                outline: dragOverIdx === i && dragIdx !== i ? '2px solid var(--accent)' : 'none',
                borderRadius:10, cursor:'grab',
              }}>
                {/* Row 1: number + thumb + title/artist + pdf + remove */}
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div className="week-order" style={{ cursor:'grab', userSelect:'none', flexShrink:0 }}>{i+1}</div>
                  <div className="song-thumb" style={{ width:36,height:36,flexShrink:0 }}>{tempoEmoji(s.tempo)}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:600,fontSize:14,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{s.title}</div>
                    <div style={{ fontSize:12,color:'var(--muted)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{s.artist}</div>
                  </div>
                  {s.pdf_url && <a href={s.pdf_url} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm" style={{ flexShrink:0 }}>📄</a>}
                  <button className="btn btn-ghost btn-sm" style={{ color:'var(--red)', flexShrink:0 }} onClick={()=>setWeekSongIds(p=>p.filter(x=>x!==s.id))}>✕</button>
                </div>
                {/* Row 2: transpose + tempo + preview (aligned under title) */}
                <div className="week-song-sub" style={{ display:'flex', alignItems:'center', gap:6, marginTop:8 }}>
                  <TransposeControl
                    originalKey={s.key}
                    transposedKey={effectiveKey(s)}
                    onChange={(newKey) => setKeyOverrides(p => ({ ...p, [s.id]: newKey }))}
                  />
                  <span className={`tag tag-${s.tempo?.toLowerCase()}`}>{s.tempo}</span>
                  <button className="btn btn-ghost btn-sm" style={{ fontSize:11, padding:'4px 8px' }} onClick={() => setPreviewSong(s)} title="Preview chord chart">👁</button>
                </div>
                {/* Rows 3-5: music links (aligned under title) */}
                <div className="week-song-sub" style={{ display:'flex', alignItems:'center', gap:6, marginTop:8 }}>
                  <a href={`https://open.spotify.com/search/${encodeURIComponent(`${s.title} ${s.artist||''}`)}`} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm" style={{ color:'#1DB954', whiteSpace:'nowrap', flexShrink:0 }}>Spotify</a>
                  <input type="url" placeholder="Paste link..." value={songSpotifyUrls[s.id] || ''} onChange={e => setSongSpotifyUrls(p => ({ ...p, [s.id]: e.target.value }))} style={{ flex:1, minWidth:0, fontSize:12, padding:'5px 10px', borderRadius:6, border:'1px solid var(--border2)', background:'var(--bg3)', color:'var(--text)' }} />
                  {songSpotifyUrls[s.id] && <a href={songSpotifyUrls[s.id]} target="_blank" rel="noreferrer" style={{ fontSize:12, color:'#1DB954', flexShrink:0 }}>▶</a>}
                </div>
                <div className="week-song-sub" style={{ display:'flex', alignItems:'center', gap:6, marginTop:6 }}>
                  <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(`${s.title} ${s.artist||''}`)}`} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm" style={{ color:'#FF0000', whiteSpace:'nowrap', flexShrink:0 }}>YouTube</a>
                  <input type="url" placeholder="Paste link..." value={songYoutubeUrls[s.id] || ''} onChange={e => setSongYoutubeUrls(p => ({ ...p, [s.id]: e.target.value }))} style={{ flex:1, minWidth:0, fontSize:12, padding:'5px 10px', borderRadius:6, border:'1px solid var(--border2)', background:'var(--bg3)', color:'var(--text)' }} />
                  {songYoutubeUrls[s.id] && <a href={songYoutubeUrls[s.id]} target="_blank" rel="noreferrer" style={{ fontSize:12, color:'#FF0000', flexShrink:0 }}>▶</a>}
                </div>
                <div className="week-song-sub" style={{ display:'flex', alignItems:'center', gap:6, marginTop:6 }}>
                  <a href={`https://music.apple.com/search?term=${encodeURIComponent(`${s.title} ${s.artist||''}`)}`} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm" style={{ color:'#fc3c44', whiteSpace:'nowrap', flexShrink:0 }}>Apple</a>
                  <input type="url" placeholder="Paste link..." value={songAppleMusicUrls[s.id] || ''} onChange={e => setSongAppleMusicUrls(p => ({ ...p, [s.id]: e.target.value }))} style={{ flex:1, minWidth:0, fontSize:12, padding:'5px 10px', borderRadius:6, border:'1px solid var(--border2)', background:'var(--bg3)', color:'var(--text)' }} />
                  {songAppleMusicUrls[s.id] && <a href={songAppleMusicUrls[s.id]} target="_blank" rel="noreferrer" style={{ fontSize:12, color:'#fc3c44', flexShrink:0 }}>▶</a>}
                </div>
              </div>
              </div>
            ))}
          </div>

          <div className="form-group" style={{ marginBottom:16 }}>
            <label className="form-label">Service Notes</label>
            <textarea placeholder="Any notes for this service..." value={notes} onChange={e=>setNotes(e.target.value)} style={{ width:'100%' }} />
          </div>

          <div className="divider" />

          <div className="set-actions">
            <div className="set-actions-row">
              <button className="btn btn-ghost" onClick={saveSet} disabled={saving}>{saving?'Saving...':'💾 Save Set'}</button>
              <button className="btn btn-gold" onClick={()=>setWaModal(true)}>📱 WhatsApp</button>
            </div>
            <button className="btn btn-primary set-finalize-btn" onClick={finalize} disabled={finalizing}>{finalizing?'Finalizing...':'✓ Finalize & Log Plays'}</button>
          </div>
        </>
      )}

      {previewSong && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setPreviewSong(null)}>
          <div className="modal" style={{ maxWidth:560 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
              <div>
                <div style={{ fontFamily:'var(--font-head)', fontSize:18, fontWeight:700 }}>{previewSong.title}</div>
                <div style={{ fontSize:13, color:'var(--muted)' }}>{previewSong.artist}</div>
              </div>
              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                <span className="tag tag-key">Key of {effectiveKey(previewSong)}</span>
                <span className={`tag tag-${previewSong.tempo?.toLowerCase()}`}>{previewSong.tempo}</span>
              </div>
            </div>
            <div style={{ marginBottom:14 }}>
              <TransposeControl
                originalKey={previewSong.key}
                transposedKey={effectiveKey(previewSong)}
                onChange={(newKey) => setKeyOverrides(p => ({ ...p, [previewSong.id]: newKey }))}
              />
            </div>
            {previewSong.lyrics ? (
              <ChordDisplay
                lyrics={
                  keyOverrides[previewSong.id] && keyOverrides[previewSong.id] !== previewSong.key
                    ? transposeLyrics(previewSong.lyrics, previewSong.key, keyOverrides[previewSong.id])
                    : previewSong.lyrics
                }
              />
            ) : previewSong.pdf_url ? (
              <iframe src={previewSong.pdf_url} title={previewSong.title} style={{ width:'100%', height:400, border:'none', borderRadius:10 }} />
            ) : (
              <div style={{ textAlign:'center', padding:32, color:'var(--muted)', fontSize:13 }}>No chord chart available</div>
            )}
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={()=>setPreviewSong(null)}>Close</button>
            </div>
          </div>
        </div>
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
