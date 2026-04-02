import React from 'react'
import { TRANSPOSE_KEYS } from '../lib/transpose'

const MAJOR_KEYS = TRANSPOSE_KEYS.filter(k => k !== 'Numbers' && !k.endsWith('m'))
const MINOR_KEYS = TRANSPOSE_KEYS.filter(k => k.endsWith('m'))

export default function TransposeControl({ originalKey, transposedKey, onChange, selectStyle, labelStyle }) {
  // Normalize: strip slash notation (C/G → C) but keep minor suffix (C#m stays C#m)
  const normOriginal = originalKey?.includes('/') ? originalKey.split('/')[0] : originalKey
  const label = (k) => k === normOriginal ? `${k} (Original)` : k === 'Numbers' ? '# Numbers' : k
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
      <span className="transpose-label" style={{ fontSize:12, color:'var(--muted)', fontWeight:500, textTransform:'uppercase', letterSpacing:'0.5px', ...labelStyle }}>
        Transpose
      </span>
      <select
        value={transposedKey || normOriginal || 'G'}
        onChange={e => onChange(e.target.value)}
        style={{ background:'var(--bg3)', border:'1px solid var(--border2)', borderRadius:8, color:'var(--text)', fontSize:13, padding:'6px 10px', cursor:'pointer', ...selectStyle }}
      >
        <optgroup label="Major">
          {MAJOR_KEYS.map(k => <option key={k} value={k}>{label(k)}</option>)}
        </optgroup>
        <optgroup label="Minor">
          {MINOR_KEYS.map(k => <option key={k} value={k}>{label(k)}</option>)}
        </optgroup>
        <option value="Numbers"># Numbers</option>
      </select>
    </div>
  )
}
