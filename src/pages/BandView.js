import React, { useState, useEffect, useRef } from 'react'
import { getSongs, getSets } from '../lib/supabase'
import { transposeLyrics } from '../lib/transpose'
import ChordDisplay from '../components/ChordDisplay'
import TransposeControl from '../components/TransposeControl'

function getNextSunday() {
  const d = new Date()
  while (d.getDay() !== 0) d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10)
}

export default function BandView({ songs: propSongs = [], sets: propSets = [] }) {
  const [selectedDate, setSelectedDate] = useState(getNextSunday)
  const [idx, setIdx] = useState(0)
  const [localSongs, setLocalSongs] = useState([])
  const [localSets, setLocalSets] = useState([])
  const [transposedKeys, setTransposedKeys] = useState({})
  const [expanded, setExpanded] = useState(false)
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('wf_theme') || 'dark'
    if (saved === 'light') document.documentElement.classList.add('light-mode')
    return saved
  })
  const touchStartX = useRef(null)

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    localStorage.setItem('wf_theme', next)
    if (next === 'light') document.documentElement.classList.add('light-mode')
    else document.documentElement.classList.remove('light-mode')
  }

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

  const selectedSet  = sets.find(s => s.service_date === selectedDate)
  const displaySongs = selectedSet
    ? selectedSet.song_ids.map(id => songs.find(s => s.id === id)).filter(Boolean)
    : []

  useEffect(() => {
    setTransposedKeys(selectedSet?.key_overrides || {})
  }, [selectedSet])

  const current = displaySongs[idx]
  const prev = () => setIdx(i => Math.max(0, i - 1))
  const next = () => setIdx(i => Math.min(displaySongs.length - 1, i + 1))

  const handleDateChange = (e) => { setSelectedDate(e.target.value); setIdx(0); setTransposedKeys({}) }
  const handleTouchStart = (e) => { touchStartX.current = e.touches[0].clientX }
  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return
    const diff = touchStartX.current - e.changedTouches[0].clientX
    if (Math.abs(diff) > 50) { diff > 0 ? next() : prev() }
    touchStartX.current = null
  }
  const handleTransposeChange = (songId, newKey) => {
    setTransposedKeys(prev => ({ ...prev, [songId]: newKey }))
  }

  const tempoColor = { Fast: '#ef4444', Medium: '#d97706', Slow: '#3b82f6' }
  const dateLabel = new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { month:'long', day:'numeric', year:'numeric' })

  const currentTransposedKey = current ? (transposedKeys[current.id] || current.key) : null
  const currentLyrics = (() => {
    if (!current?.lyrics) return current?.lyrics
    const override = transposedKeys[current.id]
    if (!override || override === current.key) return current.lyrics
    return transposeLyrics(current.lyrics, current.key, override)
  })()

  return (
    <div className="band-page">
      <div className="band-topbar">
        <div className="band-logo">WorshipFlow</div>
        <div style={{ display:'flex', alignItems:'center', gap:16 }}>
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
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            style={{ background:'none', border:'none', cursor:'pointer', fontSize:18, padding:'4px', color:'var(--muted)', lineHeight:1 }}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </div>
      <div className="band-content">
        {displaySongs.length === 0 ? (
          <div style={{ textAlign:'center', padding:'80px 20px', color:'var(--muted)' }}>
            <div style={{ fontSize:40, marginBottom:12 }}>🎸</div>
            <div style={{ fontSize:16, fontWeight:600, color:'var(--text)', marginBottom:6 }}>No set for {dateLabel}</div>
            <div style={{ fontSize:14 }}>No songs have been scheduled for this date yet.</div>
          </div>
        ) : (
          <>
            <div style={{ display:'flex', gap:8, marginBottom:20, overflowX:'auto', paddingBottom:4 }}>
              {displaySongs.map((s,i) => (
                <button key={s.id} onClick={()=>setIdx(i)} style={{
                  padding:'6px 14px', borderRadius:20, border:'1.5px solid',
                  borderColor: i===idx ? 'var(--accent)' : 'var(--border2)',
                  background: i===idx ? 'var(--accent)' : 'var(--bg3)',
                  color: i===idx ? '#fff' : 'var(--muted)',
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
                  <span style={{ color:'var(--muted)', fontWeight:400 }}>{currentTransposedKey === 'Numbers' ? '' : 'Key of'}</span>
                  <span style={{ color:'var(--text)' }}>{currentTransposedKey === 'Numbers' ? '# Numbers' : currentTransposedKey}</span>
                </div>
                <span style={{ display:'inline-flex', alignItems:'center', padding:'6px 14px', borderRadius:8, fontSize:13, fontWeight:500, background: (tempoColor[current.tempo] || '#888') + '18', color: tempoColor[current.tempo] || '#888' }}>
                  {current.tempo}
                </span>
              </div>
              {current.lyrics && (
                <div style={{ marginBottom:16, display:'flex', justifyContent:'center' }}>
                  <TransposeControl
                    originalKey={current.key}
                    transposedKey={currentTransposedKey}
                    onChange={(newKey) => handleTransposeChange(current.id, newKey)}
                    selectStyle={{ background:'var(--bg4)', border:'1px solid var(--border2)', color:'var(--text)' }}
                    labelStyle={{ color:'var(--muted)' }}
                  />
                </div>
              )}
              {current.lyrics ? (
                <div style={{ width:'100%', position:'relative' }}>
                  <button onClick={() => setExpanded(true)} style={{ position:'absolute', top:10, right:10, zIndex:1, background:'rgba(255,255,255,0.08)', border:'none', borderRadius:7, padding:'5px 9px', cursor:'pointer', fontSize:14, color:'var(--muted)' }} title="Expand">⤢</button>
                  <div style={{ background:'var(--bg3)', borderRadius:12, padding:'16px 20px', maxHeight:420, overflowY:'auto' }}>
                    <ChordDisplay lyrics={currentLyrics} chordColor="var(--accent)" lyricColor="var(--text)" />
                  </div>
                </div>
              ) : current.pdf_url ? (
                <iframe src={current.pdf_url} title={current.title} style={{ width:'100%', height:'500px', border:'none', borderRadius:'12px' }} />
              ) : (
                <div style={{ background:'var(--bg3)', borderRadius:12, padding:24, color:'var(--muted)', fontSize:13 }}>No chord chart uploaded yet</div>
              )}
            </div>
            <div className="band-nav">
              <button onClick={prev} disabled={idx===0}>←</button>
              <div className="band-dots">
                {displaySongs.map((_,i) => <div key={i} className={i===idx ? 'band-dot active' : 'band-dot'} />)}
              </div>
              <button onClick={next} disabled={idx===displaySongs.length-1}>→</button>
            </div>
            <div style={{ textAlign:'center', marginTop:16, fontSize:12, color:'var(--muted)' }}>Swipe left or right to navigate songs</div>
          </>
        )}
      </div>

      {expanded && current && (
        <div
          style={{ position:'fixed', inset:0, background:'var(--bg)', zIndex:9999, display:'flex', flexDirection:'column' }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div style={{ background:'var(--bg2)', borderBottom:'1px solid var(--border)', padding:'12px 16px', display:'flex', alignItems:'center', gap:12, flexShrink:0 }}>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontFamily:'var(--font-head)', fontWeight:700, fontSize:16, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{current.title}</div>
              <div style={{ fontSize:12, color:'var(--muted)' }}>{currentTransposedKey === 'Numbers' ? '# Numbers' : `Key of ${currentTransposedKey}`} · {current.tempo}</div>
            </div>
            <TransposeControl
              originalKey={current.key}
              transposedKey={currentTransposedKey}
              onChange={(newKey) => handleTransposeChange(current.id, newKey)}
              selectStyle={{ background:'var(--bg4)', border:'1px solid var(--border2)', color:'var(--text)' }}
              labelStyle={{ color:'var(--muted)' }}
            />
            <button onClick={prev} disabled={idx===0} style={{ background:'none', border:'1.5px solid var(--border2)', borderRadius:'50%', width:36, height:36, cursor:'pointer', fontSize:16, color:'var(--text)', flexShrink:0 }}>←</button>
            <button onClick={next} disabled={idx===displaySongs.length-1} style={{ background:'none', border:'1.5px solid var(--border2)', borderRadius:'50%', width:36, height:36, cursor:'pointer', fontSize:16, color:'var(--text)', flexShrink:0 }}>→</button>
            <button onClick={() => setExpanded(false)} style={{ background:'none', border:'1.5px solid var(--border2)', borderRadius:8, padding:'6px 12px', cursor:'pointer', fontSize:13, fontWeight:600, color:'var(--muted)', flexShrink:0, fontFamily:'inherit' }}>✕ Close</button>
          </div>
          <div style={{ background:'var(--bg2)', borderBottom:'1px solid var(--border)', padding:'8px 16px', display:'flex', gap:8, overflowX:'auto', flexShrink:0 }}>
            {displaySongs.map((s,i) => (
              <button key={s.id} onClick={() => setIdx(i)} style={{
                padding:'5px 13px', borderRadius:20, border:'1.5px solid',
                borderColor: i===idx ? 'var(--accent)' : 'var(--border2)',
                background: i===idx ? 'var(--accent)' : 'var(--bg3)',
                color: i===idx ? '#fff' : 'var(--muted)',
                fontSize:12, fontWeight:500, cursor:'pointer',
                whiteSpace:'nowrap', fontFamily:'inherit', flexShrink:0
              }}>{i+1}. {s.title}</button>
            ))}
          </div>
          <div style={{ flex:1, overflowY:'auto', padding:'20px 24px', background:'var(--bg2)' }}>
            <ChordDisplay lyrics={currentLyrics} chordColor="var(--accent)" lyricColor="var(--text)" />
          </div>
        </div>
      )}
    </div>
  )
}
