import React, { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '../components/Toast'
import { addSong, deleteSong, updateSong, getPublicTemplateSongs, importTemplateSong } from '../lib/supabase'
import { parsePDFWithAI, generateProPresenterFile, stripChords } from '../lib/ai'
import { transposeLyrics } from '../lib/transpose'
import ChordDisplay from '../components/ChordDisplay'
import TransposeControl from '../components/TransposeControl'
import VariantSelect from '../components/VariantSelect'

const KEYS = [
  'C','C#/Db','D','D#/Eb','E','F','F#/Gb','G','G#/Ab','A','A#/Bb','B',
  'Cm','C#m','Dm','D#m','Em','Fm','F#m','Gm','G#m','Am','A#m','Bm',
]
const TEMPOS = ['Fast','Medium','Slow']
const THEMES = ['Praise','Worship','Prayer','Communion','Offering','Closing','Opening','Christmas','Easter','Thanksgiving']
const SPECIALTY = ['Contemporary','Traditional','Hymn','Spanish','Bilingual','Acoustic','Youth','Children','Advent']

function tempoEmoji(tempo) { return tempo==='Fast'?'⚡':tempo==='Medium'?'♩':'🎶' }

export default function Library({ songs, weekSongIds, setWeekSongIds, refreshSongs, activeChurch, pendingOpenSong, setPendingOpenSong, setPage }) {
  const { t } = useTranslation()
  const toast = useToast()
  const [activeTab, setActiveTab] = useState('my-library')
  const [filter, setFilter] = useState({ tempo: 'all', key: 'all', search: '' })
  const [showDuplicates, setShowDuplicates] = useState(false)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({ title:'', artist:'', key:'G', tempo:'Medium', themes:[], notes:'' })
  const [saving, setSaving] = useState(false)
  const [detailSong, setDetailSong] = useState(null)
  const [converting, setConverting] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [viewTransposedKey, setViewTransposedKey] = useState(null)
  const [selectedVariant, setSelectedVariant] = useState(null)
  const [proPresenterBin, setProPresenterBin] = useState(null)

  // Dani's Database state
  const [templateSongs, setTemplateSongs] = useState([])
  const [templateLoading, setTemplateLoading] = useState(false)
  const [importing, setImporting] = useState({})

  // Set of template IDs already imported into this church
  const importedTemplateIds = useMemo(
    () => new Set(songs.filter(s => s.source_template_id).map(s => s.source_template_id)),
    [songs]
  )

  const loadTemplateSongs = () => {
    setTemplateLoading(true)
    getPublicTemplateSongs()
      .then(data => setTemplateSongs(data || []))
      .catch(console.error)
      .finally(() => setTemplateLoading(false))
  }

  useEffect(() => {
    if (activeTab === 'danis-database' && templateSongs.length === 0 && !templateLoading) {
      loadTemplateSongs()
    }
  }, [activeTab])

  const openDetail = (s) => { setDetailSong(s); setEditing(false); setViewTransposedKey(null); setProPresenterBin(null); setSelectedVariant(null) }
  const closeDetail = () => { setDetailSong(null); setEditing(false); setViewTransposedKey(null); setProPresenterBin(null); setSelectedVariant(null) }

  useEffect(() => {
    if (pendingOpenSong) {
      openDetail(pendingOpenSong)
      setPendingOpenSong(null)
    }
  }, [pendingOpenSong])

  const startEdit = () => {
    setEditForm({
      title:    detailSong.title    || '',
      artist:   detailSong.artist   || '',
      key:      detailSong.key      || 'G',
      tempo:    detailSong.tempo    || 'Medium',
      themes:   detailSong.themes   || [],
      specialty:detailSong.specialty|| [],
      notes:    detailSong.notes    || '',
    })
    setEditing(true)
  }

  const handleEditSave = async () => {
    if (!editForm.title.trim()) return toast(t('library.pleaseEnterTitle'), 'info')
    setSaving(true)
    try {
      const updates = {
        title:    editForm.title.trim(),
        artist:   editForm.artist.trim(),
        key:      editForm.key,
        tempo:    editForm.tempo,
        themes:   editForm.themes,
        specialty:editForm.specialty,
        notes:    editForm.notes,
      }
      await updateSong(detailSong.id, updates)
      await refreshSongs()
      setDetailSong(s => ({ ...s, ...updates }))
      setEditing(false)
    } catch (e) { toast(t('errors.saveFailed', { msg: e.message }), 'error') }
    setSaving(false)
  }

  const toggleEditTheme = (theme) =>
    setEditForm(f => ({ ...f, themes: f.themes.includes(theme) ? f.themes.filter(x=>x!==theme) : [...f.themes, theme] }))

  const toggleEditSpecialty = (sp) =>
    setEditForm(f => ({ ...f, specialty: f.specialty.includes(sp) ? f.specialty.filter(x=>x!==sp) : [...f.specialty, sp] }))

  const duplicateTitles = useMemo(() => {
    const counts = {}
    songs.forEach(s => { const k = s.title.trim().toLowerCase(); counts[k] = (counts[k] || 0) + 1 })
    return new Set(Object.keys(counts).filter(k => counts[k] > 1))
  }, [songs])

  const filtered = useMemo(() => {
    const pool = activeTab === 'my-library' ? songs : templateSongs
    const seen = new Set()
    return pool.filter(s => {
      if (filter.tempo !== 'all' && s.tempo !== filter.tempo) return false
      if (filter.key !== 'all' && s.key !== filter.key) return false
      if (filter.search && !s.title.toLowerCase().includes(filter.search.toLowerCase()) && !(s.artist||'').toLowerCase().includes(filter.search.toLowerCase())) return false
      const key = s.title.trim().toLowerCase()
      if (showDuplicates) return duplicateTitles.has(key)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [activeTab, songs, templateSongs, filter, showDuplicates, duplicateTitles])

  const toggleWeek = (id, e) => {
    e.stopPropagation()
    setWeekSongIds(prev => prev.includes(id) ? prev.filter(x=>x!==id) : [...prev, id])
  }

  const toggleTheme = (theme) => {
    setForm(f => ({ ...f, themes: f.themes.includes(theme) ? f.themes.filter(x=>x!==theme) : [...f.themes, theme] }))
  }

  const handleAdd = async () => {
    if (!form.title.trim()) return toast(t('library.pleaseEnterTitle'), 'info')
    const normalizedTitle = form.title.trim().toLowerCase()
    if (songs.some(s => s.title.trim().toLowerCase() === normalizedTitle)) {
      return toast(t('library.duplicateSong', { title: form.title.trim() }), 'info')
    }
    setSaving(true)
    try {
      await addSong({ title: form.title.trim(), artist: form.artist.trim(), key: form.key, tempo: form.tempo, themes: form.themes, specialty: [], notes: form.notes, plays_3weeks: 0, plays_3months: 0, plays_year: 0, church_id: activeChurch?.id })
      await refreshSongs()
      setModal(null)
      setForm({ title:'', artist:'', key:'G', tempo:'Medium', themes:[], notes:'' })
    } catch(e) { toast(t('errors.saveSongFailed', { msg: e.message }), 'error') }
    setSaving(false)
  }

  const handleConvertPDF = async () => {
    setConverting(true)
    try {
      const response = await fetch(detailSong.pdf_url)
      const blob = await response.blob()
      const base64 = await new Promise((res, rej) => {
        const reader = new FileReader()
        reader.onload = () => res(reader.result.split(',')[1])
        reader.onerror = rej
        reader.readAsDataURL(blob)
      })
      const result = await parsePDFWithAI(base64)
      if (!result.lyrics) throw new Error(t('errors.couldNotExtractLyrics'))
      const updates = {
        lyrics: result.lyrics,
        ...(result.key   ? { key:   result.key   } : {}),
        ...(result.title ? { title: result.title } : {}),
        ...(result.artist? { artist:result.artist} : {}),
        ...(result.tempo ? { tempo: result.tempo } : {}),
      }
      await updateSong(detailSong.id, updates)
      await refreshSongs()
      setDetailSong(s => ({ ...s, ...updates }))
    } catch (e) {
      toast(t('errors.convertPDFFailed', { msg: e.message }), 'error')
    }
    setConverting(false)
  }

  const handleDelete = async (id) => {
    if (!window.confirm(t('library.deleteConfirm'))) return
    await deleteSong(id)
    await refreshSongs()
    closeDetail()
  }

  const handleSaveTransposedKey = async () => {
    if (!viewTransposedKey || !detailSong) return
    setSaving(true)
    try {
      const newLyrics = transposeLyrics(detailSong.lyrics, detailSong.key, viewTransposedKey)
      const updates = { key: viewTransposedKey, lyrics: newLyrics }
      await updateSong(detailSong.id, updates)
      await refreshSongs()
      setDetailSong(s => ({ ...s, ...updates }))
      setViewTransposedKey(null)
    } catch(e) { toast(t('errors.saveFailed', { msg: e.message }), 'error') }
    setSaving(false)
  }

  const handleImportTemplate = async (song) => {
    if (!activeChurch?.id) return
    setImporting(p => ({ ...p, [song.id]: true }))
    try {
      await importTemplateSong(song.id, activeChurch.id)
      await refreshSongs()
    } catch (e) {
      toast('Error adding to library: ' + e.message, 'error')
    }
    setImporting(p => { const n = { ...p }; delete n[song.id]; return n })
  }

  const isTemplate = activeTab === 'danis-database'

  return (
    <div>
      {/* Tab switcher */}
      <div style={{ display:'flex', gap:0, marginBottom:20, borderBottom:'1px solid var(--border)' }}>
        <button
          onClick={() => { setActiveTab('my-library'); setShowDuplicates(false) }}
          style={{ padding:'8px 20px', background:'none', border:'none', borderBottom: activeTab === 'my-library' ? '2px solid var(--accent)' : '2px solid transparent', color: activeTab === 'my-library' ? 'var(--text)' : 'var(--muted)', cursor:'pointer', fontWeight: activeTab === 'my-library' ? 600 : 400, fontSize:14 }}
        >
          {t('library.myLibraryTab')}
        </button>
        <button
          onClick={() => { setActiveTab('danis-database'); setShowDuplicates(false) }}
          style={{ padding:'8px 20px', background:'none', border:'none', borderBottom: activeTab === 'danis-database' ? '2px solid var(--accent)' : '2px solid transparent', color: activeTab === 'danis-database' ? 'var(--text)' : 'var(--muted)', cursor:'pointer', fontWeight: activeTab === 'danis-database' ? 600 : 400, fontSize:14 }}
        >
          ✦ Dani's Database
        </button>
      </div>

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        {activeTab === 'my-library' ? (
          <button className="btn btn-primary" onClick={() => setModal('add')}>{t('library.addSong')}</button>
        ) : (
          <div style={{ fontSize:13, color:'var(--muted)' }}>{t('library.danisDatabaseDesc')}</div>
        )}
        <div />
      </div>

      <div className="filter-bar">
        <div className="search-wrap" style={{ minWidth:220 }}>
          <span className="search-icon">🔍</span>
          <input type="text" placeholder={t('library.searchPlaceholder')} value={filter.search} onChange={e => setFilter(f=>({...f,search:e.target.value}))} />
        </div>
        {['all','Fast','Medium','Slow'].map(tempo => (
          <button key={tempo} className={`filter-btn ${tempo.toLowerCase()} ${filter.tempo===tempo?'active':''}`} onClick={() => setFilter(f=>({...f,tempo:tempo}))}>
            {tempo === 'all' ? t('library.allTempos') : t('tempos.' + tempo)}
          </button>
        ))}
        <select value={filter.key} onChange={e => setFilter(f=>({...f,key:e.target.value}))}>
          <option value="all">{t('library.allKeys')}</option>
          {KEYS.map(k => <option key={k} value={k}>{k}</option>)}
        </select>
        {activeTab === 'my-library' && duplicateTitles.size > 0 && (
          <button
            className={`filter-btn ${showDuplicates ? 'active' : ''}`}
            onClick={() => setShowDuplicates(d => !d)}
            style={{ color: showDuplicates ? undefined : 'var(--muted)' }}
          >
            Duplicates ({duplicateTitles.size})
          </button>
        )}
      </div>

      <div style={{ marginBottom:12, fontSize:12, color:'var(--muted)' }}>
        {templateLoading && isTemplate ? t('common.loading') : `${filtered.length} ${filtered.length !== 1 ? t('common.songs') : t('common.song')}`}
      </div>

      {templateLoading && isTemplate ? null : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">♪</div>
          <div className="empty-text">{isTemplate ? t('library.noDanisSongs') : t('library.noSongsFound')}</div>
        </div>
      ) : filtered.map(s => {
        const inWeek = weekSongIds.includes(s.id)
        const alreadyAdded = isTemplate && importedTemplateIds.has(s.id)
        const isImporting = importing[s.id]
        return (
          <div key={s.id} className={`song-row ${!isTemplate && inWeek ? 'selected' : ''}`} onClick={() => openDetail(s)}>
            <div className="song-thumb">{tempoEmoji(s.tempo)}</div>
            <div className="song-info">
              <div className="song-title">{s.title}</div>
              <div className="song-artist">{s.artist}</div>
              <div className="song-tags">
                <span className={`tag tag-${s.tempo?.toLowerCase()}`}>{t('tempos.' + s.tempo)}</span>
                <span className="tag tag-key">{s.key}</span>
                {(s.specialty||[]).map(sp => <span key={sp} className="tag tag-specialty">{t('specialties.' + sp)}</span>)}
              </div>
            </div>
            {isTemplate ? (
              <button
                className={`btn btn-sm ${alreadyAdded ? 'btn-ghost' : 'btn-primary'}`}
                onClick={e => { e.stopPropagation(); if (!alreadyAdded) handleImportTemplate(s) }}
                disabled={alreadyAdded || isImporting}
              >
                {isImporting ? '...' : alreadyAdded ? t('library.alreadyAdded') : t('library.addToLibrary')}
              </button>
            ) : (
              <>
                <div className="song-plays">{s.plays_year||0} {t('common.plays')}</div>
                <button className={`btn btn-sm ${inWeek?'btn-primary':'btn-ghost'}`} onClick={e=>toggleWeek(s.id,e)}>
                  {inWeek ? t('library.inWeek') : t('library.addToWeek')}
                </button>
              </>
            )}
          </div>
        )
      })}

      {/* ADD MODAL */}
      {modal === 'add' && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setModal(null)}>
          <div className="modal">
            <div className="modal-title">{t('library.addNewSong')}</div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">{t('library.songTitle')}</label>
                <input type="text" placeholder={t('library.songTitlePlaceholder')} value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} />
              </div>
              <div className="form-group">
                <label className="form-label">{t('library.artist')}</label>
                <input type="text" placeholder={t('library.artistPlaceholder')} value={form.artist} onChange={e=>setForm(f=>({...f,artist:e.target.value}))} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">{t('library.key')}</label>
                <select value={form.key} onChange={e=>setForm(f=>({...f,key:e.target.value}))}>
                  {KEYS.map(k=><option key={k}>{k}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">{t('library.tempo')}</label>
                <select value={form.tempo} onChange={e=>setForm(f=>({...f,tempo:e.target.value}))}>
                  {TEMPOS.map(tempo=><option key={tempo} value={tempo}>{t('tempos.' + tempo)}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">{t('library.themes')}</label>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:4 }}>
                {THEMES.map(theme => (
                  <button key={theme} className={`filter-btn ${form.themes.includes(theme)?'active':''}`} onClick={()=>toggleTheme(theme)}>{t('themes.' + theme)}</button>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">{t('library.notes')}</label>
              <textarea placeholder={t('library.notesPlaceholder')} value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} />
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={()=>setModal(null)}>{t('common.cancel')}</button>
              <button className="btn btn-primary" onClick={handleAdd} disabled={saving}>{saving ? t('common.saving') : t('library.addSong')}</button>
            </div>
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {detailSong && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&!editing&&closeDetail()}>
          <div className="modal">
            {!editing && <button className="modal-close-x" onClick={closeDetail}>✕</button>}
            {editing ? (
              <>
                <div className="modal-title">{t('library.editSong')}</div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">{t('library.songTitle')}</label>
                    <input type="text" value={editForm.title} onChange={e=>setEditForm(f=>({...f,title:e.target.value}))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{t('library.artist')}</label>
                    <input type="text" value={editForm.artist} onChange={e=>setEditForm(f=>({...f,artist:e.target.value}))} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">{t('library.key')}</label>
                    <select value={editForm.key} onChange={e=>setEditForm(f=>({...f,key:e.target.value}))}>
                      {KEYS.map(k=><option key={k}>{k}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">{t('library.tempo')}</label>
                    <select value={editForm.tempo} onChange={e=>setEditForm(f=>({...f,tempo:e.target.value}))}>
                      {TEMPOS.map(tempo=><option key={tempo} value={tempo}>{t('tempos.' + tempo)}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">{t('library.themes')}</label>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:4 }}>
                    {THEMES.map(theme=>(
                      <button key={theme} className={`filter-btn ${editForm.themes.includes(theme)?'active':''}`} onClick={()=>toggleEditTheme(theme)}>{t('themes.' + theme)}</button>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">{t('library.specialty')}</label>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:4 }}>
                    {SPECIALTY.map(sp=>(
                      <button key={sp} className={`filter-btn ${editForm.specialty.includes(sp)?'active':''}`} onClick={()=>toggleEditSpecialty(sp)}>{t('specialties.' + sp)}</button>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">{t('library.notes')}</label>
                  <textarea value={editForm.notes} onChange={e=>setEditForm(f=>({...f,notes:e.target.value}))} placeholder={t('library.notesPlaceholder')} />
                </div>
                <div className="modal-footer">
                  <button className="btn btn-ghost" onClick={()=>setEditing(false)}>{t('common.cancel')}</button>
                  <button className="btn btn-primary" onClick={handleEditSave} disabled={saving}>{saving ? t('common.saving') : t('library.saveChanges')}</button>
                </div>
              </>
            ) : (
              <>
                <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:16 }}>
                  <div className="song-thumb" style={{ width:52,height:52,fontSize:22 }}>{tempoEmoji(detailSong.tempo)}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontFamily:'var(--font-head)',fontSize:20,fontWeight:700 }}>{detailSong.title}</div>
                    <div style={{ color:'var(--muted)',fontSize:13 }}>{detailSong.artist}</div>
                    {isTemplate && (
                      <div style={{ fontSize:11, color:'var(--accent)', marginTop:2 }}>✦ Dani's Database</div>
                    )}
                  </div>
                </div>
                <div style={{ display:'flex', alignItems:'flex-start', gap:10, marginBottom:16 }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex',gap:8,flexWrap:'wrap',marginBottom:10 }}>
                      <span className={`tag tag-${detailSong.tempo?.toLowerCase()}`}>{t('tempos.' + detailSong.tempo)}</span>
                      <span className="tag tag-key">{t('library.keyOf')} {detailSong.key}</span>
                      {(detailSong.themes||[]).map(theme=><span key={theme} className="tag tag-theme">{t('themes.' + theme)}</span>)}
                      {(detailSong.specialty||[]).map(sp=><span key={sp} className="tag tag-specialty">{t('specialties.' + sp)}</span>)}
                    </div>
                    {detailSong.lyrics && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                        <TransposeControl
                          originalKey={detailSong.key}
                          transposedKey={viewTransposedKey || detailSong.key}
                          onChange={setViewTransposedKey}
                        />
                        {!isTemplate && (
                          <>
                            <VariantSelect
                              songId={detailSong.id}
                              value={selectedVariant?.id || null}
                              onChange={v => { setSelectedVariant(v); setViewTransposedKey(null) }}
                            />
                            {setPage && (
                              <button
                                className="btn btn-ghost btn-sm"
                                onClick={() => { setPendingOpenSong(detailSong); setPage('editor') }}
                              >
                                {t('library.editVariants')}
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  {!isTemplate && (
                    <div className="modal-top-actions">
                      <button className="btn btn-ghost btn-sm" onClick={startEdit}>{t('common.edit')}</button>
                      <button className={`btn btn-sm ${weekSongIds.includes(detailSong.id)?'btn-primary':'btn-ghost'}`} onClick={()=>toggleWeek(detailSong.id,{stopPropagation:()=>{}})}>
                        {weekSongIds.includes(detailSong.id) ? t('library.inWeek') : t('library.addToWeek')}
                      </button>
                    </div>
                  )}
                </div>
                {detailSong.notes && <div style={{ background:'var(--bg3)',borderRadius:8,padding:'12px 14px',fontSize:13,color:'var(--muted)',marginBottom:16 }}>{detailSong.notes}</div>}
                {!isTemplate && (
                  <div style={{ marginBottom:16 }}>
                    <div className="form-label" style={{ marginBottom:8 }}>{t('library.playHistory')}</div>
                    <div className="grid-3 stat-grid">
                      {[[t('library.threeWeeks'),detailSong.plays_3weeks],[t('library.threeMonths'),detailSong.plays_3months],[t('library.thisYear'),detailSong.plays_year]].map(([label,val])=>(
                        <div key={label} className="stat-card card-sm">
                          <div className="stat-label">{label}</div>
                          <div className="stat-value" style={{ fontSize:22 }}>{val||0}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {detailSong.pdf_url && (
                  <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
                    <a href={detailSong.pdf_url} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">{t('library.viewPDF')}</a>
                    {!isTemplate && !detailSong.lyrics && (
                      <button className="btn btn-ghost btn-sm" onClick={handleConvertPDF} disabled={converting}>
                        {converting ? t('library.converting') : t('library.convertPDF')}
                      </button>
                    )}
                  </div>
                )}
                {detailSong.lyrics && (
                  <div style={{ marginBottom:16 }}>
                    <div className="form-label" style={{ marginBottom:8 }}>{t('library.lyrics')}</div>
                    <ChordDisplay
                      lyrics={(() => {
                        const source = selectedVariant?.chord_data || detailSong.lyrics
                        const baseKey = detailSong.key
                        return viewTransposedKey && viewTransposedKey !== baseKey
                          ? transposeLyrics(source, baseKey, viewTransposedKey)
                          : source
                      })()}
                    />
                  </div>
                )}
                {!isTemplate && detailSong.lyrics && (
                  <div style={{ marginBottom:16 }}>
                    <div className="form-label" style={{ marginBottom:8 }}>{t('library.proPresenter')}</div>
                    {!proPresenterBin ? (
                      <button className="btn btn-ghost btn-sm" onClick={() => setProPresenterBin(generateProPresenterFile(detailSong.title, detailSong.key, detailSong.lyrics))}>
                        {t('library.generateProFile')}
                      </button>
                    ) : (
                      <>
                        <div className="propre-box">{stripChords(detailSong.lyrics)}</div>
                        <div style={{ display:'flex', gap:8, marginTop:8 }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => { navigator.clipboard.writeText(stripChords(detailSong.lyrics)); toast(t('common.copied'), 'success', 2000) }}>{t('library.copyText')}</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => {
                            const blob = new Blob([proPresenterBin], { type: 'application/octet-stream' })
                            const a = document.createElement('a')
                            a.href = URL.createObjectURL(blob)
                            a.download = `${detailSong.title.replace(/[^a-zA-Z0-9]/g,'-')}.pro`
                            a.click()
                          }}>{t('library.downloadPro')}</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => setProPresenterBin(null)}>{t('library.hide')}</button>
                        </div>
                      </>
                    )}
                  </div>
                )}
                <div className="modal-footer">
                  {isTemplate ? (
                    <>
                      <div style={{ flex:1 }} />
                      {(() => {
                        const alreadyAdded = importedTemplateIds.has(detailSong.id)
                        const isImporting = importing[detailSong.id]
                        return (
                          <button
                            className={`btn ${alreadyAdded ? 'btn-ghost' : 'btn-primary'}`}
                            onClick={() => { if (!alreadyAdded) handleImportTemplate(detailSong) }}
                            disabled={alreadyAdded || isImporting}
                          >
                            {isImporting ? '...' : alreadyAdded ? t('library.alreadyAdded') : t('library.addToLibrary')}
                          </button>
                        )
                      })()}
                      <button className="btn btn-ghost" onClick={closeDetail}>{t('common.close')}</button>
                    </>
                  ) : (
                    <>
                      <button className="btn btn-red btn-sm" onClick={()=>handleDelete(detailSong.id)}>{t('common.delete')}</button>
                      <div style={{ flex:1 }} />
                      <button className="btn btn-ghost btn-sm modal-footer-edit" onClick={startEdit}>{t('common.edit')}</button>
                      <button className="btn btn-ghost modal-footer-close" onClick={closeDetail}>{t('common.close')}</button>
                      <button className={`btn modal-footer-week ${weekSongIds.includes(detailSong.id)?'btn-primary':'btn-ghost'}`} onClick={()=>{toggleWeek(detailSong.id,{stopPropagation:()=>{}});closeDetail()}}>
                        {weekSongIds.includes(detailSong.id) ? t('library.inThisWeekFull') : t('library.addToThisWeekFull')}
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
