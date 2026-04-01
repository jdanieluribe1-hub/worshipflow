import React from 'react'
import { isChordName } from '../lib/transpose'

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

export default function ChordDisplay({ lyrics, chordColor, lyricColor }) {
  const cc = chordColor || 'var(--accent)'
  const lc = lyricColor  || 'var(--text)'

  if (!lyrics) return <div style={{ color:'var(--muted)', fontSize:13 }}>No lyrics yet</div>

  const lines = lyrics.split('\n')
  return (
    <div style={{ fontFamily:'monospace', fontSize:13, background:'var(--bg3)', borderRadius:12, padding:'16px 20px', maxHeight:400, overflowY:'auto' }}>
      {lines.map((line, i) => {
        const trimmed = line.trim()
        if (!trimmed) return <div key={i} style={{ height:8 }} />

        // Section label: entire line is [Something] that isn't a chord name
        if (/^\[[^\]]+\]$/.test(trimmed) && !isChordName(trimmed.slice(1, -1))) {
          return <div key={i} style={{ color:'var(--accent2)', fontWeight:600, fontSize:11, letterSpacing:1, textTransform:'uppercase', marginTop:12, marginBottom:4, fontFamily:'var(--font-body)' }}>{trimmed.slice(1,-1)}</div>
        }

        // Pure lyric line with no chord markers
        if (!/\[[^\]]+\]/.test(line)) {
          return <div key={i} style={{ color:lc, whiteSpace:'pre-wrap', lineHeight:1.6, marginBottom:2 }}>{line}</div>
        }

        const { chordLine, lyricLine } = parseLyricLine(line)
        return (
          <div key={i} style={{ marginBottom:6 }}>
            <div style={{ color:cc, fontWeight:700, whiteSpace:'pre', lineHeight:1.3 }}>{chordLine}</div>
            <div style={{ color:lc, whiteSpace:'pre', lineHeight:1.5 }}>{lyricLine || '\u00A0'}</div>
          </div>
        )
      })}
    </div>
  )
}
