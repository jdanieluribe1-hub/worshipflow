import React, { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import i18n, { dateLocale, capDateWords } from '../i18n'
import { useParams, useSearchParams } from 'react-router-dom'
import { getSongs, getSets, getSongsForBand, getSetsForBand, getSongsForBandByShortCode, getSetsForBandByShortCode, listSongVariants, getPublishedVariant } from '../lib/supabase'
import { transposeLyrics } from '../lib/transpose'
import ChordDisplay from '../components/ChordDisplay'
import TransposeControl from '../components/TransposeControl'
import VariantSelect from '../components/VariantSelect'

function getToday() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function BandView({ songs: propSongs = [], sets: propSets = [], public: isPublic = false }) {
  const { t } = useTranslation()
  const params = useParams()
  const [searchParams] = useSearchParams()
  const token = params.token || null
  const shortCode = searchParams.get('c') || null
  const [selectedDate, setSelectedDate] = useState(getToday)
  const [idx, setIdx] = useState(0)
  const [localSongs, setLocalSongs] = useState([])
  const [localSets, setLocalSets] = useState([])
  const [transposedKeys, setTransposedKeys] = useState({})
  const [selectedVariants, setSelectedVariants] = useState({})
  const [expanded, setExpanded] = useState(false)
  const [error, setError] = useState(null)
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('wf_band_theme') || 'dark'
    if (isPublic) {
      if (saved === 'light') document.documentElement.classList.add('light-mode')
      else document.documentElement.classList.remove('light-mode')
    }
    return saved
  })
  const touchStartX = useRef(null)
  const touchStartY = useRef(null)

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    localStorage.setItem('wf_band_theme', next)
    if (isPublic) {
      if (next === 'light') document.documentElement.classList.add('light-mode')
      else document.documentElement.classList.remove('light-mode')
    }
  }

  // Self-fetch when used on the public /band route
  useEffect(() => {
    if (!isPublic) return
    if (shortCode) {
      Promise.all([getSongsForBandByShortCode(shortCode), getSetsForBandByShortCode(shortCode)])
        .then(([s, st]) => { setLocalSongs(s || []); setLocalSets(st || []) })
        .catch(err => { console.error(err); setError(t('bandView.loadError')) })
    } else if (token) {
      Promise.all([getSongsForBand(token), getSetsForBand(token)])
        .then(([s, st]) => { setLocalSongs(s || []); setLocalSets(st || []) })
        .catch(err => { console.error(err); setError(t('bandView.loadError')) })
    }
  }, [isPublic, token, shortCode])

  const songs = propSongs.length ? propSongs : localSongs
  const sets  = propSets.length  ? propSets  : localSets

  const selectedSet  = sets.find(s => s.service_date === selectedDate)
  const displaySongs = selectedSet
    ? selectedSet.song_ids.map(id => songs.find(s => s.id === id)).filter(Boolean)
    : []

  useEffect(() => {
    setTransposedKeys(selectedSet?.key_overrides || {})
    const variantIds = selectedSet?.variant_overrides || {}
    if (!Object.keys(variantIds).length) { setSelectedVariants({}); return }
    Promise.all(
      Object.entries(variantIds).map(([songId, variantId]) =>
        (isPublic
          ? getPublishedVariant(variantId)
          : listSongVariants(songId).then(vs => vs.find(v => v.id === variantId) || null)
        ).then(v => [songId, v]).catch(() => [songId, null])
      )
    ).then(entries => {
      setSelectedVariants(Object.fromEntries(entries.filter(([, v]) => v)))
    })
  }, [selectedSet])

  const current = displaySongs[idx]
  const prev = () => setIdx(i => Math.max(0, i - 1))
  const next = () => setIdx(i => Math.min(displaySongs.length - 1, i + 1))

  const handleDateChange = (e) => { setSelectedDate(e.target.value); setIdx(0); setTransposedKeys({}) }
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }
  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return
    const diffX = touchStartX.current - e.changedTouches[0].clientX
    const diffY = touchStartY.current - e.changedTouches[0].clientY
    // Only trigger swipe when horizontal movement dominates and exceeds threshold
    if (Math.abs(diffX) > 50 && Math.abs(diffX) > Math.abs(diffY) * 1.5) {
      diffX > 0 ? next() : prev()
    }
    touchStartX.current = null
    touchStartY.current = null
  }
  const handleTransposeChange = (songId, newKey) => {
    setTransposedKeys(prev => ({ ...prev, [songId]: newKey }))
  }

  const tempoColor = { Fast: '#ef4444', Medium: '#d97706', Slow: '#3b82f6' }
  const dateLabel = capDateWords(new Date(selectedDate + 'T12:00:00').toLocaleDateString(dateLocale(i18n.language), { month:'long', day:'numeric', year:'numeric' }))

  const currentTransposedKey = current ? (transposedKeys[current.id] || current.key) : null
  const currentLyrics = (() => {
    if (!current) return null
    const source = selectedVariants[current.id]?.chord_data || current.lyrics
    if (!source) return source
    const override = transposedKeys[current.id]
    if (!override || override === current.key) return source
    return transposeLyrics(source, current.key, override)
  })()

  if (error) return (
    <div className="band-page">
      <div className="band-topbar">
        <div className="band-logo">WorshipFlow</div>
      </div>
      <div className="band-content" style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--muted)' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>{error}</div>
        <div style={{ fontSize: 14 }}>{t('bandView.loadErrorHint')}</div>
      </div>
    </div>
  )

  return (
    <div className="band-page">
      <div className="band-topbar">
        <div className="band-logo">WorshipFlow</div>
        <div style={{ display:'flex', alignItems:'center', gap:20 }}>
          <label style={{ position:'relative', cursor:'pointer', userSelect:'none', overflow:'hidden' }}>
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
          {isPublic && <button
            onClick={toggleTheme}
            title={theme === 'dark' ? t('bandView.switchToLight') : t('bandView.switchToDark')}
            style={{ background:'none', border:'none', cursor:'pointer', fontSize:18, padding:'8px', color:'var(--muted)', lineHeight:1, flexShrink:0 }}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>}
        </div>
      </div>
      <div className="band-content">
        {displaySongs.length === 0 ? (
          <div style={{ textAlign:'center', padding:'80px 20px', color:'var(--muted)' }}>
            <div style={{ fontSize:40, marginBottom:12 }}>🎸</div>
            <div style={{ fontSize:16, fontWeight:600, color:'var(--text)', marginBottom:6 }}>{t('bandView.noSetForDate', { date: dateLabel })}</div>
            <div style={{ fontSize:14 }}>{t('bandView.noSongsScheduled')}</div>
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
              <div className="band-song-num">{t('bandView.songNofM', { n: idx+1, m: displaySongs.length })}</div>
              <div className="band-song-title">{current.title}</div>
              <div className="band-song-artist">{current.artist}</div>
              <div style={{ display:'flex', gap:8, justifyContent:'center', marginBottom:20, flexWrap:'wrap' }}>
                <div className="band-key">
                  <span style={{ color:'var(--muted)', fontWeight:400 }}>{currentTransposedKey === 'Numbers' ? '' : t('library.keyOf')}</span>
                  <span style={{ color:'var(--text)' }}>{currentTransposedKey === 'Numbers' ? t('bandView.keyOfNumbers') : currentTransposedKey}</span>
                </div>
                <span style={{ display:'inline-flex', alignItems:'center', padding:'6px 14px', borderRadius:8, fontSize:13, fontWeight:500, background: (tempoColor[current.tempo] || '#888') + '18', color: tempoColor[current.tempo] || '#888' }}>
                  {t('tempos.' + current.tempo)}
                </span>
              </div>
              {current.lyrics && (
                <div style={{ marginBottom:16, display:'flex', justifyContent:'center', flexWrap:'wrap', gap:8 }}>
                  <TransposeControl
                    originalKey={current.key}
                    transposedKey={currentTransposedKey}
                    onChange={(newKey) => handleTransposeChange(current.id, newKey)}
                    selectStyle={{ background:'var(--bg4)', border:'1px solid var(--border2)', color:'var(--text)' }}
                    labelStyle={{ color:'var(--muted)' }}
                  />
                  {!isPublic && (
                    <VariantSelect
                      songId={current.id}
                      value={selectedVariants[current.id]?.id || null}
                      onChange={v => setSelectedVariants(p => ({ ...p, [current.id]: v || undefined }))}
                    />
                  )}
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
                <div style={{ background:'var(--bg3)', borderRadius:12, padding:24, color:'var(--muted)', fontSize:13 }}>{t('bandView.noChordChartYet')}</div>
              )}
            </div>
            <div className="band-nav">
              <button onClick={prev} disabled={idx===0}>←</button>
              <div className="band-dots">
                {displaySongs.map((_,i) => <div key={i} className={i===idx ? 'band-dot active' : 'band-dot'} />)}
              </div>
              <button onClick={next} disabled={idx===displaySongs.length-1}>→</button>
            </div>
            <div style={{ textAlign:'center', marginTop:16, fontSize:12, color:'var(--muted)' }}>{t('bandView.swipeHint')}</div>
          </>
        )}
      </div>

      {expanded && current && (
        <div
          style={{ position:'fixed', inset:0, background:'var(--bg)', zIndex:9999, display:'flex', flexDirection:'column' }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div style={{ background:'var(--bg2)', borderBottom:'1px solid var(--border)', padding:'12px 16px', paddingTop:'calc(12px + env(safe-area-inset-top))', display:'flex', alignItems:'center', gap:12, flexShrink:0 }}>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontFamily:'var(--font-head)', fontWeight:700, fontSize:16, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{current.title}</div>
              <div style={{ fontSize:12, color:'var(--muted)' }}>{currentTransposedKey === 'Numbers' ? t('bandView.keyOfNumbers') : `${t('library.keyOf')} ${currentTransposedKey}`} · {t('tempos.' + current.tempo)}</div>
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
            <button onClick={() => setExpanded(false)} style={{ background:'none', border:'1.5px solid var(--border2)', borderRadius:8, padding:'6px 12px', cursor:'pointer', fontSize:13, fontWeight:600, color:'var(--muted)', flexShrink:0, fontFamily:'inherit' }}>{t('bandView.close')}</button>
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
          <div style={{ flex:1, overflowY:'auto', background:'var(--bg2)' }}>
            <ChordDisplay
              lyrics={currentLyrics}
              chordColor="var(--accent)"
              lyricColor="var(--text)"
              containerStyle={{ background:'transparent', borderRadius:0, maxHeight:'none', overflowY:'visible', padding:'24px 32px', fontSize:15 }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
