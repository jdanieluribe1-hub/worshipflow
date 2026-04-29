import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '../components/Toast'
import { uploadPDF, addSong } from '../lib/supabase'
import { parsePDFWithAI } from '../lib/ai'
import { transposeLyrics } from '../lib/transpose'
import ChordDisplay from '../components/ChordDisplay'
import TransposeControl from '../components/TransposeControl'

const KEYS = [
  'C','C#/Db','D','D#/Eb','E','F','F#/Gb','G','G#/Ab','A','A#/Bb','B',
  'Cm','C#m','Dm','D#m','Em','Fm','F#m','Gm','G#m','Am','A#m','Bm',
]
const TEMPOS = ['Fast','Medium','Slow']

export default function Upload({ songs, refreshSongs, activeChurch, setPage, setPendingOpenSong }) {
  const { t } = useTranslation()
  const toast = useToast()
  const [step, setStep] = useState('idle')
  const [extracted, setExtracted] = useState(null)
  const [pdfFile, setPdfFile] = useState(null)
  const [urlInput, setUrlInput] = useState('')
  const [pasteText, setPasteText] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedSong, setSavedSong] = useState(null)
  const [error, setError] = useState('')
  const [transposedKey, setTransposedKey] = useState(null)

  const handleFile = async (file) => {
    const allowed = ['application/pdf', 'image/png', 'image/jpeg']
    if (!file || !allowed.includes(file.type)) return toast(t('upload.pleaseUploadFile'), 'info')
    setPdfFile(file)
    setStep('parsing')
    setError('')
    try {
      const base64 = await new Promise((res, rej) => {
        const reader = new FileReader()
        reader.onload = () => res(reader.result.split(',')[1])
        reader.onerror = rej
        reader.readAsDataURL(file)
      })
      const result = await parsePDFWithAI(base64, file.type)
      if (!result.title && !result.lyrics) {
        setError(t('upload.couldNotExtract'))
        setStep('idle')
        return
      }
      const baseName = file.name.replace(/\.[^.]+$/, '')
      setExtracted({ title: result.title || baseName, artist: result.artist || '', key: result.key || 'G', tempo: result.tempo || 'Medium', lyrics: result.lyrics || '' })
      setTransposedKey(result.key || 'G')
      setStep('review')
    } catch(e) {
      setError(t('upload.errorParsing', { msg: e.message }))
      setStep('idle')
    }
  }

  const handleURL = async () => {
    if (!urlInput.trim()) return toast(t('upload.pleaseEnterUrl'), 'info')
    setStep('parsing')
    setError('')
    try {
      const res = await fetch('/api/fetch-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlInput.trim() })
      })
      const result = await res.json()
      if (result.error) throw new Error(result.error)
      if (!result.title && !result.lyrics) {
        setError(t('upload.couldNotExtractUrl'))
        setStep('idle')
        return
      }
      setExtracted({ title: result.title || '', artist: result.artist || '', key: result.key || 'G', tempo: result.tempo || 'Medium', lyrics: result.lyrics || '' })
      setTransposedKey(result.key || 'G')
      setStep('review')
    } catch(e) {
      setError(t('upload.errorFetchingUrl', { msg: e.message }))
      setStep('idle')
    }
  }

  const handlePaste = () => {
    if (!pasteText.trim()) return toast(t('upload.pleasePasteLyrics'), 'info')
    setExtracted({ title: '', artist: '', key: 'G', tempo: 'Medium', lyrics: pasteText.trim() })
    setTransposedKey('G')
    setStep('review')
  }

  const handleSave = async () => {
    if (!extracted.title.trim()) return toast(t('library.pleaseEnterTitle'), 'info')
    const normalizedTitle = extracted.title.trim().toLowerCase()
    if (songs && songs.some(s => s.title.trim().toLowerCase() === normalizedTitle)) {
      return toast(t('library.duplicateSong', { title: extracted.title.trim() }), 'info')
    }
    setSaving(true)
    try {
      let pdf_url = null
      if (pdfFile) pdf_url = await uploadPDF(pdfFile, extracted.title)
      const origKey = extracted.key || 'G'
      const activeKey = transposedKey || origKey
      const lyricsToSave = (transposedKey && transposedKey !== origKey)
        ? transposeLyrics(extracted.lyrics, origKey, transposedKey)
        : extracted.lyrics
      const saved = await addSong({
        title: extracted.title.trim(),
        artist: extracted.artist.trim(),
        key: activeKey,
        tempo: extracted.tempo,
        themes: [], specialty: [], notes: '',
        lyrics: lyricsToSave,
        pdf_url,
        plays_3weeks: 0, plays_3months: 0, plays_year: 0,
        church_id: activeChurch?.id,
      })
      await refreshSongs()
      setSavedSong(saved)
      setStep('done')
    } catch(e) {
      toast(t('errors.saveFailed', { msg: e.message }), 'error')
    }
    setSaving(false)
  }

  const reset = () => { setStep('idle'); setExtracted(null); setPdfFile(null); setUrlInput(''); setPasteText(''); setError(''); setTransposedKey(null); setSavedSong(null) }

  const handleViewInLibrary = () => {
    if (savedSong && setPendingOpenSong) setPendingOpenSong(savedSong)
    if (setPage) setPage('library')
  }

  if (step === 'done') return (
    <div className="empty-state">
      <div className="empty-icon">✅</div>
      <div className="empty-text">{t('upload.songSaved')}</div>
      <div style={{ display:'flex', gap:12, marginTop:16, justifyContent:'center' }}>
        <button className="btn btn-ghost" onClick={reset}>{t('upload.uploadAnother')}</button>
        <button className="btn btn-primary" onClick={handleViewInLibrary}>{t('upload.viewInLibrary')}</button>
      </div>
    </div>
  )

  return (
    <div>
      {step === 'idle' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:28, alignItems:'start' }}>
          <div>
            <div style={{ fontFamily:'var(--font-head)', fontSize:16, fontWeight:600, marginBottom:16 }}>{t('upload.option1Title')}</div>
            <div style={{ fontSize:13, color:'var(--muted)', marginBottom:12 }}>{t('upload.option1Desc')}</div>
            <div style={{ display:'flex', gap:10 }}>
              <input type="text" placeholder="https://cifraclub.com.br/..." value={urlInput} onChange={e=>setUrlInput(e.target.value)} style={{ flex:1 }} onKeyDown={e=>e.key==='Enter'&&handleURL()} />
              <button className="btn btn-primary" onClick={handleURL}>{t('upload.fetchButton')}</button>
            </div>
            {error && <div style={{ marginTop:10, fontSize:13, color:'var(--red)' }}>{error}</div>}

            <div style={{ display:'flex', alignItems:'center', gap:12, margin:'24px 0' }}>
              <div style={{ flex:1, height:1, background:'var(--border)' }} />
              <div style={{ fontSize:12, color:'var(--muted)' }}>{t('common.or')}</div>
              <div style={{ flex:1, height:1, background:'var(--border)' }} />
            </div>

            <div style={{ fontFamily:'var(--font-head)', fontSize:16, fontWeight:600, marginBottom:16 }}>{t('upload.option2Title')}</div>
            <div className="upload-zone" onClick={()=>document.getElementById('pdf-input').click()}>
              <div style={{ fontSize:32, marginBottom:10 }}>📄</div>
              <div style={{ fontSize:14, fontWeight:500, marginBottom:4 }}>{t('upload.uploadZoneTitle')}</div>
              <div style={{ fontSize:12, color:'var(--muted)' }}>{t('upload.uploadZoneDesc')}</div>
              <input id="pdf-input" type="file" accept=".pdf,.png,.jpg,.jpeg" style={{ display:'none' }} onChange={e=>handleFile(e.target.files[0])} />
            </div>

            <div style={{ display:'flex', alignItems:'center', gap:12, margin:'24px 0' }}>
              <div style={{ flex:1, height:1, background:'var(--border)' }} />
              <div style={{ fontSize:12, color:'var(--muted)' }}>{t('common.or')}</div>
              <div style={{ flex:1, height:1, background:'var(--border)' }} />
            </div>

            <div style={{ fontFamily:'var(--font-head)', fontSize:16, fontWeight:600, marginBottom:12 }}>{t('upload.option3Title')}</div>
            <div style={{ fontSize:13, color:'var(--muted)', marginBottom:10 }}>{t('upload.option3Desc')}</div>
            <textarea
              placeholder={'[Verse 1]\nAmazing [G]grace how [C]sweet the sound...'}
              value={pasteText}
              onChange={e=>setPasteText(e.target.value)}
              style={{ width:'100%', minHeight:100, fontFamily:'monospace', fontSize:12, resize:'vertical', marginBottom:8 }}
            />
            <button className="btn btn-primary" onClick={handlePaste}>{t('upload.reviewAndEdit')}</button>
          </div>

          <div>
            <div style={{ fontFamily:'var(--font-head)', fontSize:16, fontWeight:600, marginBottom:12 }}>{t('upload.howItWorksTitle')}</div>
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {[
                ['🔗', t('upload.stepPasteUrl'), t('upload.stepPasteUrlDesc')],
                ['📄', t('upload.stepUploadPdf'), t('upload.stepUploadPdfDesc')],
                ['✏️', t('upload.stepReviewEdit'), t('upload.stepReviewEditDesc')],
                ['💾', t('upload.stepSavedToLibrary'), t('upload.stepSavedToLibraryDesc')],
              ].map(([icon, title, desc]) => (
                <div key={title} style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
                  <div style={{ fontSize:20, width:28, flexShrink:0 }}>{icon}</div>
                  <div>
                    <div style={{ fontWeight:500, fontSize:13, marginBottom:2 }}>{title}</div>
                    <div style={{ fontSize:12, color:'var(--muted)', lineHeight:1.5 }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {step === 'parsing' && (
        <div style={{ textAlign:'center', padding:60, color:'var(--accent)' }}>
          <div style={{ fontSize:36, marginBottom:16 }}>⏳</div>
          <div style={{ fontSize:15, fontWeight:500 }}>{t('upload.parsingTitle')}</div>
          <div style={{ fontSize:13, color:'var(--muted)', marginTop:6 }}>{t('upload.parsingDesc')}</div>
        </div>
      )}

      {step === 'review' && extracted && (() => {
        const origKey = extracted.key || 'G'
        const activeKey = transposedKey || origKey
        const displayLyrics = (transposedKey && transposedKey !== origKey)
          ? transposeLyrics(extracted.lyrics, origKey, transposedKey)
          : extracted.lyrics
        return (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:28, alignItems:'start' }}>
            <div className="card" style={{ marginTop:0 }}>
              <div style={{ fontSize:11, color:'var(--muted)', marginBottom:14, textTransform:'uppercase', letterSpacing:'0.5px' }}>{t('upload.reviewHeader')}</div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">{t('library.songTitle')}</label>
                  <input type="text" value={extracted.title} onChange={e=>setExtracted(x=>({...x,title:e.target.value}))} />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('upload.artist')}</label>
                  <input type="text" value={extracted.artist} onChange={e=>setExtracted(x=>({...x,artist:e.target.value}))} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">{t('library.key')}</label>
                  <select value={extracted.key} onChange={e=>{ setExtracted(x=>({...x,key:e.target.value})); setTransposedKey(e.target.value) }}>
                    {KEYS.map(k=><option key={k}>{k}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">{t('library.tempo')}</label>
                  <select value={extracted.tempo} onChange={e=>setExtracted(x=>({...x,tempo:e.target.value}))}>
                    {TEMPOS.map(tempo=><option key={tempo} value={tempo}>{t('tempos.' + tempo)}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <TransposeControl
                  originalKey={extracted.key}
                  transposedKey={activeKey}
                  onChange={setTransposedKey}
                />
              </div>
              <div className="form-group">
                <label className="form-label">{t('upload.lyricsWithChords')}</label>
                <textarea value={extracted.lyrics} onChange={e=>setExtracted(x=>({...x,lyrics:e.target.value}))} style={{ minHeight:160, width:'100%', fontFamily:'monospace', fontSize:12 }} />
              </div>
              <div style={{ display:'flex', gap:10 }}>
                <button className="btn btn-ghost btn-sm" onClick={reset}>{t('songEditor.discardChanges')}</button>
                <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? t('common.saving') : t('upload.saveToLibrary')}</button>
              </div>
            </div>

            <div>
              <div style={{ fontFamily:'var(--font-head)', fontSize:16, fontWeight:600, marginBottom:12 }}>Preview</div>
              <ChordDisplay lyrics={displayLyrics} />
            </div>
          </div>
        )
      })()}
    </div>
  )
}
