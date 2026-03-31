import React, { useState, useEffect, useRef } from 'react'
import { getSongs, getSets } from '../lib/supabase'

function getNextSunday() {
  const d = new Date()
  while (d.getDay() !== 0) d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10)
}

function parseLyricLine(line) {
  const parts = line.split(/(\[[^\]]+\])/)
  let chordLine = ''
  let lyricLine = ''
  let pendingChord = null
  for (const part of parts) {
    if (/^\[[^\]]+\]$/.test(part)) {
      const chord = part.slice(1, -1)
      if (pendingChord !== null) {
        const w = pendingChord.length + 1
        chordLine += pendingChord.padEnd(w)
        lyricLine += ' '.repeat(w)
      }
      pendingChord = chord
    } else {
      if (pendingChord !== null) {
        const w = Math.max(pendingChord.length + 1, part.length)
        chordLine += pendingChord.padEnd(w)
        lyricLine += part.padEnd(w)
        pendingChord = null
      } else {
        chordLine += ' '.repeat(part.length)
        lyricLine += part
      }
    }
  }
  if (pendingChord !== null) chordLine += pendingChord
  return { chordLine, lyricLine: lyricLine.trimEnd() }
}

function isChordName(s) {
  return /^[A-G][#b]?(m|M|maj|min|dim|aug|sus|add)?[0-9]*(\/[A-G][#b]?)?$/.test(s)
}

function ChordDisplay({ lyrics }) {
  if (!lyrics) return null
  const lines = lyrics.split('\n')
  return (
    <div style={{ textAlign:'left', width:'100%', fontFamily:'monospace', fontSize:14 }}>
      {lines.map((line, i) => {
        const trimmed = line.trim()
        if (!trimmed) return <div key={i} style={{ height:8 }} />

        // Section label: entire line is [Something] that isn't a chord name
        if (/^\[[^\]]+\]$/.test(trimmed) && !isChordName(trimmed.slice(1, -1))) {
          return <div key={i} style={{ color:'#6c8fff', fontWeight:600, fontSize:11, letterSpacing:1.5, textTransform:'uppercase', marginTop:16, marginBottom:4 }}>{trimmed.slice(1,-1)}</div>
        }

        // Pure lyric line with no chord markers
        if (!/\[[^\]]+\]/.test(line)) {
          return <div key={i} style={{ color:'#333', whiteSpace:'pre-wrap', lineHeight:1.6, fontSize:16, marginBottom:2 }}>{line}</div>
        }

        const { chordLine, lyricLine } = parseLyricLine(line)
        return (
          <div key={i} style={{ marginBottom:8 }}>
            <div style={{ color:'#6c8fff', fontWeight:700, whiteSpace:'pre', lineHeight:1.3 }}>{chordLine}</div>
            <div style={{ color:'#333', whiteSpace:'pre', lineHeight:1.5, fontSize:16 }}>{lyricLine || '\u00A0'}</div>
          </div>
        )
      })}
    </div>
  )
}

export default function BandView({ songs: propSongs = [], sets: propSets = [] }) {
  const [selectedDate, setSelectedDate] = useState(getNextSunday)
  const [idx, setIdx] = useState(0)
  const [localSongs, setLocalSongs] = useState([])
  const [localSets, setLocalSets] = useState([])
  const touchStartX = useRef(null)

  // Self-fetch when used on the public /band route (no props passed)
  useEffect(() => {
    if (!propSongs.length || !propSets.length) {
      Promise.all([getSongs(), getSets()])
        .then(([s, st]) => { setLocalSongs(s || []); setLocalSets(st || []) })
        .catch(() => {})
    }
  }, [propSongs.length, propSets.length])

  const songs = propSongs.length ? propSongs : localSongs
  const sets  = propSets.length  ? propSets  : localSets

  // Find the set for the selected date and map song_ids → song objects (preserving order)
  const selectedSet  = sets.find(s => s.service_date === selectedDate)
  const displaySongs = selectedSet
    ? selectedSet.song_ids.map(id => songs.find(s => s.id === id)).filter(Boolean)
    : []

  const current = displaySongs[idx]
  const prev = () => setIdx(i => Math.max(0, i - 1))
  const next = () => setIdx(i => Math.min(displaySongs.length - 1, i + 1))

  const handleDateChange = (e) => { setSelectedDate(e.target.value); setIdx(0) }
  const handleTouchStart = (e) => { touchStartX.current = e.touches[0].clientX }
  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return
    const diff = touchStartX.current - e.changedTouches[0].clientX
    if (Math.abs(diff) > 50) { diff > 0 ? next() : prev() }
    touchStartX.current = null
  }
  const [expanded, setExpanded] = useState(false)
  const tempoColor = { Fast: '#ef4444', Medium: '#d97706', Slow: '#3b82f6' }
  const dateLabel = new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { month:'long', day:'numeric', year:'numeric' })

  return (
    <div className="band-page">
      <div className="band-topbar">
        <div className="band-logo">WorshipFlow</div>
        <label style={{ position:'relative', cursor:'pointer', userSelect:'none' }}>
          <span className="band-week-label" style={{ display:'flex', alignItems:'center', gap:6 }}>
            <span style={{ fontSize:14 }}>📅</span>{dateLabel}
          </span>
          <input
            type="date"
            value={selectedDate}
            onChange={handleDateChange}
            style={{ position:'absolute', opacity:0, inset:0, cursor:'pointer', width:'100%', height:'100%' }}
          />
        </label>
      </div>
      <div className="band-content">
        {displaySongs.length === 0 ? (
          <div style={{ textAlign:'center', padding:'80px 20px', color:'#888' }}>
            <div style={{ fontSize:40, marginBottom:12 }}>🎸</div>
            <div style={{ fontSize:16, fontWeight:600, color:'#333', marginBottom:6 }}>No set for {dateLabel}</div>
            <div style={{ fontSize:14 }}>No songs have been scheduled for this date yet.</div>
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
                <div style={{ width:'100%', position:'relative' }}>
                  <button onClick={() => setExpanded(true)} style={{ position:'absolute', top:10, right:10, zIndex:1, background:'rgba(0,0,0,0.06)', border:'none', borderRadius:7, padding:'5px 9px', cursor:'pointer', fontSize:14, color:'#555' }} title="Expand">⤢</button>
                  <div style={{ background:'#fafafa', borderRadius:12, padding:'16px 20px', maxHeight:420, overflowY:'auto' }}>
                    <ChordDisplay lyrics={current.lyrics} />
                  </div>
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

      {expanded && current && (
        <div
          style={{ position:'fixed', inset:0, background:'#f7f6f2', zIndex:9999, display:'flex', flexDirection:'column' }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div style={{ background:'#fff', borderBottom:'1px solid rgba(0,0,0,0.08)', padding:'12px 16px', display:'flex', alignItems:'center', gap:12, flexShrink:0 }}>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontFamily:'var(--font-head)', fontWeight:700, fontSize:16, color:'#1a1a1a', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{current.title}</div>
              <div style={{ fontSize:12, color:'#888' }}>Key of {current.key} · {current.tempo}</div>
            </div>
            <button onClick={prev} disabled={idx===0} style={{ background:'none', border:'1.5px solid #e0e0e0', borderRadius:'50%', width:36, height:36, cursor:'pointer', fontSize:16, color:'#333', flexShrink:0 }}>←</button>
            <button onClick={next} disabled={idx===displaySongs.length-1} style={{ background:'none', border:'1.5px solid #e0e0e0', borderRadius:'50%', width:36, height:36, cursor:'pointer', fontSize:16, color:'#333', flexShrink:0 }}>→</button>
            <button onClick={() => setExpanded(false)} style={{ background:'none', border:'1.5px solid #e0e0e0', borderRadius:8, padding:'6px 12px', cursor:'pointer', fontSize:13, fontWeight:600, color:'#555', flexShrink:0, fontFamily:'inherit' }}>✕ Close</button>
          </div>
          <div style={{ background:'#fff', borderBottom:'1px solid rgba(0,0,0,0.06)', padding:'8px 16px', display:'flex', gap:8, overflowX:'auto', flexShrink:0 }}>
            {displaySongs.map((s,i) => (
              <button key={s.id} onClick={() => setIdx(i)} style={{
                padding:'5px 13px', borderRadius:20, border:'1.5px solid',
                borderColor: i===idx ? '#6c8fff' : '#e0e0e0',
                background: i===idx ? '#6c8fff' : '#fff',
                color: i===idx ? '#fff' : '#555',
                fontSize:12, fontWeight:500, cursor:'pointer',
                whiteSpace:'nowrap', fontFamily:'inherit', flexShrink:0
              }}>{i+1}. {s.title}</button>
            ))}
          </div>
          <div style={{ flex:1, overflowY:'auto', padding:'20px 24px' }}>
            <ChordDisplay lyrics={current.lyrics} />
          </div>
        </div>
      )}
    </div>
  )
}
