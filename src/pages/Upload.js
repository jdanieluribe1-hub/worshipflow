import React, { useState } from 'react'
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

export default function Upload({ refreshSongs, activeChurch }) {
  const [step, setStep] = useState('idle')
  const [extracted, setExtracted] = useState(null)
  const [pdfFile, setPdfFile] = useState(null)
  const [urlInput, setUrlInput] = useState('')
  const [pasteText, setPasteText] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [transposedKey, setTransposedKey] = useState(null)

  const handleFile = async (file) => {
    if (!file || file.type !== 'application/pdf') return alert('Please upload a PDF file.')
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
      const result = await parsePDFWithAI(base64)
      if (!result.title && !result.lyrics) {
        setError('Could not extract song data from the PDF. Please try a different file or paste the lyrics manually.')
        setStep('idle')
        return
      }
      setExtracted({ title: result.title || file.name.replace('.pdf',''), artist: result.artist || '', key: result.key || 'G', tempo: result.tempo || 'Medium', lyrics: result.lyrics || '' })
      setTransposedKey(result.key || 'G')
      setStep('review')
    } catch(e) {
      setError('Error parsing PDF: ' + e.message)
      setStep('idle')
    }
  }

  const handleURL = async () => {
    if (!urlInput.trim()) return alert('Please enter a URL.')
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
        setError('Could not extract song data from that URL. Try a different link or paste the lyrics manually.')
        setStep('idle')
        return
      }
      setExtracted({ title: result.title || '', artist: result.artist || '', key: result.key || 'G', tempo: result.tempo || 'Medium', lyrics: result.lyrics || '' })
      setTransposedKey(result.key || 'G')
      setStep('review')
    } catch(e) {
      setError('Error fetching URL: ' + e.message)
      setStep('idle')
    }
  }

  const handlePaste = () => {
    if (!pasteText.trim()) return alert('Please paste some lyrics or chord chart text.')
    setExtracted({ title: '', artist: '', key: 'G', tempo: 'Medium', lyrics: pasteText.trim() })
    setTransposedKey('G')
    setStep('review')
  }

  const handleSave = async () => {
    if (!extracted.title.trim()) return alert('Please enter a song title.')
    setSaving(true)
    try {
      let pdf_url = null
      if (pdfFile) pdf_url = await uploadPDF(pdfFile, extracted.title)
      const origKey = extracted.key || 'G'
      const activeKey = transposedKey || origKey
      const lyricsToSave = (transposedKey && transposedKey !== origKey)
        ? transposeLyrics(extracted.lyrics, origKey, transposedKey)
        : extracted.lyrics
      await addSong({
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
      setStep('done')
    } catch(e) {
      alert('Error saving: ' + e.message)
    }
    setSaving(false)
  }

  const reset = () => { setStep('idle'); setExtracted(null); setPdfFile(null); setUrlInput(''); setPasteText(''); setError(''); setTransposedKey(null) }

  if (step === 'done') return (
    <div className="empty-state">
      <div className="empty-icon">✅</div>
      <div className="empty-text">Song saved to your library!</div>
      <button className="btn btn-primary" style={{ marginTop:16 }} onClick={reset}>Upload Another</button>
    </div>
  )

  return (
    <div>
      {step === 'idle' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:28, alignItems:'start' }}>
          <div>
            <div style={{ fontFamily:'var(--font-head)', fontSize:16, fontWeight:600, marginBottom:16 }}>Option 1 — Paste a URL</div>
            <div style={{ fontSize:13, color:'var(--muted)', marginBottom:12 }}>Works great with cifraclub, CCLI, PraiseCharts, and most chord chart sites.</div>
            <div style={{ display:'flex', gap:10 }}>
              <input type="text" placeholder="https://cifraclub.com.br/..." value={urlInput} onChange={e=>setUrlInput(e.target.value)} style={{ flex:1 }} onKeyDown={e=>e.key==='Enter'&&handleURL()} />
              <button className="btn btn-primary" onClick={handleURL}>Fetch</button>
            </div>
            {error && <div style={{ marginTop:10, fontSize:13, color:'var(--red)' }}>{error}</div>}

            <div style={{ display:'flex', alignItems:'center', gap:12, margin:'24px 0' }}>
              <div style={{ flex:1, height:1, background:'var(--border)' }} />
              <div style={{ fontSize:12, color:'var(--muted)' }}>or</div>
              <div style={{ flex:1, height:1, background:'var(--border)' }} />
            </div>

            <div style={{ fontFamily:'var(--font-head)', fontSize:16, fontWeight:600, marginBottom:16 }}>Option 2 — Upload a PDF</div>
            <div className="upload-zone" onClick={()=>document.getElementById('pdf-input').click()}>
              <div style={{ fontSize:32, marginBottom:10 }}>📄</div>
              <div style={{ fontSize:14, fontWeight:500, marginBottom:4 }}>Click to upload a PDF</div>
              <div style={{ fontSize:12, color:'var(--muted)' }}>AI will extract chords and lyrics automatically</div>
              <input id="pdf-input" type="file" accept=".pdf" style={{ display:'none' }} onChange={e=>handleFile(e.target.files[0])} />
            </div>

            <div style={{ display:'flex', alignItems:'center', gap:12, margin:'24px 0' }}>
              <div style={{ flex:1, height:1, background:'var(--border)' }} />
              <div style={{ fontSize:12, color:'var(--muted)' }}>or</div>
              <div style={{ flex:1, height:1, background:'var(--border)' }} />
            </div>

            <div style={{ fontFamily:'var(--font-head)', fontSize:16, fontWeight:600, marginBottom:12 }}>Option 3 — Paste Lyrics / Chords</div>
            <div style={{ fontSize:13, color:'var(--muted)', marginBottom:10 }}>Paste any chord chart text and edit the details in the next step.</div>
            <textarea
              placeholder={'[Verse 1]\nAmazing [G]grace how [C]sweet the sound...'}
              value={pasteText}
              onChange={e=>setPasteText(e.target.value)}
              style={{ width:'100%', minHeight:100, fontFamily:'monospace', fontSize:12, resize:'vertical', marginBottom:8 }}
            />
            <button className="btn btn-primary" onClick={handlePaste}>Review & Edit</button>
          </div>

          <div>
            <div style={{ fontFamily:'var(--font-head)', fontSize:16, fontWeight:600, marginBottom:12 }}>How it works</div>
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {[
                ['🔗', 'Paste a URL', 'AI fetches the page and extracts chords and lyrics with section labels'],
                ['📄', 'Upload a PDF', 'AI reads the PDF visually and pulls out all song data'],
                ['✏️', 'Review and edit', 'Check the extracted info before saving'],
                ['💾', 'Saved to library', 'Song is stored with PDF link, key, tempo, and full lyrics'],
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
          <div style={{ fontSize:15, fontWeight:500 }}>AI is reading the song...</div>
          <div style={{ fontSize:13, color:'var(--muted)', marginTop:6 }}>Extracting chords, lyrics, and key</div>
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
              <div style={{ fontSize:11, color:'var(--muted)', marginBottom:14, textTransform:'uppercase', letterSpacing:'0.5px' }}>AI Extracted — Review and Edit</div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Song Title</label>
                  <input type="text" value={extracted.title} onChange={e=>setExtracted(x=>({...x,title:e.target.value}))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Artist</label>
                  <input type="text" value={extracted.artist} onChange={e=>setExtracted(x=>({...x,artist:e.target.value}))} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Key</label>
                  <select value={extracted.key} onChange={e=>{ setExtracted(x=>({...x,key:e.target.value})); setTransposedKey(e.target.value) }}>
                    {KEYS.map(k=><option key={k}>{k}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Tempo</label>
                  <select value={extracted.tempo} onChange={e=>setExtracted(x=>({...x,tempo:e.target.value}))}>
                    {TEMPOS.map(t=><option key={t}>{t}</option>)}
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
                <label className="form-label">Lyrics with Chords</label>
                <textarea value={extracted.lyrics} onChange={e=>setExtracted(x=>({...x,lyrics:e.target.value}))} style={{ minHeight:160, width:'100%', fontFamily:'monospace', fontSize:12 }} />
              </div>
              <div style={{ display:'flex', gap:10 }}>
                <button className="btn btn-ghost btn-sm" onClick={reset}>Start Over</button>
                <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving?'Saving...':'Save to Library'}</button>
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
