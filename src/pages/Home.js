import React, { useState } from 'react'

function tempoColor(t) { return t==='Fast'?'var(--fast)':t==='Medium'?'var(--medium)':'var(--slow)' }

function getNextSunday() {
  const d = new Date()
  const diff = d.getDay() === 0 ? 0 : 7 - d.getDay()
  d.setDate(d.getDate() + diff)
  return d.toISOString().slice(0, 10)
}

export default function Home({ songs, sets, setPage }) {
  const [calDate, setCalDate] = useState(new Date())
  const [hoveredKey, setHoveredKey] = useState(null)

  const today = new Date(); today.setHours(0,0,0,0)
  const nextSunday = getNextSunday()

  const historyMap = {}
  sets.forEach(s => { historyMap[s.service_date] = s })

  const topSongs = [...songs].sort((a,b) => (b.plays_year||0)-(a.plays_year||0)).slice(0,5)
  const maxPlays = topSongs[0]?.plays_year || 1

  const year = calDate.getFullYear()
  const month = calDate.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month+1, 0).getDate()
  const daysInPrev = new Date(year, month, 0).getDate()
  const dayLabels = ['Su','Mo','Tu','We','Th','Fr','Sa']
  const changeMonth = dir => { const d = new Date(calDate); d.setMonth(d.getMonth()+dir); setCalDate(d) }

  const calCells = []
  for (let i = 0; i < firstDay; i++) {
    const d = daysInPrev - firstDay + i + 1
    calCells.push({ d, key: new Date(year, month-1, d).toISOString().slice(0,10), other: true })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    calCells.push({ d, key: new Date(year, month, d).toISOString().slice(0,10), other: false })
  }
  const remaining = (firstDay + daysInMonth) % 7 === 0 ? 0 : 7 - ((firstDay + daysInMonth) % 7)
  for (let d = 1; d <= remaining; d++) {
    calCells.push({ d, key: new Date(year, month+1, d).toISOString().slice(0,10), other: true })
  }

  const nextSet = sets.find(s => s.service_date >= today.toISOString().slice(0,10) && !s.finalized)
  const nextSetSongs = nextSet ? (nextSet.song_ids||[]).map(id => songs.find(s => s.id === id)).filter(Boolean) : []

  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 2fr', gap:24, alignItems:'start' }}>

      {/* LEFT — MINI CALENDAR */}
      <div className="card" style={{ padding:20 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
          <div style={{ fontFamily:'var(--font-head)', fontSize:15, fontWeight:700 }}>
            {calDate.toLocaleDateString('en-US',{month:'long',year:'numeric'})}
          </div>
          <div style={{ display:'flex', gap:4 }}>
            <button className="btn btn-ghost btn-sm" style={{ padding:'3px 8px' }} onClick={()=>changeMonth(-1)}>‹</button>
            <button className="btn btn-ghost btn-sm" style={{ padding:'3px 8px' }} onClick={()=>changeMonth(1)}>›</button>
          </div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2, marginBottom:4 }}>
          {dayLabels.map(l => <div key={l} style={{ fontSize:10, color:'var(--muted)', textAlign:'center', padding:'2px 0' }}>{l}</div>)}
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2 }}>
          {calCells.map(({ d, key, other }) => {
            const hasSet = !!historyMap[key]
            const isToday = key === today.toISOString().slice(0,10)
            const isNext = key === nextSunday
            const isHovered = hoveredKey === key
            const setData = historyMap[key]
            return (
              <div
                key={key}
                onMouseEnter={() => hasSet && setHoveredKey(key)}
                onMouseLeave={() => setHoveredKey(null)}
                onClick={() => hasSet && setPage('history')}
                style={{
                  aspectRatio:'1', borderRadius:6, display:'flex', flexDirection:'column',
                  alignItems:'center', justifyContent:'center', fontSize:11,
                  cursor: hasSet ? 'pointer' : 'default',
                  background: isToday ? 'var(--accent)' : isHovered && hasSet ? 'var(--bg4)' : hasSet ? 'var(--bg3)' : 'transparent',
                  color: isToday ? '#fff' : other ? 'var(--muted)' : 'var(--text)',
                  fontWeight: isToday || isNext ? 700 : 400,
                  border: isNext && !isToday ? '1.5px solid var(--accent)' : '1.5px solid transparent',
                  position:'relative',
                  transition:'background 0.1s',
                }}
              >
                {d}
                {hasSet && <div style={{ width:4, height:4, borderRadius:'50%', background: isToday ? '#fff' : 'var(--accent)', marginTop:1 }} />}
                {isHovered && hasSet && setData && (
                  <div style={{
                    position:'absolute', bottom:'calc(100% + 6px)', left:'50%', transform:'translateX(-50%)',
                    background:'var(--bg2)', border:'1px solid var(--border2)', borderRadius:8,
                    padding:'8px 10px', zIndex:100, whiteSpace:'nowrap', boxShadow:'0 4px 16px rgba(0,0,0,0.2)',
                    pointerEvents:'none',
                  }}>
                    <div style={{ fontSize:11, fontWeight:600, marginBottom:4, color:'var(--text)' }}>
                      {new Date(key+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'})}
                    </div>
                    {(setData.song_ids||[]).slice(0,3).map(id => {
                      const s = songs.find(x => x.id === id)
                      return s ? <div key={id} style={{ fontSize:10, color:'var(--muted)' }}>{s.title}</div> : null
                    })}
                    {(setData.song_ids||[]).length > 3 && <div style={{ fontSize:10, color:'var(--muted)' }}>+{(setData.song_ids||[]).length - 3} more</div>}
                  </div>
                )}
              </div>
            )
          })}
        </div>
        <div style={{ marginTop:14, fontSize:11, color:'var(--muted)' }}>
          <span style={{ display:'inline-flex', alignItems:'center', gap:4 }}><span style={{ width:4, height:4, borderRadius:'50%', background:'var(--accent)', display:'inline-block' }}/>set scheduled</span>
          <span style={{ marginLeft:10, display:'inline-flex', alignItems:'center', gap:4 }}><span style={{ width:10, height:10, borderRadius:3, border:'1.5px solid var(--accent)', display:'inline-block' }}/>next Sunday</span>
        </div>
      </div>

      {/* RIGHT — ACTIONS + TOP SONGS */}
      <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

        {/* UPCOMING SET PREVIEW */}
        {nextSet && (
          <div className="card" style={{ padding:20 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
              <div style={{ fontFamily:'var(--font-head)', fontSize:15, fontWeight:700 }}>
                Upcoming Set
              </div>
              <span style={{ fontSize:12, color:'var(--muted)' }}>
                {new Date(nextSet.service_date+'T12:00:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})}
              </span>
            </div>
            {nextSetSongs.map((s, i) => (
              <div key={s.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'6px 0', borderBottom:'1px solid var(--border)' }}>
                <div style={{ fontSize:11, color:'var(--muted)', width:16, textAlign:'center', fontWeight:600 }}>{i+1}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.title}</div>
                  <div style={{ fontSize:11, color:'var(--muted)' }}>{s.artist}</div>
                </div>
                <span style={{ fontSize:10, fontWeight:600, color: tempoColor(s.tempo) }}>{s.tempo}</span>
                <span className="tag tag-key" style={{ fontSize:10 }}>{nextSet.key_overrides?.[s.id] || s.key}</span>
              </div>
            ))}
            <button className="btn btn-ghost btn-sm" style={{ marginTop:12, width:'100%' }} onClick={()=>setPage('thisweek')}>
              Open in Set Builder →
            </button>
          </div>
        )}

        {/* QUICK ACTIONS */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          <div
            className="card"
            onClick={()=>setPage('upload')}
            style={{ cursor:'pointer', padding:24, textAlign:'center', transition:'transform 0.12s', userSelect:'none' }}
            onMouseEnter={e=>e.currentTarget.style.transform='translateY(-2px)'}
            onMouseLeave={e=>e.currentTarget.style.transform='translateY(0)'}
          >
            <div style={{ fontSize:36, marginBottom:10 }}>⬆</div>
            <div style={{ fontFamily:'var(--font-head)', fontSize:15, fontWeight:700, marginBottom:4 }}>Upload Chart</div>
            <div style={{ fontSize:12, color:'var(--muted)' }}>Add a new song from PDF or URL</div>
          </div>
          <div
            className="card"
            onClick={()=>setPage('library')}
            style={{ cursor:'pointer', padding:24, textAlign:'center', transition:'transform 0.12s', userSelect:'none' }}
            onMouseEnter={e=>e.currentTarget.style.transform='translateY(-2px)'}
            onMouseLeave={e=>e.currentTarget.style.transform='translateY(0)'}
          >
            <div style={{ fontSize:36, marginBottom:10 }}>♪</div>
            <div style={{ fontFamily:'var(--font-head)', fontSize:15, fontWeight:700, marginBottom:4 }}>Song Library</div>
            <div style={{ fontSize:12, color:'var(--muted)' }}>{songs.length} songs in your library</div>
          </div>
        </div>

        {/* TOP PLAYED THIS YEAR */}
        <div className="card" style={{ padding:20 }}>
          <div style={{ fontFamily:'var(--font-head)', fontSize:15, fontWeight:700, marginBottom:4 }}>Top Played This Year</div>
          <div style={{ fontSize:12, color:'var(--muted)', marginBottom:16 }}>Remember to keep things diverse!</div>
          {topSongs.length === 0 ? (
            <div style={{ color:'var(--muted)', fontSize:13, textAlign:'center', padding:16 }}>No play history yet</div>
          ) : topSongs.map((s, i) => (
            <div key={s.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'8px 0', borderBottom: i < topSongs.length-1 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ width:22, height:22, borderRadius:'50%', background:'var(--bg3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color: i===0 ? 'var(--gold)' : 'var(--muted)', flexShrink:0 }}>{i+1}</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.title}</div>
                <div style={{ fontSize:11, color:'var(--muted)' }}>{s.artist}</div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
                <div style={{ width:80, height:6, borderRadius:3, background:'var(--bg3)', overflow:'hidden' }}>
                  <div style={{ height:'100%', borderRadius:3, background: i===0 ? 'var(--gold)' : 'var(--accent)', width:`${Math.round(((s.plays_year||0)/maxPlays)*100)}%` }} />
                </div>
                <div style={{ fontSize:12, color:'var(--muted)', minWidth:24, textAlign:'right' }}>{s.plays_year||0}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
