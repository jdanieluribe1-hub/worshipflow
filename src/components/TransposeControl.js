import React from 'react'
import { TRANSPOSE_KEYS } from '../lib/transpose'

export default function TransposeControl({ originalKey, transposedKey, onChange, selectStyle, labelStyle }) {
  const normOriginal = originalKey?.includes('/') ? originalKey.split('/')[0] : originalKey
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
      <span style={{ fontSize:12, color:'var(--muted)', fontWeight:500, textTransform:'uppercase', letterSpacing:'0.5px', ...labelStyle }}>
        Transpose
      </span>
      <select
        value={transposedKey || normOriginal || 'G'}
        onChange={e => onChange(e.target.value)}
        style={{ background:'var(--bg3)', border:'1px solid var(--border2)', borderRadius:8, color:'var(--text)', fontSize:13, padding:'6px 10px', cursor:'pointer', ...selectStyle }}
      >
        {TRANSPOSE_KEYS.map(k => (
          <option key={k} value={k}>
            {k === normOriginal ? `${k} (Original)` : k}
          </option>
        ))}
      </select>
    </div>
  )
}
