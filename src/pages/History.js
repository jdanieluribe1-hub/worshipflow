import React, { useState } from 'react'
import { deleteSet, upsertSet } from '../lib/supabase'

function tempoEmoji(t) { return t==='Fast'?'⚡':t==='Medium'?'♩':'🎶' }

export default function History({ songs, sets, refreshSets, setPage }) {
  const [view, setView] = useState('calendar')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedKey, setSelectedKey] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [duplicateDate, setDuplicateDate] = useState('')
  const [duplicating, setDuplicating] = useState(false)

  const today = new Date(); today.setHours(0,0,0,0)

  const historyMap = {}
  sets.forEach(s => { historyMap[s.service_date] = s })

  const selectedSet = selectedKey ? historyMap[selectedKey] : null
  const selectedSongs = selectedSet ? (selectedSet.song_ids||[]).map(id=>songs.find(s=>s.id===id)).filter(Boolean) : []
  const effectiveKey = (s) => selectedSet?.key_overrides?.[s.id] || s.key

  const isPast = selectedKey ? new Date(selectedKey + 'T12:00:00') < today : false

  const handleDeleteSet = async () => {
    if (!selectedKey) return
    if (!window.confirm('Delete the set for ' + new Date(selectedKey + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) + '? This cannot be undone.')) return
    setDeleting(true)
    try {
      await deleteSet(selectedKey)
      await refreshSets()
      setSelectedKey(null)
    } catch (e) {
      alert('Error deleting set: ' + e.message)
    }
    setDeleting(false)
  }

  const handleDuplicateSet = async () => {
    if (!selectedSet || !duplicateDate) return
    if (historyMap[duplicateDate] && !window.confirm(`A set already exists for ${duplicateDate}. Overwrite it?`)) return
    setDuplicating(true)
    try {
      await upsertSet(duplicateDate, selectedSet.song_ids, selectedSet.notes || '', selectedSet.key_overrides || {})
      await refreshSets()
      setDuplicateDate('')
      alert('Set duplicated to ' + new Date(duplicateDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) + '!')
    } catch (e) {
      alert('Error duplicating set: ' + e.message)
    }
    setDuplicating(false)
  }

  const sorted = [...songs].sort((a,b)=>(b.plays_year||0)-(a.plays_year||0))
  const topSong = sorted[0]

  // Calendar
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

  return (
    <div>
      <div className="grid-4" style={{ marginBottom:28 }}>
        <div className="stat-card">
          <div className="stat-label">Total Songs</div>
          <div className="stat-value">{songs.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Services Logged</div>
          <div className="stat-value">{sets.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Most Played</div>
          <div className="stat-value" style={{ fontSize:14, marginTop:4 }}>{topSong?.title||'—'}</div>
          <div className="stat-sub">{topSong?.plays_year||0} times this year</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Avg Songs / Set</div>
          <div className="stat-value">{sets.length ? Math.round(sets.reduce((a,s)=>a+(s.song_ids||[]).length,0)/sets.length) : 0}</div>
        </div>
      </div>

      <div style={{ display:'flex', gap:8, marginBottom:24 }}>
        <button className={`filter-btn ${view==='calendar'?'active':''}`} onClick={()=>setView('calendar')}>📅 Calendar</button>
        <button className={`filter-btn ${view==='frequency'?'active':''}`} onClick={()=>setView('frequency')}>📊 Frequency</button>
      </div>

      {view === 'calendar' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:20, alignItems:'start' }}>
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
                    {/* Duplicate */}
                    <div style={{ display:'flex', gap:6 }}>
                      <input
                        type="date"
                        value={duplicateDate}
                        onChange={e => setDuplicateDate(e.target.value)}
                        style={{ flex:1, fontSize:12, padding:'5px 8px', borderRadius:6, border:'1px solid var(--border2)', background:'var(--bg3)', color:'var(--text)' }}
                      />
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={handleDuplicateSet}
                        disabled={duplicating || !duplicateDate}
                        style={{ whiteSpace:'nowrap' }}
                      >
                        {duplicating ? 'Copying…' : 'Duplicate to date'}
                      </button>
                    </div>

                    {/* Future-only actions */}
                    {!isPast && (
                      <>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => setPage('thisweek')}
                          style={{ width:'100%' }}
                        >
                          Edit in This Week
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={handleDeleteSet}
                          disabled={deleting}
                          style={{ color:'var(--red)', borderColor:'var(--red)', width:'100%' }}
                        >
                          {deleting ? 'Deleting…' : 'Delete This Set'}
                        </button>
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
    </div>
  )
}
