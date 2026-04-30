import React, { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '../components/Toast'
import i18n, { dateLocale } from '../i18n'
import { upsertSet, finalizeSet } from '../lib/supabase'
import { transposeLyrics } from '../lib/transpose'
import ChordDisplay from '../components/ChordDisplay'
import TransposeControl from '../components/TransposeControl'
import VariantSelect from '../components/VariantSelect'

function tempoEmoji(tempo) { return tempo==='Fast'?'⚡':tempo==='Medium'?'♩':'🎶' }

function getNextSunday() {
  const d = new Date()
  const day = d.getDay()
  const diff = day === 0 ? 0 : 7 - day
  d.setDate(d.getDate() + diff)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function ThisWeek({ songs, weekSongIds, setWeekSongIds, weekSongs, refreshSets, setPage, sets = [], activeChurch }) {
  const { t } = useTranslation()
  const toast = useToast()
  const [serviceDate, setServiceDate] = useState(getNextSunday())
  const [serviceTime, setServiceTime] = useState('')
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
  const [previewVariant, setPreviewVariant] = useState(null)

  useEffect(() => {
    const savedSet = sets.find(s => s.service_date === serviceDate && (s.service_time || '') === serviceTime)
    setKeyOverrides(savedSet?.key_overrides || {})
    const links = savedSet?.music_links || {}
    setSongSpotifyUrls(Object.fromEntries(Object.entries(links).map(([id, v]) => [id, v.spotify || ''])))
    setSongYoutubeUrls(Object.fromEntries(Object.entries(links).map(([id, v]) => [id, v.youtube || ''])))
    setSongAppleMusicUrls(Object.fromEntries(Object.entries(links).map(([id, v]) => [id, v.apple || ''])))
  }, [serviceDate, serviceTime, sets])

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
    if (!e.target.closest('[data-drag-handle]')) return
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
    if (!weekSongIds.length) return toast(t('thisWeek.addSongsFirst'), 'info')
    setSaving(true)
    try {
      await upsertSet(activeChurch?.id, serviceDate, weekSongIds, notes, keyOverrides, buildMusicLinks(), serviceTime)
      await refreshSets()
      toast(t('thisWeek.setSaved'), 'success')
    } catch(e) { toast(t('thisWeek.errorSave', { msg: e.message }), 'error') }
    setSaving(false)
  }

  const finalize = async () => {
    if (!weekSongIds.length) return toast(t('thisWeek.addSongsFirst'), 'info')
    if (!window.confirm(t('thisWeek.finalizeConfirm', { date: serviceDate }))) return
    setFinalizing(true)
    try {
      await finalizeSet(activeChurch?.id, serviceDate, weekSongIds, keyOverrides, buildMusicLinks(), serviceTime)
      await refreshSets()
      setWeekSongIds([])
      setNotes('')
      setSongSpotifyUrls({})
      setSongYoutubeUrls({})
      setSongAppleMusicUrls({})
      setKeyOverrides({})
      toast(t('thisWeek.setFinalized'), 'success')
    } catch(e) { toast(t('thisWeek.errorFinalize', { msg: e.message }), 'error') }
    setFinalizing(false)
  }

  const waMessage = (overrides = {}) => {
    const ids = overrides.songIds || weekSongIds
    const keys = overrides.keyOverrides || keyOverrides
    const spotify = overrides.spotify || songSpotifyUrls
    const youtube = overrides.youtube || songYoutubeUrls
    const apple = overrides.apple || songAppleMusicUrls
    const useSongs = ids.map(id => songs.find(s => s.id === id)).filter(Boolean)
    const date = new Date(serviceDate + 'T12:00:00').toLocaleDateString(dateLocale(i18n.language), { weekday:'long', month:'long', day:'numeric', year:'numeric' })
    const bandLink = activeChurch?.short_code
      ? `${window.location.origin}/band?c=${activeChurch.short_code}`
      : `${window.location.origin}/band`
    const recommendLink = activeChurch?.short_code
      ? `${window.location.origin}/recommend?c=${activeChurch.short_code}`
      : `${window.location.origin}/recommend`
    const songLines = useSongs.map((s,i) => {
      const eff = keys[s.id] || s.key
      return `${i+1}. *${s.title}* — ${s.artist||''}\n   Key: ${eff} | ${s.tempo}${spotify[s.id] ? `\n   🎵 ${spotify[s.id]}` : ''}${youtube[s.id] ? `\n   ▶️ ${youtube[s.id]}` : ''}${apple[s.id] ? `\n   🍎 ${apple[s.id]}` : ''}`
    }).join('\n\n')
    return `*${t('thisWeek.waMessage.title', { date })}*\n\n${songLines}\n\n${t('thisWeek.waMessage.chordsHeader')}\n${bandLink}\n\n${t('thisWeek.waMessage.recommendHeader')}\n${recommendLink}\n\n${t('thisWeek.waMessage.closing')}`
  }

  return (
    <div>
      <div className="grid-2" style={{ marginBottom:24 }}>
        <div className="stat-card">
          <div className="stat-label">{t('thisWeek.serviceDate')}</div>
          <div style={{ display:'flex', flexDirection:'column', gap:6, marginTop:4 }}>
            <input type="date" value={serviceDate} onChange={e=>setServiceDate(e.target.value)} style={{ width:'100%', maxWidth:'100%', fontSize:12, padding:'6px 8px', boxSizing:'border-box' }} />
            <input
              type="time"
              value={serviceTime}
              onChange={e => setServiceTime(e.target.value)}
              style={{ width:'100%', maxWidth:'100%', fontSize:12, padding:'6px 8px', boxSizing:'border-box' }}
            />
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{t('thisWeek.tempoMix')}</div>
          <div style={{ fontSize:15, fontWeight:500, marginTop:6, color:'var(--text)' }}>
            <span style={{ color:'var(--fast)' }}>{fast} {t('thisWeek.fast')}</span> · <span style={{ color:'var(--medium)' }}>{med} {t('thisWeek.mid')}</span> · <span style={{ color:'var(--slow)' }}>{slow} {t('thisWeek.slow')}</span>
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
          <div className="empty-text">{t('thisWeek.noSongsYet')}<br />{t('thisWeek.goToLibraryHint')}</div>
          <button className="btn btn-ghost" style={{ marginTop:16 }} onClick={()=>setPage('library')}>{t('thisWeek.goToLibrary')}</button>
        </div>
      ) : (
        <>
          <div style={{ marginBottom:8 }}>
            <div className="form-label" style={{ marginBottom:8 }}>{t('thisWeek.setOrder')} <span style={{ fontSize:11, color:'var(--muted)', fontWeight:400 }}>{t('thisWeek.dragToReorder')}</span></div>
            {weekSongs.map((s,i) => (
              <div
                key={s.id}
                data-drag-index={i}
                draggable
                onDragStart={() => handleDragStart(i)}
                onDragOver={(e) => handleDragOver(e, i)}
                onDrop={() => handleDrop(i)}
                onDragEnd={handleDragEnd}
                style={{ marginBottom:4, opacity: dragIdx === i ? 0.4 : 1, transition:'opacity 0.15s' }}
              >
              <div className="week-song" style={{
                flexDirection:'column', gap:0, alignItems:'stretch',
                outline: dragOverIdx === i && dragIdx !== i ? '2px solid var(--accent)' : 'none',
                borderRadius:10,
              }}>
                {/* Row 1: handle + number + thumb + title/artist + pdf + remove */}
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div
                    data-drag-handle
                    onTouchStart={(e) => handleTouchStart(e, i)}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    style={{ touchAction:'none', cursor:'grab', userSelect:'none', flexShrink:0, padding:'4px 2px', color:'var(--muted)', fontSize:18, lineHeight:1 }}
                  >⠿</div>
                  <div className="week-order" style={{ userSelect:'none', flexShrink:0 }}>{i+1}</div>
                  <div className="song-thumb" style={{ width:36,height:36,flexShrink:0 }}>{tempoEmoji(s.tempo)}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:600,fontSize:14,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{s.title}</div>
                    <div style={{ fontSize:12,color:'var(--muted)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{s.artist}</div>
                  </div>
                  {s.pdf_url && <a href={s.pdf_url} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm" style={{ flexShrink:0 }}>📄</a>}
                  <button className="btn btn-ghost btn-sm" style={{ color:'var(--red)', flexShrink:0 }} onClick={()=>setWeekSongIds(p=>p.filter(x=>x!==s.id))}>✕</button>
                </div>
                {/* Row 2: transpose + tempo + preview */}
                <div className="week-song-sub" style={{ display:'flex', alignItems:'center', gap:6, marginTop:8 }}>
                  <TransposeControl
                    originalKey={s.key}
                    transposedKey={effectiveKey(s)}
                    onChange={(newKey) => setKeyOverrides(p => ({ ...p, [s.id]: newKey }))}
                  />
                  <span className={`tag tag-${s.tempo?.toLowerCase()}`}>{t('tempos.' + s.tempo)}</span>
                  <button className="btn btn-ghost btn-sm" style={{ fontSize:11, padding:'4px 8px' }} onClick={() => { setPreviewSong(s); setPreviewVariant(null) }} title={t('thisWeek.previewTitle')}>👁</button>
                </div>
                {/* Rows 3-5: music links */}
                <div className="week-song-sub" style={{ display:'flex', alignItems:'center', gap:6, marginTop:8 }}>
                  <a href={`https://open.spotify.com/search/${encodeURIComponent(`${s.title} ${s.artist||''}`)}`} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm" style={{ color:'#1DB954', whiteSpace:'nowrap', flexShrink:0 }}>Spotify</a>
                  <input type="url" placeholder={t('thisWeek.pasteLink')} value={songSpotifyUrls[s.id] || ''} onChange={e => setSongSpotifyUrls(p => ({ ...p, [s.id]: e.target.value }))} style={{ flex:1, minWidth:0, fontSize:12, padding:'5px 10px', borderRadius:6, border:'1px solid var(--border2)', background:'var(--bg3)', color:'var(--text)' }} />
                  {songSpotifyUrls[s.id] && <a href={songSpotifyUrls[s.id]} target="_blank" rel="noreferrer" style={{ fontSize:12, color:'#1DB954', flexShrink:0 }}>▶</a>}
                </div>
                <div className="week-song-sub" style={{ display:'flex', alignItems:'center', gap:6, marginTop:6 }}>
                  <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(`${s.title} ${s.artist||''}`)}`} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm" style={{ color:'#FF0000', whiteSpace:'nowrap', flexShrink:0 }}>YouTube</a>
                  <input type="url" placeholder={t('thisWeek.pasteLink')} value={songYoutubeUrls[s.id] || ''} onChange={e => setSongYoutubeUrls(p => ({ ...p, [s.id]: e.target.value }))} style={{ flex:1, minWidth:0, fontSize:12, padding:'5px 10px', borderRadius:6, border:'1px solid var(--border2)', background:'var(--bg3)', color:'var(--text)' }} />
                  {songYoutubeUrls[s.id] && <a href={songYoutubeUrls[s.id]} target="_blank" rel="noreferrer" style={{ fontSize:12, color:'#FF0000', flexShrink:0 }}>▶</a>}
                </div>
                <div className="week-song-sub" style={{ display:'flex', alignItems:'center', gap:6, marginTop:6 }}>
                  <a href={`https://music.apple.com/search?term=${encodeURIComponent(`${s.title} ${s.artist||''}`)}`} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm" style={{ color:'#fc3c44', whiteSpace:'nowrap', flexShrink:0 }}>Apple</a>
                  <input type="url" placeholder={t('thisWeek.pasteLink')} value={songAppleMusicUrls[s.id] || ''} onChange={e => setSongAppleMusicUrls(p => ({ ...p, [s.id]: e.target.value }))} style={{ flex:1, minWidth:0, fontSize:12, padding:'5px 10px', borderRadius:6, border:'1px solid var(--border2)', background:'var(--bg3)', color:'var(--text)' }} />
                  {songAppleMusicUrls[s.id] && <a href={songAppleMusicUrls[s.id]} target="_blank" rel="noreferrer" style={{ fontSize:12, color:'#fc3c44', flexShrink:0 }}>▶</a>}
                </div>
              </div>
              </div>
            ))}
          </div>

          <div className="form-group" style={{ marginBottom:16 }}>
            <label className="form-label">{t('thisWeek.serviceNotes')}</label>
            <textarea placeholder={t('thisWeek.serviceNotesPlaceholder')} value={notes} onChange={e=>setNotes(e.target.value)} style={{ width:'100%' }} />
          </div>

          <div className="divider" />

          <div className="set-actions">
            <div className="set-actions-row">
              <button className="btn btn-ghost" onClick={saveSet} disabled={saving}>{saving ? t('common.saving') : t('thisWeek.saveSet')}</button>
              <button className="btn btn-gold" onClick={()=>setWaModal(true)}>{t('thisWeek.whatsapp')}</button>
            </div>
            <button className="btn btn-primary set-finalize-btn" onClick={finalize} disabled={finalizing}>{finalizing ? t('thisWeek.finalizing') : t('thisWeek.finalize')}</button>
          </div>
        </>
      )}

      {previewSong && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&(setPreviewSong(null)||setPreviewVariant(null))}>
          <div className="modal" style={{ maxWidth:560 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
              <div>
                <div style={{ fontFamily:'var(--font-head)', fontSize:18, fontWeight:700 }}>{previewSong.title}</div>
                <div style={{ fontSize:13, color:'var(--muted)' }}>{previewSong.artist}</div>
              </div>
              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                <span className="tag tag-key">{t('library.keyOf')} {effectiveKey(previewSong)}</span>
                <span className={`tag tag-${previewSong.tempo?.toLowerCase()}`}>{t('tempos.' + previewSong.tempo)}</span>
              </div>
            </div>
            <div style={{ marginBottom:14, display:'flex', flexWrap:'wrap', gap:8, alignItems:'center' }}>
              <TransposeControl
                originalKey={previewSong.key}
                transposedKey={effectiveKey(previewSong)}
                onChange={(newKey) => setKeyOverrides(p => ({ ...p, [previewSong.id]: newKey }))}
              />
              <VariantSelect
                songId={previewSong.id}
                value={previewVariant?.id || null}
                onChange={v => { setPreviewVariant(v); setKeyOverrides(p => ({ ...p })) }}
              />
            </div>
            {previewSong.lyrics ? (
              <ChordDisplay
                lyrics={(() => {
                  const source = previewVariant?.chord_data || previewSong.lyrics
                  const override = keyOverrides[previewSong.id]
                  return override && override !== previewSong.key
                    ? transposeLyrics(source, previewSong.key, override)
                    : source
                })()}
              />
            ) : previewSong.pdf_url ? (
              <iframe src={previewSong.pdf_url} title={previewSong.title} style={{ width:'100%', height:400, border:'none', borderRadius:10 }} />
            ) : (
              <div style={{ textAlign:'center', padding:32, color:'var(--muted)', fontSize:13 }}>{t('bandView.noChordChart')}</div>
            )}
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={()=>{ setPreviewSong(null); setPreviewVariant(null) }}>{t('common.close')}</button>
            </div>
          </div>
        </div>
      )}

      {waModal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setWaModal(false)}>
          <div className="modal">
            <div className="modal-title">{t('thisWeek.waMessageTitle')}</div>
            <div style={{ marginBottom:14, fontSize:13, color:'var(--muted)' }}>{t('thisWeek.waMessageHint')}</div>
            <div style={{ background:'#111b21', borderRadius:14, padding:20 }}>
              <div style={{ fontSize:11, color:'#8696a0', textAlign:'center', marginBottom:14 }}>
                {new Date().toLocaleDateString(dateLocale(i18n.language), { weekday:'long' })}
              </div>
              <div style={{ background:'#005c4b', borderRadius:'10px 10px 10px 2px', padding:'12px 14px', fontSize:13, lineHeight:1.6, color:'#e9edef', whiteSpace:'pre-wrap' }}
                dangerouslySetInnerHTML={{ __html: waMessage().replace(/\*(.*?)\*/g,'<b>$1</b>') }} />
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={()=>setWaModal(false)}>{t('common.close')}</button>
              <button className="btn btn-green" onClick={()=>{navigator.clipboard.writeText(waMessage());toast(t('common.copied'), 'success', 2000)}}>{t('thisWeek.copyMessage')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
