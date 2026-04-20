import React, { useState, useEffect } from 'react'
import { listSongVariants } from '../lib/supabase'

export default function VariantSelect({ songId, value, onChange, selectStyle }) {
  const [variants, setVariants] = useState([])

  useEffect(() => {
    if (!songId) return
    listSongVariants(songId).then(setVariants).catch(() => setVariants([]))
  }, [songId])

  if (variants.length === 0) return null

  return (
    <select
      value={value || ''}
      onChange={e => {
        const v = variants.find(x => x.id === e.target.value) || null
        onChange(v)
      }}
      style={{
        background: 'var(--bg3)', border: '1px solid var(--border)',
        borderRadius: 6, padding: '4px 8px', color: 'var(--text)',
        fontSize: 12, cursor: 'pointer',
        ...selectStyle,
      }}
    >
      <option value="">Original</option>
      {variants.map(v => (
        <option key={v.id} value={v.id}>{v.name}</option>
      ))}
    </select>
  )
}
