import React, { useState, useEffect } from 'react'
import { addSong, deleteSong, updateSong } from '../lib/supabase'
import { parsePDFWithAI, generateProPresenterFile, stripChords } from '../lib/ai'
import { transposeLyrics } from '../lib/transpose'
import ChordDisplay from '../components/ChordDisplay'
import TransposeControl from '../components/TransposeControl'

const KEYS = [
  'C','C#/Db','D','D#/Eb','E','F','F#/Gb','G','G#/Ab','A','A#/Bb','B',
  'Cm','C#m','Dm','D#m','Em','Fm','F#m','Gm','G#m','Am','A#m','Bm',
]
const TEMPOS = ['Fast','Medium','Slow']
const THEMES = ['Praise','Worship','Prayer','Communion','Offering','Closing','Opening','Christmas','Easter','Thanksgiving']
const SPECIALTY = ['Contemporary','Traditional','Hymn','Spanish','Bilingual','Acoustic','Youth','Children','Advent']

function tempoEmoji(t) { return t==='Fast'?'⚡':t==='Medium'?'♩':'🎶' }

export default function Library({ songs, weekSongIds, setWeekSongIds, refreshSongs, activeChurch, pendingOpenSong, setPendingOpenSong }) {
  const [filter, setFilter] = useState({ tempo: 'all', key: 'all', search: '' })
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({ title:'', artist:'', key:'G', tempo:'Medium', themes:[], notes:'' })
  const [saving, setSaving] = useState(false)
  const [detailSong, setDetailSong] = useState(null)
  const [converting, setConverting] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [viewTransposedKey, setViewTransposedKey] = useState(null)

  const [proPresenterBin, setProPresenterBin] = useState(null)

  const openDetail = (s) => { setDetailSong(s); setEditing(false); setViewTransposedKey(null); setProPresenterBin(null) }
  const closeDetail = () => { setDetailSong(null); setEditing(false); setViewTransposedKey(null); setProPresenterBin(null) }

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
    if (!editForm.title.trim()) return alert('Please enter a song title.')
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
    } catch (e) { alert('Error saving: ' + e.message) }
    setSaving(false)
  }

  const toggleEditTheme = (t) =>
    setEditForm(f => ({ ...f, themes: f.themes.includes(t) ? f.themes.filter(x=>x!==t) : [...f.themes, t] }))

  const toggleEditSpecialty = (t) =>
    setEditForm(f => ({ ...f, specialty: f.specialty.includes(t) ? f.specialty.filter(x=>x!==t) : [...f.specialty, t] }))

  const filtered = songs.filter(s => {
    if (filter.tempo !== 'all' && s.tempo !== filter.tempo) return false
    if (filter.key !== 'all' && s.key !== filter.key) return false
    if (filter.search && !s.title.toLowerCase().includes(filter.search.toLowerCase()) && !(s.artist||'').toLowerCase().includes(filter.search.toLowerCase())) return false
    return true
  })

  const toggleWeek = (id, e) => {
    e.stopPropagation()
    setWeekSongIds(prev => prev.includes(id) ? prev.filter(x=>x!==id) : [...prev, id])
  }

  const toggleTheme = (t) => {
    setForm(f => ({ ...f, themes: f.themes.includes(t) ? f.themes.filter(x=>x!==t) : [...f.themes, t] }))
  }

  const handleAdd = async () => {
    if (!form.title.trim()) return alert('Please enter a song title.')
    setSaving(true)
    try {
      await addSong({ title: form.title.trim(), artist: form.artist.trim(), key: form.key, tempo: form.tempo, themes: form.themes, specialty: [], notes: form.notes, plays_3weeks: 0, plays_3months: 0, plays_year: 0, church_id: activeChurch?.id })
      await refreshSongs()
      setModal(null)
      setForm({ title:'', artist:'', key:'G', tempo:'Medium', themes:[], notes:'' })
    } catch(e) { alert('Error saving song: ' + e.message) }
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
      if (!result.lyrics) throw new Error('Could not extract lyrics from this PDF.')
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
      alert('Error converting PDF: ' + e.message)
    }
    setConverting(false)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this song?')) return
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
    } catch(e) { alert('Error saving: ' + e.message) }
    setSaving(false)
  }

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div />
        <button className="btn btn-primary" onClick={() => setModal('add')}>+ Add Song</button>
      </div>

      <div className="filter-bar">
        <div className="search-wrap" style={{ minWidth:220 }}>
          <span className="search-icon">🔍</span>
          <input type="text" placeholder="Search songs or artists..." value={filter.search} onChange={e => setFilter(f=>({...f,search:e.target.value}))} />
        </div>
        {['all','Fast','Medium','Slow'].map(t => (
          <button key={t} className={`filter-btn ${t.toLowerCase()} ${filter.tempo===t?'active':''}`} onClick={() => setFilter(f=>({...f,tempo:t}))}>
            {t === 'all' ? 'All Tempos' : t}
          </button>
        ))}
        <select value={filter.key} onChange={e => setFilter(f=>({...f,key:e.target.value}))}>
          <option value="all">All Keys</option>
          {KEYS.map(k => <option key={k} value={k}>{k}</option>)}
        </select>
      </div>

      <div style={{ marginBottom:12, fontSize:12, color:'var(--muted)' }}>{filtered.length} song{filtered.length!==1?'s':''}</div>

      {filtered.length === 0 ? (
        <div className="empty-state"><div className="empty-icon">♪</div><div className="empty-text">No songs found</div></div>
      ) : filtered.map(s => {
        const inWeek = weekSongIds.includes(s.id)
        return (
          <div key={s.id} className={`song-row ${inWeek?'selected':''}`} onClick={() => openDetail(s)}>
            <div className="song-thumb">{tempoEmoji(s.tempo)}</div>
            <div className="song-info">
              <div className="song-title">{s.title}</div>
              <div className="song-artist">{s.artist}</div>
            </div>
            <div className="song-tags">
              <span className={`tag tag-${s.tempo?.toLowerCase()}`}>{s.tempo}</span>
              <span className="tag tag-key">{s.key}</span>
              {(s.specialty||[]).map(sp => <span key={sp} className="tag tag-specialty">{sp}</span>)}
            </div>
            <div style={{ fontSize:12, color:'var(--muted)', minWidth:60, textAlign:'right' }}>{s.plays_year||0} plays</div>
            <button className={`btn btn-sm ${inWeek?'btn-primary':'btn-ghost'}`} onClick={e=>toggleWeek(s.id,e)}>
              {inWeek ? '✓ Added' : '+ Week'}
            </button>
          </div>
        )
      })}

      {/* ADD MODAL */}
      {modal === 'add' && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setModal(null)}>
          <div className="modal">
            <div className="modal-title">Add New Song</div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Song Title</label>
                <input type="text" placeholder="e.g. Amazing Grace" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} />
              </div>
              <div className="form-group">
                <label className="form-label">Artist / Writer</label>
                <input type="text" placeholder="e.g. Chris Tomlin" value={form.artist} onChange={e=>setForm(f=>({...f,artist:e.target.value}))} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Key</label>
                <select value={form.key} onChange={e=>setForm(f=>({...f,key:e.target.value}))}>
                  {KEYS.map(k=><option key={k}>{k}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Tempo</label>
                <select value={form.tempo} onChange={e=>setForm(f=>({...f,tempo:e.target.value}))}>
                  {TEMPOS.map(t=><option key={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Themes</label>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:4 }}>
                {THEMES.map(t => (
                  <button key={t} className={`filter-btn ${form.themes.includes(t)?'active':''}`} onClick={()=>toggleTheme(t)}>{t}</button>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea placeholder="Theme, usage notes, specialty occasions..." value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} />
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={()=>setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAdd} disabled={saving}>{saving?'Saving...':'Add Song'}</button>
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
                <div className="modal-title">Edit Song</div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Song Title</label>
                    <input type="text" value={editForm.title} onChange={e=>setEditForm(f=>({...f,title:e.target.value}))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Artist / Writer</label>
                    <input type="text" value={editForm.artist} onChange={e=>setEditForm(f=>({...f,artist:e.target.value}))} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Key</label>
                    <select value={editForm.key} onChange={e=>setEditForm(f=>({...f,key:e.target.value}))}>
                      {KEYS.map(k=><option key={k}>{k}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tempo</label>
                    <select value={editForm.tempo} onChange={e=>setEditForm(f=>({...f,tempo:e.target.value}))}>
                      {TEMPOS.map(t=><option key={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Themes</label>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:4 }}>
                    {THEMES.map(t=>(
                      <button key={t} className={`filter-btn ${editForm.themes.includes(t)?'active':''}`} onClick={()=>toggleEditTheme(t)}>{t}</button>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Specialty</label>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:4 }}>
                    {SPECIALTY.map(t=>(
                      <button key={t} className={`filter-btn ${editForm.specialty.includes(t)?'active':''}`} onClick={()=>toggleEditSpecialty(t)}>{t}</button>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <textarea value={editForm.notes} onChange={e=>setEditForm(f=>({...f,notes:e.target.value}))} placeholder="Theme, usage notes, specialty occasions..." />
                </div>
                <div className="modal-footer">
                  <button className="btn btn-ghost" onClick={()=>setEditing(false)}>Cancel</button>
                  <button className="btn btn-primary" onClick={handleEditSave} disabled={saving}>{saving?'Saving…':'Save Changes'}</button>
                </div>
              </>
            ) : (
              <>
                <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:16 }}>
                  <div className="song-thumb" style={{ width:52,height:52,fontSize:22 }}>{tempoEmoji(detailSong.tempo)}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontFamily:'var(--font-head)',fontSize:20,fontWeight:700 }}>{detailSong.title}</div>
                    <div style={{ color:'var(--muted)',fontSize:13 }}>{detailSong.artist}</div>
                  </div>
                </div>
                <div style={{ display:'flex', alignItems:'flex-start', gap:10, marginBottom:16 }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex',gap:8,flexWrap:'wrap',marginBottom:10 }}>
                      <span className={`tag tag-${detailSong.tempo?.toLowerCase()}`}>{detailSong.tempo}</span>
                      <span className="tag tag-key">Key of {detailSong.key}</span>
                      {(detailSong.themes||[]).map(t=><span key={t} className="tag tag-theme">{t}</span>)}
                      {(detailSong.specialty||[]).map(t=><span key={t} className="tag tag-specialty">{t}</span>)}
                    </div>
                    {detailSong.lyrics && (
                      <TransposeControl
                        originalKey={detailSong.key}
                        transposedKey={viewTransposedKey || detailSong.key}
                        onChange={setViewTransposedKey}
                      />
                    )}
                  </div>
                  <div className="modal-top-actions">
                    <button className="btn btn-ghost btn-sm" onClick={startEdit}>Edit</button>
                    <button className={`btn btn-sm ${weekSongIds.includes(detailSong.id)?'btn-primary':'btn-ghost'}`} onClick={()=>toggleWeek(detailSong.id,{stopPropagation:()=>{}})}>
                      {weekSongIds.includes(detailSong.id)?'✓ Week':'+ Week'}
                    </button>
                  </div>
                </div>
                {detailSong.notes && <div style={{ background:'var(--bg3)',borderRadius:8,padding:'12px 14px',fontSize:13,color:'var(--muted)',marginBottom:16 }}>{detailSong.notes}</div>}
                <div style={{ marginBottom:16 }}>
                  <div className="form-label" style={{ marginBottom:8 }}>Play History</div>
                  <div className="grid-3 stat-grid">
                    {[['3 Weeks',detailSong.plays_3weeks],['3 Months',detailSong.plays_3months],['This Year',detailSong.plays_year]].map(([label,val])=>(
                      <div key={label} className="stat-card card-sm">
                        <div className="stat-label">{label}</div>
                        <div className="stat-value" style={{ fontSize:22 }}>{val||0}</div>
                      </div>
                    ))}
                  </div>
                </div>
                {detailSong.pdf_url && (
                  <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
                    <a href={detailSong.pdf_url} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">📄 View PDF</a>
                    {!detailSong.lyrics && (
                      <button className="btn btn-ghost btn-sm" onClick={handleConvertPDF} disabled={converting}>
                        {converting ? '⏳ Converting…' : '✨ Convert PDF to chord chart'}
                      </button>
                    )}
                  </div>
                )}
                {detailSong.lyrics && (
                  <div style={{ marginBottom:16 }}>
                    <div className="form-label" style={{ marginBottom:8 }}>Lyrics</div>
                    <ChordDisplay
                      lyrics={
                        viewTransposedKey && viewTransposedKey !== detailSong.key
                          ? transposeLyrics(detailSong.lyrics, detailSong.key, viewTransposedKey)
                          : detailSong.lyrics
                      }
                    />
                  </div>
                )}
                {detailSong.lyrics && (
                  <div style={{ marginBottom:16 }}>
                    <div className="form-label" style={{ marginBottom:8 }}>ProPresenter</div>
                    {!proPresenterBin ? (
                      <button className="btn btn-ghost btn-sm" onClick={() => setProPresenterBin(generateProPresenterFile(detailSong.title, detailSong.key, detailSong.lyrics))}>
                        Generate .pro File
                      </button>
                    ) : (
                      <>
                        <div className="propre-box">Ready to download</div>
                        <div style={{ display:'flex', gap:8, marginTop:8 }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => { navigator.clipboard.writeText(stripChords(detailSong.lyrics)); alert('Copied!') }}>Copy Text</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => {
                            const blob = new Blob([proPresenterBin], { type: 'application/octet-stream' })
                            const a = document.createElement('a')
                            a.href = URL.createObjectURL(blob)
                            a.download = `${detailSong.title.replace(/[^a-zA-Z0-9]/g,'-')}.pro`
                            a.click()
                          }}>Download .pro</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => setProPresenterBin(null)}>Hide</button>
                        </div>
                      </>
                    )}
                  </div>
                )}
                <div className="modal-footer">
                  <button className="btn btn-red btn-sm" onClick={()=>handleDelete(detailSong.id)}>Delete</button>
                  <div style={{ flex:1 }} />
                  <button className="btn btn-ghost btn-sm modal-footer-edit" onClick={startEdit}>Edit</button>
                  <button className="btn btn-ghost modal-footer-close" onClick={closeDetail}>Close</button>
                  <button className={`btn modal-footer-week ${weekSongIds.includes(detailSong.id)?'btn-primary':'btn-ghost'}`} onClick={()=>{toggleWeek(detailSong.id,{stopPropagation:()=>{}});closeDetail()}}>
                    {weekSongIds.includes(detailSong.id)?'✓ In This Week':'+ Add to This Week'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
