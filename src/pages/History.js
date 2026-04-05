import React, { useState } from 'react'
import { deleteSet, upsertSet } from '../lib/supabase'
import TransposeControl from '../components/TransposeControl'

function tempoEmoji(t) { return t==='Fast'?'⚡':t==='Medium'?'♩':'🎶' }

export default function History({ songs, sets, refreshSets, setPage, activeChurch }) {
  const [view, setView] = useState('calendar')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedKey, setSelectedKey] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [duplicateDate, setDuplicateDate] = useState('')
  const [duplicating, setDuplicating] = useState(false)

  // Edit modal state
  const [editModal, setEditModal] = useState(false)
  const [editSongIds, setEditSongIds] = useState([])
  const [editKeyOverrides, setEditKeyOverrides] = useState({})
  const [editMusicLinks, setEditMusicLinks] = useState({})
  const [editNotes, setEditNotes] = useState('')
  const [editDragIdx, setEditDragIdx] = useState(null)
  const [editDragOverIdx, setEditDragOverIdx] = useState(null)
  const [editSaving, setEditSaving] = useState(false)
  const [editWaModal, setEditWaModal] = useState(false)

  const today = new Date(); today.setHours(0,0,0,0)

  const historyMap = {}
  sets.forEach(s => { historyMap[s.service_date] = s })

  const selectedSet = selectedKey ? historyMap[selectedKey] : null
  const selectedSongs = selectedSet ? (selectedSet.song_ids||[]).map(id=>songs.find(s=>s.id===id)).filter(Boolean) : []
  const effectiveKey = (s) => selectedSet?.key_overrides?.[s.id] || s.key

  const isPast = selectedKey ? new Date(selectedKey + 'T12:00:00') < today : false

  const handleDeleteSet = async () => {
    if (!selectedKey) return
    if (!window.confirm('Delete the set for ' + new Date(selectedKey + 'T12:00:00').toLocaleDateString('en-US', { month:'long', day:'numeric', year:'numeric' }) + '? This cannot be undone.')) return
    setDeleting(true)
    try {
      await deleteSet(activeChurch?.id, selectedKey)
      await refreshSets()
      setSelectedKey(null)
    } catch (e) { alert('Error deleting set: ' + e.message) }
    setDeleting(false)
  }

  const handleDuplicateSet = async () => {
    if (!selectedSet || !duplicateDate) return
    if (historyMap[duplicateDate] && !window.confirm(`A set already exists for ${duplicateDate}. Overwrite it?`)) return
    setDuplicating(true)
    try {
      await upsertSet(activeChurch?.id, duplicateDate, selectedSet.song_ids, selectedSet.notes || '', selectedSet.key_overrides || {}, selectedSet.music_links || {})
      await refreshSets()
      setDuplicateDate('')
      alert('Set duplicated to ' + new Date(duplicateDate + 'T12:00:00').toLocaleDateString('en-US', { month:'long', day:'numeric', year:'numeric' }) + '!')
    } catch (e) { alert('Error duplicating set: ' + e.message) }
    setDuplicating(false)
  }

  const openEditModal = () => {
    setEditSongIds([...(selectedSet.song_ids || [])])
    setEditKeyOverrides({ ...(selectedSet.key_overrides || {}) })
    setEditMusicLinks(JSON.parse(JSON.stringify(selectedSet.music_links || {})))
    setEditNotes(selectedSet.notes || '')
    setEditModal(true)
  }

  const saveEditModal = async () => {
    setEditSaving(true)
    try {
      await upsertSet(activeChurch?.id, selectedKey, editSongIds, editNotes, editKeyOverrides, editMusicLinks)
      await refreshSets()
      setEditModal(false)
    } catch(e) { alert('Error saving: ' + e.message) }
    setEditSaving(false)
  }

  const editDragStart = (i) => setEditDragIdx(i)
  const editDragOver = (e, i) => { e.preventDefault(); setEditDragOverIdx(i) }
  const editDrop = (i) => {
    if (editDragIdx === null || editDragIdx === i) { setEditDragIdx(null); setEditDragOverIdx(null); return }
    const newIds = [...editSongIds]
    const [removed] = newIds.splice(editDragIdx, 1)
    newIds.splice(i, 0, removed)
    setEditSongIds(newIds)
    setEditDragIdx(null)
    setEditDragOverIdx(null)
  }

  const editWaMessage = () => {
    const useSongs = editSongIds.map(id => songs.find(s => s.id === id)).filter(Boolean)
    const date = new Date(selectedKey + 'T12:00:00').toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric', year:'numeric' })
    const bandLink = activeChurch?.band_token
      ? `${window.location.origin}/band/${activeChurch.band_token}`
      : `${window.location.origin}/band`
    const recommendLink = `${window.location.origin}/recommend`
    const songLines = useSongs.map((s,i) => {
      const eff = editKeyOverrides[s.id] || s.key
      const ml = editMusicLinks[s.id] || {}
      return `${i+1}. *${s.title}* — ${s.artist||''}\n   Key: ${eff} | ${s.tempo}${ml.spotify ? `\n   🎵 ${ml.spotify}` : ''}${ml.youtube ? `\n   ▶️ ${ml.youtube}` : ''}${ml.apple ? `\n   🍎 ${ml.apple}` : ''}`
    }).join('\n\n')
    return `*Worship Set — ${date}* 🎵\n\n${songLines}\n\n📋 Chord Charts & Lyrics:\n${bandLink}\n\n💡 Have a song you'd like me to listen to? Share it here:\n${recommendLink}\n\nSee you Sunday! 🙌`
  }

  const setMusicLink = (id, field, val) => {
    setEditMusicLinks(prev => ({ ...prev, [id]: { ...(prev[id] || {}), [field]: val } }))
  }

  const sorted = [...songs].sort((a,b)=>(b.plays_year||0)-(a.plays_year||0))
  const topSong = sorted[0]

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month+1, 0).getDate()
  const daysInPrev = new Date(year, month, 0).getDate()
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

  const changeMonth = dir => { const d = new Date(currentDate); d.setMonth(d.getMonth()+dir); setCurrentDate(d) }

  const renderCalCell = (d, fullDate, otherMonth) => {
    const key = fullDate.toISOString().slice(0,10)
    const hasSet = !!historyMap[key]
    const isToday = fullDate.getTime() === today.getTime()
    const isSelected = selectedKey === key
    const entry = historyMap[key]
    const songCount = entry ? (entry.song_ids||[]).length : 0
    const cellIsPast = fullDate < today

    let cls = 'cal-cell'
    if (otherMonth) cls += ' other-month'
    if (isToday) cls += ' today'
    if (hasSet) cls += ' has-set'
    if (isSelected) cls += ' selected'

    return (
      <div key={key} className={cls} onClick={() => hasSet && setSelectedKey(isSelected ? null : key)}>
        <div className="cal-date">{d}</div>
        {hasSet && <><div className="cal-dot"/><div className="cal-count">{songCount}</div></>}
        {hasSet && cellIsPast && <div style={{ fontSize:8, color:'var(--muted)', lineHeight:1 }}>🔒</div>}
      </div>
    )
  }

  const calCells = []
  for (let i = 0; i < firstDay; i++) {
    const d = daysInPrev - firstDay + i + 1
    calCells.push(renderCalCell(d, new Date(year, month-1, d), true))
  }
  for (let d = 1; d <= daysInMonth; d++) {
    calCells.push(renderCalCell(d, new Date(year, month, d), false))
  }
  const remaining = (firstDay + daysInMonth) % 7 === 0 ? 0 : 7 - ((firstDay + daysInMonth) % 7)
  for (let d = 1; d <= remaining; d++) {
    calCells.push(renderCalCell(d, new Date(year, month+1, d), true))
  }

  const editSongs = editSongIds.map(id => songs.find(s => s.id === id)).filter(Boolean)

  return (
    <div>
      <div className="grid-4 stat-grid" style={{ marginBottom:28 }}>
        <div className="stat-card"><div className="stat-label">Total Songs</div><div className="stat-value">{songs.length}</div></div>
        <div className="stat-card"><div className="stat-label">Services Logged</div><div className="stat-value">{sets.length}</div></div>
        <div className="stat-card">
          <div className="stat-label">Most Played</div>
          <div className="stat-value" style={{ fontSize:14, marginTop:4 }}>{topSong?.title||'—'}</div>
          <div className="stat-sub">{topSong?.plays_year||0} times this year</div>
        </div>
        <div className="stat-card"><div className="stat-label">Avg Songs / Set</div><div className="stat-value">{sets.length ? Math.round(sets.reduce((a,s)=>a+(s.song_ids||[]).length,0)/sets.length) : 0}</div></div>
      </div>

      <div style={{ display:'flex', gap:8, marginBottom:24 }}>
        <button className={`filter-btn ${view==='calendar'?'active':''}`} onClick={()=>setView('calendar')}>📅 Calendar</button>
        <button className={`filter-btn ${view==='frequency'?'active':''}`} onClick={()=>setView('frequency')}>📊 Frequency</button>
      </div>

      {view === 'calendar' && (
        <div className="history-cal-grid" style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:20, alignItems:'start' }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
              <div style={{ fontFamily:'var(--font-head)', fontSize:20, fontWeight:700 }}>
                {currentDate.toLocaleDateString('en-US',{month:'long',year:'numeric'})}
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button className="btn btn-ghost btn-sm" onClick={()=>changeMonth(-1)}>‹</button>
                <button className="btn btn-ghost btn-sm" onClick={()=>{setCurrentDate(new Date());setSelectedKey(null)}}>Today</button>
                <button className="btn btn-ghost btn-sm" onClick={()=>changeMonth(1)}>›</button>
              </div>
            </div>
            <div className="cal-grid">
              {days.map(d=><div key={d} className="cal-day-label">{d}</div>)}
              {calCells}
            </div>
          </div>

          <div className="card" style={{ padding:0, overflow:'hidden' }}>
            {!selectedSet ? (
              <div className="empty-state">
                <div className="empty-icon">📅</div>
                <div className="empty-text">Click a highlighted date to see that week's set</div>
              </div>
            ) : (
              <>
                <div style={{ padding:'16px 20px', background:'var(--bg3)', borderBottom:'1px solid var(--border)' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <div style={{ fontFamily:'var(--font-head)', fontSize:16, fontWeight:700, flex:1 }}>
                      {new Date(selectedKey+'T12:00:00').toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'})}
                    </div>
                    {isPast && <span title="Past set — locked" style={{ fontSize:14 }}>🔒</span>}
                  </div>
                  <div style={{ fontSize:12, color:'var(--muted)', marginTop:3 }}>
                    {selectedSongs.length} songs · Keys: {[...new Set(selectedSongs.map(s=>effectiveKey(s)))].join(', ')||'—'}
                  </div>
                </div>
                <div style={{ padding:'14px 20px' }}>
                  <div style={{ display:'flex', gap:8, marginBottom:12 }}>
                    {[['Fast','fast'],[' Mid','medium'],['Slow','slow']].map(([label,t])=>(
                      <div key={t} style={{ flex:1, background:'var(--bg3)', borderRadius:8, padding:'8px 10px', textAlign:'center' }}>
                        <div style={{ fontFamily:'var(--font-head)', fontSize:18, fontWeight:700, color:`var(--${t})` }}>
                          {selectedSongs.filter(s=>s.tempo?.toLowerCase()===t.trim().toLowerCase()).length}
                        </div>
                        <div style={{ fontSize:10, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.5px', marginTop:2 }}>{label.trim()}</div>
                      </div>
                    ))}
                  </div>
                  {selectedSongs.map((s,i) => (
                    <div key={s.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 0', borderBottom:'1px solid var(--border)' }}>
                      <div style={{ width:22,height:22,borderRadius:'50%',background:'var(--bg4)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,color:'var(--muted)',fontWeight:600,flexShrink:0 }}>{i+1}</div>
                      <div style={{ width:32,height:32,borderRadius:7,background:'var(--bg4)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,flexShrink:0 }}>{tempoEmoji(s.tempo)}</div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontWeight:500,fontSize:13,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{s.title}</div>
                        <div style={{ fontSize:11,color:'var(--muted)' }}>{s.artist}</div>
                      </div>
                      <span className="tag tag-key" style={{ fontSize:10 }}>{effectiveKey(s)}</span>
                    </div>
                  ))}
                  {selectedSet.notes && (
                    <div style={{ marginTop:12, padding:'10px 12px', background:'var(--bg3)', borderRadius:8, fontSize:12, color:'var(--muted)' }}>{selectedSet.notes}</div>
                  )}

                  <div style={{ marginTop:16, paddingTop:14, borderTop:'1px solid var(--border)', display:'flex', flexDirection:'column', gap:8 }}>
                    <div style={{ display:'flex', gap:6 }}>
                      <input type="date" value={duplicateDate} onChange={e => setDuplicateDate(e.target.value)} style={{ flex:1, fontSize:12, padding:'5px 8px', borderRadius:6, border:'1px solid var(--border2)', background:'var(--bg3)', color:'var(--text)' }} />
                      <button className="btn btn-ghost btn-sm" onClick={handleDuplicateSet} disabled={duplicating || !duplicateDate} style={{ whiteSpace:'nowrap' }}>{duplicating ? 'Copying…' : 'Duplicate to date'}</button>
                    </div>
                    {!isPast && (
                      <>
                        <button className="btn btn-ghost btn-sm" onClick={openEditModal} style={{ width:'100%' }}>✏️ Edit Set</button>
                        <button className="btn btn-ghost btn-sm" onClick={handleDeleteSet} disabled={deleting} style={{ color:'var(--red)', borderColor:'var(--red)', width:'100%' }}>{deleting ? 'Deleting…' : 'Delete This Set'}</button>
                      </>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {view === 'frequency' && (
        <div>
          {sorted.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">📊</div><div className="empty-text">No play history yet</div></div>
          ) : sorted.map(s => (
            <div key={s.id} style={{ display:'flex',alignItems:'center',gap:14,padding:'12px 0',borderBottom:'1px solid var(--border)' }}>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:500,fontSize:14 }}>{s.title}</div>
                <div style={{ fontSize:12,color:'var(--muted)' }}>{s.artist}</div>
              </div>
              {[['3 wks',s.plays_3weeks],['3 mos',s.plays_3months],['Year',s.plays_year]].map(([label,val])=>(
                <div key={label} style={{ textAlign:'center',minWidth:52 }}>
                  <div style={{ fontSize:11,color:'var(--muted)' }}>{label}</div>
                  <div style={{ fontWeight:500,marginTop:2 }}>{val||0}</div>
                </div>
              ))}
              <div style={{ width:80, display:'flex', gap:3, alignItems:'flex-end', height:36 }}>
                {Array.from({length:8}).map((_,i)=>(
                  <div key={i} style={{ flex:1, background:'var(--accent)', borderRadius:'2px 2px 0 0', height:`${i<Math.round(((s.plays_year||0)/(topSong?.plays_year||1))*8)?Math.max(20,Math.round(((i+1)/8)*100)):12}%`, opacity: i<Math.round(((s.plays_year||0)/(topSong?.plays_year||1))*8)?0.8:0.12 }} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* EDIT SET MODAL */}
      {editModal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setEditModal(false)}>
          <div className="modal" style={{ maxWidth:680, width:'100%', maxHeight:'90vh', display:'flex', flexDirection:'column' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, flexShrink:0 }}>
              <div>
                <div className="modal-title" style={{ marginBottom:2 }}>Edit Set</div>
                <div style={{ fontSize:12, color:'var(--muted)' }}>{new Date(selectedKey+'T12:00:00').toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'})}</div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={()=>setEditModal(false)}>✕</button>
            </div>

            <div style={{ flex:1, overflowY:'auto', marginBottom:16 }}>
              <div className="form-label" style={{ marginBottom:8 }}>Song Order <span style={{ fontSize:11, color:'var(--muted)', fontWeight:400 }}>— drag to reorder</span></div>
              {editSongs.map((s, i) => (
                <div
                  key={s.id}
                  draggable
                  onDragStart={() => editDragStart(i)}
                  onDragOver={(e) => editDragOver(e, i)}
                  onDrop={() => editDrop(i)}
                  onDragEnd={() => { setEditDragIdx(null); setEditDragOverIdx(null) }}
                  style={{ marginBottom:6, opacity: editDragIdx === i ? 0.4 : 1 }}
                >
                  <div style={{
                    background:'var(--bg3)', borderRadius:10, padding:'10px 12px',
                    outline: editDragOverIdx === i && editDragIdx !== i ? '2px solid var(--accent)' : 'none',
                    cursor:'grab'
                  }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                      <div style={{ width:22, height:22, borderRadius:'50%', background:'var(--bg4)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, color:'var(--muted)', fontWeight:600, flexShrink:0 }}>{i+1}</div>
                      <div style={{ width:32,height:32,borderRadius:7,background:'var(--bg4)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,flexShrink:0 }}>{tempoEmoji(s.tempo)}</div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontWeight:500, fontSize:13 }}>{s.title}</div>
                        <div style={{ fontSize:11, color:'var(--muted)' }}>{s.artist}</div>
                      </div>
                      <TransposeControl
                        originalKey={s.key}
                        transposedKey={editKeyOverrides[s.id] || s.key}
                        onChange={(k) => setEditKeyOverrides(p => ({ ...p, [s.id]: k }))}
                      />
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', gap:5, paddingLeft:62 }}>
                      <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                        <span style={{ fontSize:11, color:'#1DB954', width:16 }}>🎵</span>
                        <input type="url" placeholder="Spotify link..." value={editMusicLinks[s.id]?.spotify || ''} onChange={e => setMusicLink(s.id, 'spotify', e.target.value)} style={{ flex:1, fontSize:12, padding:'4px 8px', borderRadius:6, border:'1px solid var(--border2)', background:'var(--bg4)', color:'var(--text)' }} />
                      </div>
                      <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                        <span style={{ fontSize:11, color:'#FF0000', width:16 }}>▶️</span>
                        <input type="url" placeholder="YouTube link..." value={editMusicLinks[s.id]?.youtube || ''} onChange={e => setMusicLink(s.id, 'youtube', e.target.value)} style={{ flex:1, fontSize:12, padding:'4px 8px', borderRadius:6, border:'1px solid var(--border2)', background:'var(--bg4)', color:'var(--text)' }} />
                      </div>
                      <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                        <span style={{ fontSize:11, color:'#fc3c44', width:16 }}>🍎</span>
                        <input type="url" placeholder="Apple Music link..." value={editMusicLinks[s.id]?.apple || ''} onChange={e => setMusicLink(s.id, 'apple', e.target.value)} style={{ flex:1, fontSize:12, padding:'4px 8px', borderRadius:6, border:'1px solid var(--border2)', background:'var(--bg4)', color:'var(--text)' }} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <div className="form-group" style={{ marginTop:16 }}>
                <label className="form-label">Service Notes</label>
                <textarea placeholder="Any notes for this service..." value={editNotes} onChange={e=>setEditNotes(e.target.value)} style={{ width:'100%' }} />
              </div>
            </div>

            <div className="modal-footer" style={{ flexShrink:0, borderTop:'1px solid var(--border)', paddingTop:16 }}>
              <button className="btn btn-gold" onClick={()=>setEditWaModal(true)}>📱 WhatsApp Preview</button>
              <div style={{ flex:1 }} />
              <button className="btn btn-ghost" onClick={()=>setEditModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveEditModal} disabled={editSaving}>{editSaving ? 'Saving…' : '💾 Save Changes'}</button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT WHATSAPP PREVIEW */}
      {editWaModal && (
        <div className="modal-overlay" style={{ zIndex:1100 }} onClick={e=>e.target===e.currentTarget&&setEditWaModal(false)}>
          <div className="modal">
            <div className="modal-title">WhatsApp Message Preview</div>
            <div style={{ background:'#111b21', borderRadius:14, padding:20, margin:'12px 0' }}>
              <div style={{ background:'#005c4b', borderRadius:'10px 10px 10px 2px', padding:'12px 14px', fontSize:13, lineHeight:1.6, color:'#e9edef', whiteSpace:'pre-wrap' }}
                dangerouslySetInnerHTML={{ __html: editWaMessage().replace(/\*(.*?)\*/g,'<b>$1</b>') }} />
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={()=>setEditWaModal(false)}>Close</button>
              <button className="btn btn-green" onClick={()=>{navigator.clipboard.writeText(editWaMessage());alert('Copied!')}}>Copy Message</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
