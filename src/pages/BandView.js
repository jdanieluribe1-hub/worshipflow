import React, { useState, useRef } from 'react'

function getNextSunday() {
  const d = new Date()
  while (d.getDay() !== 0) d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10)
}

function ChordDisplay({ lyrics }) {
  if (!lyrics) return null
  const lines = lyrics.split('\n')
  return (
    <div style={{ textAlign:'left', width:'100%' }}>
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} style={{ height:6 }} />
        if (/^\[[^\]]+\]$/.test(line.trim()) && !line.includes(' ')) {
          return <div key={i} style={{ color:'#6c8fff', fontWeight:600, fontSize:11, letterSpacing:1.5, textTransform:'uppercase', marginTop:16, marginBottom:2 }}>{line.trim().replace(/[\[\]]/g,'')}</div>
        }
        const parts = line.split(/(\[[^\]]+\])/)
        return (
          <div key={i} style={{ display:'flex', flexWrap:'wrap', alignItems:'flex-end', marginBottom:4, lineHeight:1.8 }}>
            {parts.map((part, j) => {
              if (/^\[[^\]]+\]$/.test(part)) {
                return <span key={j} style={{ color:'#6c8fff', fontWeight:700, fontSize:13, marginRight:2, display:'inline-block' }}>{part.slice(1,-1)}</span>
              }
              return <span key={j} style={{ color:'#333', fontSize:16 }}>{part}</span>
            })}
          </div>
        )
      })}
    </div>
  )
}

export default function BandView({ weekSongs }) {
  const [idx, setIdx] = useState(0)
  const touchStartX = useRef(null)
  const displaySongs = weekSongs && weekSongs.length > 0 ? weekSongs : []
  const current = displaySongs[idx]
  const prev = () => setIdx(i => Math.max(0, i - 1))
  const next = () => setIdx(i => Math.min(displaySongs.length - 1, i + 1))
  const handleTouchStart = (e) => { touchStartX.current = e.touches[0].clientX }
  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return
    const diff = touchStartX.current - e.changedTouches[0].clientX
    if (Math.abs(diff) > 50) { diff > 0 ? next() : prev() }
    touchStartX.current = null
  }
  const tempoColor = { Fast: '#ef4444', Medium: '#d97706', Slow: '#3b82f6' }
  const dateLabel = new Date(getNextSunday()+'T12:00:00').toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})

  return (
    <div className="band-page">
      <div className="band-topbar">
        <div className="band-logo">WorshipFlow</div>
        <div className="band-week-label">{dateLabel}</div>
      </div>
      <div className="band-content">
        {displaySongs.length === 0 ? (
          <div style={{ textAlign:'center', padding:'80px 20px', color:'#888' }}>
            <div style={{ fontSize:40, marginBottom:12 }}>🎸</div>
            <div style={{ fontSize:16, fontWeight:600, color:'#333', marginBottom:6 }}>No set this week yet</div>
            <div style={{ fontSize:14 }}>The director has not finalized this week's songs.</div>
          </div>
        ) : (
          <>
            <div style={{ display:'flex', gap:8, marginBottom:20, overflowX:'auto', paddingBottom:4 }}>
              {displaySongs.map((s,i) => (
                <button key={s.id} onClick={()=>setIdx(i)} style={{
                  padding:'6px 14px', borderRadius:20, border:'1.5px solid',
                  borderColor: i===idx ? '#6c8fff' : '#e0e0e0',
                  background: i===idx ? '#6c8fff' : '#fff',
                  color: i===idx ? '#fff' : '#555',
                  fontSize:12, fontWeight:500, cursor:'pointer',
                  whiteSpace:'nowrap', fontFamily:'inherit', flexShrink:0
                }}>{i+1}. {s.title}</button>
              ))}
            </div>
            <div className="band-card" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
              <div className="band-song-num">Song {idx+1} of {displaySongs.length}</div>
              <div className="band-song-title">{current.title}</div>
              <div className="band-song-artist">{current.artist}</div>
              <div style={{ display:'flex', gap:8, justifyContent:'center', marginBottom:20, flexWrap:'wrap' }}>
                <div className="band-key">
                  <span style={{ color:'#888', fontWeight:400 }}>Key of</span>
                  <span style={{ color:'#1a1a1a' }}>{current.key}</span>
                </div>
                <span style={{ display:'inline-flex', alignItems:'center', padding:'6px 14px', borderRadius:8, fontSize:13, fontWeight:500, background: (tempoColor[current.tempo] || '#888') + '18', color: tempoColor[current.tempo] || '#888' }}>
                  {current.tempo}
                </span>
              </div>
              {current.lyrics ? (
                <div style={{ width:'100%', background:'#fafafa', borderRadius:12, padding:'16px 20px', maxHeight:420, overflowY:'auto' }}>
                  <ChordDisplay lyrics={current.lyrics} />
                </div>
              ) : current.pdf_url ? (
                <iframe src={current.pdf_url} title={current.title} style={{ width:'100%', height:'500px', border:'none', borderRadius:'12px' }} />
              ) : (
                <div style={{ background:'#f5f5f5', borderRadius:12, padding:24, color:'#aaa', fontSize:13 }}>No chord chart uploaded yet</div>
              )}
            </div>
            <div className="band-nav">
              <button onClick={prev} disabled={idx===0}>←</button>
              <div className="band-dots">
                {displaySongs.map((_,i) => <div key={i} className={i===idx ? 'band-dot active' : 'band-dot'} />)}
              </div>
              <button onClick={next} disabled={idx===displaySongs.length-1}>→</button>
            </div>
            <div style={{ textAlign:'center', marginTop:16, fontSize:12, color:'#aaa' }}>Swipe left or right to navigate songs</div>
          </>
        )}
      </div>
    </div>
  )
}
