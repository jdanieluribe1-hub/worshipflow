import React, { useState } from 'react'
import { uploadPDF, addSong } from '../lib/supabase'
import { parsePDFWithAI, generateProPresenterTemplate } from '../lib/ai'

const KEYS = ['C','C#/Db','D','D#/Eb','E','F','F#/Gb','G','G#/Ab','A','A#/Bb','B']
const TEMPOS = ['Fast','Medium','Slow']

export default function Upload({ refreshSongs }) {
  const [step, setStep] = useState('idle')
  const [extracted, setExtracted] = useState(null)
  const [pdfFile, setPdfFile] = useState(null)
  const [propre, setPropre] = useState('')
  const [saving, setSaving] = useState(false)

  const handleFile = async (file) => {
    if (!file || file.type !== 'application/pdf') return alert('Please upload a PDF file.')
    setPdfFile(file)
    setStep('parsing')

    try {
      const base64 = await new Promise((res, rej) => {
        const reader = new FileReader()
        reader.onload = () => res(reader.result.split(',')[1])
        reader.onerror = rej
        reader.readAsDataURL(file)
      })
      const result = await parsePDFWithAI(base64)
      setExtracted({ title: result.title || file.name.replace('.pdf',''), artist: result.artist || '', key: result.key || 'G', tempo: result.tempo || 'Medium', lyrics: result.lyrics || '' })
      setPropre(generateProPresenterTemplate(result.title || file.name, result.key || 'G', result.lyrics || ''))
      setStep('review')
    } catch(e) {
      alert('Error parsing PDF: ' + e.message)
      setStep('idle')
    }
  }

  const handleSave = async () => {
    if (!extracted?.title) return alert('Please enter a song title.')
    setSaving(true)
    try {
      let pdf_url = null
      if (pdfFile) pdf_url = await uploadPDF(pdfFile, extracted.title)
      await addSong({ title: extracted.title, artist: extracted.artist, key: extracted.key, tempo: extracted.tempo, themes: [], specialty: [], notes: '', lyrics: extracted.lyrics, pdf_url, plays_3weeks: 0, plays_3months: 0, plays_year: 0 })
      await refreshSongs()
      setStep('done')
    } catch(e) { alert('Error saving: ' + e.message) }
    setSaving(false)
  }

  const reset = () => { setStep('idle'); setExtracted(null); setPdfFile(null); setPropre('') }

  return (
    <div>
      {step === 'done' ? (
        <div className="empty-state">
          <div className="empty-icon">✅</div>
          <div className="empty-text">Song saved to your library!</div>
          <button className="btn btn-primary" style={{ marginTop:16 }} onClick={reset}>Upload Another</button>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:28, alignItems:'start' }}>
          <div>
            <div style={{ fontFamily:'var(--font-head)', fontSize:16, fontWeight:600, marginBottom:16 }}>Upload Chord Chart PDF</div>

            {step === 'idle' && (
              <div className="upload-zone" onClick={()=>document.getElementById('pdf-input').click()}>
                <div style={{ fontSize:32, marginBottom:10 }}>📄</div>
                <div style={{ fontSize:14, fontWeight:500, marginBottom:4 }}>Click to upload a PDF</div>
                <div style={{ fontSize:12, color:'var(--muted)' }}>AI will extract title, key, and lyrics automatically</div>
                <input id="pdf-input" type="file" accept=".pdf" style={{ display:'none' }} onChange={e=>handleFile(e.target.files[0])} />
              </div>
            )}

            {step === 'parsing' && (
              <div style={{ textAlign:'center', padding:40, color:'var(--accent)' }}>
                <div style={{ fontSize:28, marginBottom:12 }}>⏳</div>
                <div style={{ fontSize:14 }}>AI is reading your chord chart...</div>
              </div>
            )}

            {step === 'review' && extracted && (
              <div className="card" style={{ marginTop:0 }}>
                <div style={{ fontSize:11, color:'var(--muted)', marginBottom:14, textTransform:'uppercase', letterSpacing:'0.5px' }}>AI Extracted — Review & Edit</div>
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
                    <select value={extracted.key} onChange={e=>{setExtracted(x=>({...x,key:e.target.value}));setPropre(generateProPresenterTemplate(extracted.title,e.target.value,extracted.lyrics))}}>
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
                {extracted.lyrics && (
                  <div className="form-group">
                    <label className="form-label">Lyrics (extracted)</label>
                    <textarea value={extracted.lyrics} onChange={e=>{setExtracted(x=>({...x,lyrics:e.target.value}));setPropre(generateProPresenterTemplate(extracted.title,extracted.key,e.target.value))}} style={{ minHeight:120, width:'100%' }} />
                  </div>
                )}
                <div style={{ display:'flex', gap:10, marginTop:4 }}>
                  <button className="btn btn-ghost btn-sm" onClick={reset}>Start Over</button>
                  <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving?'Saving...':'Save to Library'}</button>
                </div>
              </div>
            )}
          </div>

          <div>
            <div style={{ fontFamily:'var(--font-head)', fontSize:16, fontWeight:600, marginBottom:16 }}>ProPresenter Template</div>
            <div style={{ fontSize:13, color:'var(--muted)', marginBottom:12 }}>
              {step === 'review' ? 'Copy and paste this into ProPresenter.' : 'Upload a PDF to generate a ProPresenter import template.'}
            </div>
            <div className="propre-box">{propre || '// Upload a PDF to generate template...'}</div>
            {propre && (
              <button className="btn btn-ghost btn-sm" style={{ marginTop:10 }} onClick={()=>{navigator.clipboard.writeText(propre);alert('Copied!')}}>
                Copy Template
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
