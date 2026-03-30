import React, { useState, useRef } from 'react'
import { getSets, getSongs } from '../lib/supabase'

function getNextSunday() {
  const d = new Date()
  while (d.getDay() !== 0) d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10)
}

export default function BandView({ songs: propSongs, sets: propSets, weekSongIds, weekSongs }) {
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

  return (
    <div className="band-page">
      <div className="band-topbar">
        <div className="band-logo">WorshipFlow</div>
        <div className="band-week-label">
          {new Date(getNextSunday()+'T12:00:00').toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}
        </div>
      </div>

      <div className="band-content">
        {displaySongs.length === 0 ? (
          <div style={{ textAlign:'center', padding:'80px 20px', color:'#888' }}>
            <div style={{ fontSize:40, marginBottom:12 }}>🎸</div>
            <div style={{ fontSize:16, fontWeight:600, color:'#333', marginBottom:6 }}>No set this week yet</div>
            <div style={{ fontSize:14 }}>The director hasn't finalized this week's songs.</div>
          </div>
        ) : (
          <>
            {/* SONG TABS */}
            <div style={{ display:'flex', gap:8, marginBottom:20, overflowX:'auto', paddingBottom:4 }}>
              {displaySongs.map((s,i) => (
                <button key={s.id} onClick={()=>setIdx(i)} style={{
                  padding:'6px 14px', borderRadius:20, border:'1.5px solid',
                  borderColor: i===idx ? '#6c8fff' : '#e0e0e0',
                  background: i===idx ? '#6c8fff' : '#fff',
                  color: i===idx ? '#fff' : '#555',
                  fontSize:12, fontWeight:500, cursor:'pointer',
                  whiteSpace:'nowrap', fontFamily:'inherit', flexShrink:0,
                  transition:'all 0.15s'
                }}>{i+1}. {s.title}</button>
              ))}
            </div>

            {/* CARD */}
            <div className="band-card"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              <div className="band-song-num">Song {idx+1} of {displaySongs.length}</div>
              <div className="band-song-title">{current.title}</div>
              <div className="band-song-artist">{current.artist}</div>
              <div className="band-key">
                <span style={{ color:'#888', fontWeight:400 }}>Key of</span>
                <span style={{ color:'#1a1a1a' }}>{current.key}</span>
              </div>
              <div style={{ marginBottom:16 }}>
                <span style={{ display:'inline-flex', alignItems:'center', padding:'3px 10px', borderRadius:20, fontSize:12, fontWeight:500, background:`${tempoColor[current.tempo]}18`, color:tempoColor[current.tempo] }}>
                  {current.tempo}
                </span>
              </div>

              {current.lyrics ? (
                <div className="band-lyrics">{current.lyrics}</div>
              ) : current.pdf_url ? (
                <div>
                  <a href={current.pdf_url} target="_blank" rel="noreferrer" style={{
                    display:'inline-flex', alignItems:'center', gap:6,
                    padding:'10px 20px', borderRadius:10,
                    background:'#f0f0f0', color:'#333', textDecoration:'none',
                    fontSize:13, fontWeight:500
                  }}>📄 View Chord Chart PDF</a>
                </div>
              ) : (
                <div style={{ background:'#f5f5f5', borderRadius:12, padding:24, color:'#aaa', fontSize:13 }}>
                  No chord chart uploaded yet
                </div>
              )}
            </div>

            {/* NAVIGATION */}
            <div className="band-nav">
              <button onClick={prev} disabled={idx===0}>←</button>
              <div className="band-dots">
                {displaySongs.map((_,i) => <div key={i} className={`band-dot ${i===idx?'active':''}`} />)}
              </div>
              <button onClick={next} disabled={idx===displaySongs.length-1}>→</button>
            </div>

            <div style={{ textAlign:'center', marginTop:16, fontSize:12, color:'#aaa' }}>
              Swipe left or right to navigate songs
            </div>
          </>
        )}
      </div>
    </div>
  )
}
