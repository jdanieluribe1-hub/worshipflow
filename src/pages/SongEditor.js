import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  createSongVariant, updateSongVariant, publishSongVariant,
  unpublishSongVariant, deleteSongVariant, listSongVariants
} from '../lib/supabase'
import { isChordName } from '../lib/transpose'

// ─── Button styles ────────────────────────────────────────────────────────────

const toolBtn = (disabled) => ({
  background: 'var(--bg3)', border: '1px solid var(--border)',
  color: disabled ? 'var(--muted)' : 'var(--text)',
  borderRadius: 7, padding: '6px 12px', fontSize: 13,
  cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1,
})

const accentBtn = {
  background: 'var(--accent)', color: '#fff', border: 'none',
  borderRadius: 7, padding: '7px 14px', fontSize: 13,
  cursor: 'pointer', fontWeight: 600,
}

const dangerBtn = {
  background: 'var(--red)', color: '#fff', border: 'none',
  borderRadius: 7, padding: '7px 14px', fontSize: 13,
  cursor: 'pointer', fontWeight: 600,
}

const dangerBtnSm = {
  background: 'transparent', color: 'var(--red)',
  border: '1px solid var(--red)',
  borderRadius: 7, padding: '6px 12px', fontSize: 13,
  cursor: 'pointer',
}

const dialogOverlay = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 999,
}

const dialogBox = {
  background: 'var(--bg2)', border: '1px solid var(--border)',
  borderRadius: 12, padding: 28, maxWidth: 360, width: '90%',
  color: 'var(--text)', fontSize: 14,
}

// ─── Chord data parsing / serialization ──────────────────────────────────────

function parseLyricsToLines(lyricsStr) {
  if (!lyricsStr) return []
  return lyricsStr.split('\n').map(rawLine => {
    const chords = []
    let text = ''
    let charPos = 0
    const parts = rawLine.split(/(\[[^\]]+\])/)
    for (const part of parts) {
      if (/^\[[^\]]+\]$/.test(part)) {
        const name = part.slice(1, -1)
        if (isChordName(name)) {
          chords.push({ id: Math.random().toString(36).slice(2), name, charPos })
        } else {
          text += part
          charPos += part.length
        }
      } else {
        text += part
        charPos += part.length
      }
    }
    return { text, chords }
  })
}

function serializeLinesToLyrics(lines) {
  return lines.map(line => {
    const sorted = [...line.chords].sort((a, b) => a.charPos - b.charPos)
    let result = ''
    let cursor = 0
    const text = line.text
    for (const chord of sorted) {
      const pos = Math.min(Math.max(0, Math.round(chord.charPos)), text.length)
      result += text.slice(cursor, pos) + `[${chord.name}]`
      cursor = pos
    }
    result += text.slice(cursor)
    return result
  }).join('\n')
}

// Approx char width for 13px monospace
const CHAR_W = 7.8

// ─── ChordToken ───────────────────────────────────────────────────────────────

function ChordToken({ chord, editing, onDragStart, onEdit, onEditCommit, onEditCancel, onDelete }) {
  const [hovered, setHovered] = useState(false)
  const inputRef = useRef(null)
  const [editVal, setEditVal] = useState(chord.name)
  const [editInvalid, setEditInvalid] = useState(false)

  useEffect(() => {
    if (editing && inputRef.current) {
      setEditVal(chord.name)
      setEditInvalid(false)
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing, chord.name])

  const commitEdit = () => {
    const val = editVal.trim()
    if (!val || !isChordName(val)) { setEditInvalid(true); return }
    onEditCommit(val)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); commitEdit() }
    if (e.key === 'Escape') { onEditCancel() }
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: 2,
        left: chord.charPos * CHAR_W,
        display: 'inline-flex', alignItems: 'center', gap: 2,
        userSelect: 'none',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {editing ? (
        <input
          ref={inputRef}
          value={editVal}
          onChange={e => { setEditVal(e.target.value); setEditInvalid(false) }}
          onBlur={commitEdit}
          onKeyDown={handleKeyDown}
          style={{
            width: '5ch', fontSize: 12, fontWeight: 700,
            background: 'var(--bg4)', color: editInvalid ? 'var(--red)' : 'var(--accent)',
            border: `1px solid ${editInvalid ? 'var(--red)' : 'var(--accent)'}`,
            borderRadius: 4, padding: '1px 3px',
            outline: 'none',
          }}
        />
      ) : (
        <>
          <span
            style={{
              fontSize: 12, fontWeight: 700, color: 'var(--accent)',
              background: hovered ? 'var(--bg4)' : 'var(--bg3)',
              borderRadius: 4, padding: '1px 5px',
              cursor: 'grab', whiteSpace: 'nowrap',
              border: '1px solid transparent',
              borderColor: hovered ? 'var(--border2)' : 'transparent',
            }}
            onMouseDown={e => { e.preventDefault(); e.stopPropagation(); onDragStart(e) }}
            onClick={e => { e.stopPropagation(); onEdit() }}
          >
            {chord.name}
          </span>
          {hovered && (
            <span
              onClick={e => { e.stopPropagation(); onDelete() }}
              style={{
                fontSize: 10, color: 'var(--muted)', cursor: 'pointer',
                lineHeight: 1, padding: '1px 3px',
                borderRadius: 3, background: 'var(--bg4)',
                border: '1px solid var(--border)',
              }}
              title="Delete chord"
            >✕</span>
          )}
        </>
      )}
    </div>
  )
}

// ─── AddChordInput ────────────────────────────────────────────────────────────

function AddChordInput({ charPos, onCommit, onCancel }) {
  const [val, setVal] = useState('')
  const [invalid, setInvalid] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const commit = () => {
    const v = val.trim()
    if (!v || !isChordName(v)) { setInvalid(true); return }
    onCommit(v)
  }

  return (
    <div style={{ position: 'absolute', top: 2, left: charPos * CHAR_W, zIndex: 10 }}>
      <input
        ref={inputRef}
        value={val}
        placeholder="C"
        onChange={e => { setVal(e.target.value); setInvalid(false) }}
        onBlur={onCancel}
        onKeyDown={e => {
          if (e.key === 'Enter') { e.preventDefault(); commit() }
          if (e.key === 'Escape') { onCancel() }
        }}
        style={{
          width: '5ch', fontSize: 12, fontWeight: 700,
          background: 'var(--bg4)', color: invalid ? 'var(--red)' : 'var(--accent)',
          border: `1px solid ${invalid ? 'var(--red)' : 'var(--accent)'}`,
          borderRadius: 4, padding: '1px 3px', outline: 'none',
        }}
      />
    </div>
  )
}

// ─── Main editor ─────────────────────────────────────────────────────────────

export default function SongEditor({ songs, user, pendingOpenSong, setPendingOpenSong }) {
  const [selectedSong, setSelectedSong] = useState(null)
  const [variants, setVariants] = useState([])
  const [selectedVariantId, setSelectedVariantId] = useState(null)
  const [variantName, setVariantName] = useState('')
  const [lines, setLines] = useState([])
  const [originalLines, setOriginalLines] = useState([])
  const [savedLines, setSavedLines] = useState(null)
  const [undoStack, setUndoStack] = useState([])
  const [redoStack, setRedoStack] = useState([])
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [editingChordId, setEditingChordId] = useState(null)
  const [addingChord, setAddingChord] = useState(null) // { lineIdx, charPos }
  const [dragState, setDragState] = useState(null)
  const [autosaveTimer, setAutosaveTimer] = useState(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmPublish, setConfirmPublish] = useState(false)

  // Refs to avoid stale closures in event handlers
  const linesRef = useRef(lines)
  const undoRef = useRef(undoStack)
  const redoRef = useRef(redoStack)
  const selectedVariantIdRef = useRef(selectedVariantId)
  const variantNameRef = useRef(variantName)
  useEffect(() => { linesRef.current = lines }, [lines])
  useEffect(() => { undoRef.current = undoStack }, [undoStack])
  useEffect(() => { redoRef.current = redoStack }, [redoStack])
  useEffect(() => { selectedVariantIdRef.current = selectedVariantId }, [selectedVariantId])
  useEffect(() => { variantNameRef.current = variantName }, [variantName])

  // ── Undo/redo ──────────────────────────────────────────────────────────────

  const applyChange = useCallback((newLines) => {
    setUndoStack(s => [...s, linesRef.current])
    setRedoStack([])
    setLines(newLines)
    setDirty(true)
  }, [])

  const scheduleAutosave = useCallback((newLines, variantId, name) => {
    if (!variantId) return
    setAutosaveTimer(prev => {
      if (prev) clearTimeout(prev)
      return setTimeout(async () => {
        try {
          await updateSongVariant(variantId, name, serializeLinesToLyrics(newLines))
        } catch { /* silent */ }
      }, 2000)
    })
  }, [])

  // ── Load song / variant ────────────────────────────────────────────────────

  const loadSong = useCallback(async (song) => {
    setSelectedSong(song)
    setSelectedVariantId(null)
    setVariantName('')
    setDirty(false)
    setUndoStack([])
    setRedoStack([])
    setEditingChordId(null)
    setAddingChord(null)
    setSaveError('')
    const parsed = parseLyricsToLines(song.lyrics || '')
    setLines(parsed)
    setOriginalLines(parsed)
    setSavedLines(null)
    try {
      const v = await listSongVariants(song.id)
      setVariants(v)
    } catch { setVariants([]) }
  }, [])

  const loadVariant = useCallback((variant) => {
    setSelectedVariantId(variant.id)
    setVariantName(variant.name)
    setDirty(false)
    setUndoStack([])
    setRedoStack([])
    setEditingChordId(null)
    setAddingChord(null)
    setSaveError('')
    const parsed = parseLyricsToLines(variant.chord_data || '')
    setLines(parsed)
    setSavedLines(parsed)
  }, [])

  // Pre-load song when navigating from Library "Edit Variants" button
  useEffect(() => {
    if (pendingOpenSong && pendingOpenSong.lyrics) {
      loadSong(pendingOpenSong)
      setPendingOpenSong(null)
    }
  }, [pendingOpenSong, loadSong, setPendingOpenSong])

  // Keyboard undo/redo
  useEffect(() => {
    const handler = (e) => {
      const meta = e.metaKey || e.ctrlKey
      if (!meta) return
      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        const stack = undoRef.current
        if (!stack.length) return
        const prev = stack[stack.length - 1]
        setRedoStack(r => [...r, linesRef.current])
        setUndoStack(s => s.slice(0, -1))
        setLines(prev)
        setDirty(true)
      } else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
        e.preventDefault()
        const stack = redoRef.current
        if (!stack.length) return
        const next = stack[stack.length - 1]
        setUndoStack(s => [...s, linesRef.current])
        setRedoStack(r => r.slice(0, -1))
        setLines(next)
        setDirty(true)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  // ── Drag ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!dragState) return

    const onMouseMove = (e) => {
      const { chordId, lineIdx, startX, startCharPos, startLineY } = dragState
      // Use fractional charPos during drag for smooth pixel movement
      const deltaCharPos = (e.clientX - startX) / CHAR_W
      const LINE_HEIGHT = 52
      const lineOffset = Math.round((e.clientY - startLineY) / LINE_HEIGHT)
      const targetLineIdx = Math.max(0, Math.min(linesRef.current.length - 1, lineIdx + lineOffset))
      const targetLine = linesRef.current[targetLineIdx]
      const newCharPos = Math.max(0, Math.min(
        targetLine.text.length,
        startCharPos + deltaCharPos
      ))

      setLines(prev => {
        const next = prev.map((line, li) => {
          if (li === lineIdx && lineIdx !== targetLineIdx) {
            return { ...line, chords: line.chords.filter(c => c.id !== chordId) }
          }
          return line
        }).map((line, li) => {
          if (li === targetLineIdx) {
            if (lineIdx === targetLineIdx) {
              return {
                ...line,
                chords: line.chords.map(c =>
                  c.id === chordId ? { ...c, charPos: newCharPos } : c
                )
              }
            } else {
              const movedChord = prev[lineIdx]?.chords.find(c => c.id === chordId)
              if (!movedChord) return line
              return {
                ...line,
                chords: [...line.chords.filter(c => c.id !== chordId), { ...movedChord, charPos: newCharPos }]
              }
            }
          }
          return line
        })
        return next
      })
    }

    const onMouseUp = () => {
      // Snap fractional charPos to integers on commit
      const snapped = linesRef.current.map(line => ({
        ...line,
        chords: line.chords.map(c => ({ ...c, charPos: Math.round(c.charPos) }))
      }))
      setUndoStack(s => [...s, dragState.snapshot])
      setRedoStack([])
      setLines(snapped)
      setDirty(true)
      scheduleAutosave(snapped, selectedVariantIdRef.current, variantNameRef.current)
      setDragState(null)
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
  }, [dragState, scheduleAutosave])

  const startDrag = useCallback((e, lineIdx, chordId) => {
    const chord = linesRef.current[lineIdx]?.chords.find(c => c.id === chordId)
    if (!chord) return
    setEditingChordId(null)
    setAddingChord(null)
    setDragState({
      chordId, lineIdx,
      startX: e.clientX,
      startCharPos: chord.charPos,
      startLineY: e.clientY,
      snapshot: JSON.parse(JSON.stringify(linesRef.current)),
    })
  }, [])

  // ── Add chord by clicking on a line ───────────────────────────────────────

  const handleLineClick = useCallback((e, lineIdx) => {
    if (dragState) return
    const rect = e.currentTarget.getBoundingClientRect()
    const charPos = Math.round((e.clientX - rect.left) / CHAR_W)
    setEditingChordId(null)
    setAddingChord({ lineIdx, charPos: Math.max(0, charPos) })
  }, [dragState])

  const commitAddChord = useCallback((lineIdx, charPos, name) => {
    const newLines = linesRef.current.map((line, li) =>
      li === lineIdx
        ? { ...line, chords: [...line.chords, { id: Math.random().toString(36).slice(2), name, charPos }] }
        : line
    )
    applyChange(newLines)
    scheduleAutosave(newLines, selectedVariantIdRef.current, variantNameRef.current)
    setAddingChord(null)
  }, [applyChange, scheduleAutosave])

  // ── Chord operations ──────────────────────────────────────────────────────

  const editChord = (lineIdx, chordId, newName) => {
    const newLines = lines.map((line, li) =>
      li === lineIdx
        ? { ...line, chords: line.chords.map(c => c.id === chordId ? { ...c, name: newName } : c) }
        : line
    )
    applyChange(newLines)
    scheduleAutosave(newLines, selectedVariantId, variantName)
    setEditingChordId(null)
  }

  const deleteChord = (lineIdx, chordId) => {
    const newLines = lines.map((line, li) =>
      li === lineIdx
        ? { ...line, chords: line.chords.filter(c => c.id !== chordId) }
        : line
    )
    applyChange(newLines)
    scheduleAutosave(newLines, selectedVariantId, variantName)
  }

  // ── Save/publish/delete ───────────────────────────────────────────────────

  const saveVariant = async () => {
    if (!selectedSong) return
    setSaving(true); setSaveError('')
    try {
      if (!selectedVariantId) {
        const name = variantName.trim() || 'Untitled Variant'
        const newId = await createSongVariant(selectedSong.id, name, serializeLinesToLyrics(lines))
        setSelectedVariantId(newId)
        setVariantName(name)
        const v = await listSongVariants(selectedSong.id)
        setVariants(v)
        setSavedLines(JSON.parse(JSON.stringify(lines)))
      } else {
        await updateSongVariant(selectedVariantId, variantName || 'Untitled Variant', serializeLinesToLyrics(lines))
        setSavedLines(JSON.parse(JSON.stringify(lines)))
        setVariants(v => v.map(x => x.id === selectedVariantId ? { ...x, name: variantName, chord_data: serializeLinesToLyrics(lines) } : x))
      }
      setDirty(false)
    } catch (err) {
      setSaveError(err.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const publishVariant = async () => {
    if (!selectedVariantId) return
    setSaving(true); setSaveError('')
    try {
      await updateSongVariant(selectedVariantId, variantName || 'Untitled Variant', serializeLinesToLyrics(lines))
      await publishSongVariant(selectedVariantId)
      const v = await listSongVariants(selectedSong.id)
      setVariants(v)
      setDirty(false)
      setSavedLines(JSON.parse(JSON.stringify(lines)))
    } catch (err) {
      setSaveError(err.message || 'Publish failed')
    } finally {
      setSaving(false)
      setConfirmPublish(false)
    }
  }

  const unpublishVariant = async () => {
    if (!selectedVariantId) return
    setSaving(true); setSaveError('')
    try {
      await unpublishSongVariant(selectedVariantId)
      const v = await listSongVariants(selectedSong.id)
      setVariants(v)
    } catch (err) {
      setSaveError(err.message || 'Failed')
    } finally {
      setSaving(false)
    }
  }

  const deleteVariant = async () => {
    if (!selectedVariantId) return
    setSaving(true); setSaveError('')
    try {
      await deleteSongVariant(selectedVariantId)
      setSelectedVariantId(null)
      setVariantName('')
      setDirty(false)
      setSavedLines(null)
      const v = await listSongVariants(selectedSong.id)
      setVariants(v)
      setLines(JSON.parse(JSON.stringify(originalLines)))
      setUndoStack([]); setRedoStack([])
    } catch (err) {
      setSaveError(err.message || 'Delete failed')
    } finally {
      setSaving(false)
      setConfirmDelete(false)
    }
  }

  const discardChanges = () => {
    const target = savedLines ?? originalLines
    applyChange(JSON.parse(JSON.stringify(target)))
    setDirty(false)
  }

  const resetToOriginal = () => {
    applyChange(JSON.parse(JSON.stringify(originalLines)))
    setDirty(false)
    setConfirmReset(false)
  }

  const currentVariant = variants.find(v => v.id === selectedVariantId)
  const isPublished = currentVariant?.status === 'published'

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: '24px 28px', maxWidth: 900 }}>

      {/* ── Song picker ────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 24, flexWrap: 'wrap' }}>
        <select
          value={selectedSong?.id || ''}
          onChange={e => {
            const song = songs.find(s => s.id === e.target.value)
            if (song) loadSong(song)
          }}
          style={{
            background: 'var(--bg3)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '8px 12px', color: 'var(--text)',
            fontSize: 14, minWidth: 220, cursor: 'pointer',
          }}
        >
          <option value="">— Select a song —</option>
          {songs.filter(s => s.lyrics).map(s => (
            <option key={s.id} value={s.id}>{s.title}{s.artist ? ` — ${s.artist}` : ''}</option>
          ))}
        </select>

        {selectedSong && (
          <select
            value={selectedVariantId || ''}
            onChange={e => {
              if (!e.target.value) {
                setSelectedVariantId(null)
                setVariantName('')
                setLines(JSON.parse(JSON.stringify(originalLines)))
                setSavedLines(null)
                setDirty(false)
                setUndoStack([]); setRedoStack([])
              } else {
                const v = variants.find(x => x.id === e.target.value)
                if (v) loadVariant(v)
              }
            }}
            style={{
              background: 'var(--bg3)', border: '1px solid var(--border)',
              borderRadius: 8, padding: '8px 12px', color: 'var(--text)',
              fontSize: 14, cursor: 'pointer',
            }}
          >
            <option value="">Original (editing copy)</option>
            {variants.map(v => (
              <option key={v.id} value={v.id}>
                {v.name}{v.status === 'draft' ? ' (draft)' : ''}
              </option>
            ))}
          </select>
        )}
      </div>

      {!selectedSong && (
        <div style={{
          background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: 12, padding: 40, textAlign: 'center', color: 'var(--muted)',
        }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>✏️</div>
          <div style={{ fontFamily: 'var(--font-head)', fontSize: 16, marginBottom: 8 }}>Song Editor</div>
          <div style={{ fontSize: 14 }}>Select a song above to start editing chord arrangements.</div>
          {songs.filter(s => s.lyrics).length === 0 && (
            <div style={{ fontSize: 13, marginTop: 12, color: 'var(--red)' }}>
              No songs with chord charts found. Upload a chord chart in the Library first.
            </div>
          )}
        </div>
      )}

      {selectedSong && (
        <>
          {/* ── Variant name + controls ──────────────────────────────────── */}
          <div style={{
            background: 'var(--bg2)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '16px 20px', marginBottom: 16,
            display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center',
          }}>
            <input
              value={variantName}
              onChange={e => setVariantName(e.target.value)}
              placeholder="Variant name (e.g. Acoustic Version)"
              style={{
                background: 'var(--bg3)', border: '1px solid var(--border)',
                borderRadius: 8, padding: '7px 12px', color: 'var(--text)',
                fontSize: 14, flex: '1 1 180px', minWidth: 0,
              }}
            />

            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={() => {
                  if (!undoStack.length) return
                  const prev = undoStack[undoStack.length - 1]
                  setRedoStack(r => [...r, lines])
                  setUndoStack(s => s.slice(0, -1))
                  setLines(prev)
                  setDirty(true)
                }}
                disabled={!undoStack.length}
                style={toolBtn(!undoStack.length)}
                title="Undo (⌘Z)"
              >↩ Undo</button>
              <button
                onClick={() => {
                  if (!redoStack.length) return
                  const next = redoStack[redoStack.length - 1]
                  setUndoStack(s => [...s, lines])
                  setRedoStack(r => r.slice(0, -1))
                  setLines(next)
                  setDirty(true)
                }}
                disabled={!redoStack.length}
                style={toolBtn(!redoStack.length)}
                title="Redo (⌘⇧Z)"
              >↪ Redo</button>
            </div>

            <button
              onClick={discardChanges}
              disabled={!dirty}
              style={toolBtn(!dirty)}
              title="Discard unsaved changes"
            >Discard changes</button>

            <button
              onClick={() => setConfirmReset(true)}
              style={toolBtn(false)}
              title="Reset to original song chords"
            >Reset to original</button>
          </div>

          {/* Confirm reset dialog */}
          {confirmReset && (
            <div style={dialogOverlay}>
              <div style={dialogBox}>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>Reset to original?</div>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>
                  This will discard all your changes and restore the song's original chord arrangement. You can still undo this action.
                </div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button onClick={() => setConfirmReset(false)} style={toolBtn(false)}>Cancel</button>
                  <button onClick={resetToOriginal} style={dangerBtn}>Reset</button>
                </div>
              </div>
            </div>
          )}

          {/* ── Save / publish / delete row ──────────────────────────────── */}
          <div style={{
            display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 20,
          }}>
            <button onClick={saveVariant} disabled={saving} style={accentBtn}>
              {saving ? 'Saving...' : selectedVariantId ? 'Save draft' : 'Save as variant'}
            </button>

            {selectedVariantId && !isPublished && (
              <button onClick={() => setConfirmPublish(true)} disabled={saving} style={accentBtn}>
                Publish
              </button>
            )}

            {selectedVariantId && isPublished && (
              <button onClick={unpublishVariant} disabled={saving} style={toolBtn(false)}>
                Unpublish
              </button>
            )}

            {selectedVariantId && (
              <button onClick={() => setConfirmDelete(true)} disabled={saving} style={dangerBtnSm}>
                Delete variant
              </button>
            )}

            {currentVariant && (
              <span style={{ fontSize: 12, color: isPublished ? 'var(--green)' : 'var(--muted)', marginLeft: 4 }}>
                {isPublished ? '● Published' : '○ Draft'}
              </span>
            )}

            {!selectedVariantId && (
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>Editing original — save to create a variant</span>
            )}

            {saveError && (
              <span style={{ fontSize: 13, color: 'var(--red)' }}>{saveError}</span>
            )}
          </div>

          {/* Confirm publish dialog */}
          {confirmPublish && (
            <div style={dialogOverlay}>
              <div style={dialogBox}>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>
                  Publish "{variantName || 'Untitled Variant'}"?
                </div>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>
                  This will make it visible to everyone in your church.
                </div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button onClick={() => setConfirmPublish(false)} style={toolBtn(false)}>Cancel</button>
                  <button onClick={publishVariant} disabled={saving} style={accentBtn}>
                    {saving ? 'Publishing...' : 'Publish'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Confirm delete dialog */}
          {confirmDelete && (
            <div style={dialogOverlay}>
              <div style={dialogBox}>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>Delete this variant?</div>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>
                  This cannot be undone.
                </div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button onClick={() => setConfirmDelete(false)} style={toolBtn(false)}>Cancel</button>
                  <button onClick={deleteVariant} disabled={saving} style={dangerBtn}>
                    {saving ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Editor hint ──────────────────────────────────────────────── */}
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16, lineHeight: 1.5 }}>
            <strong style={{ color: 'var(--text)' }}>Click</strong> empty space to add a chord ·{' '}
            <strong style={{ color: 'var(--text)' }}>Drag</strong> to reposition ·{' '}
            <strong style={{ color: 'var(--text)' }}>Click chord</strong> to rename ·{' '}
            <strong style={{ color: 'var(--text)' }}>✕</strong> to delete
          </div>

          {/* ── Canvas ───────────────────────────────────────────────────── */}
          <div
            style={{
              background: 'var(--bg2)', border: '1px solid var(--border)',
              borderRadius: 12, padding: '24px 28px',
              fontFamily: 'monospace', fontSize: 13,
              cursor: dragState ? 'grabbing' : 'default',
              userSelect: dragState ? 'none' : 'auto',
              overflowX: 'auto',
            }}
            onClick={() => { setEditingChordId(null); setAddingChord(null) }}
          >
            {lines.length === 0 && (
              <div style={{ color: 'var(--muted)', fontSize: 14 }}>
                This song has no chord data yet.
              </div>
            )}
            {lines.map((line, lineIdx) => {
              const isSectionLabel = /^\s*\[/.test(line.text) && line.chords.length === 0
              const isAddingHere = addingChord?.lineIdx === lineIdx

              return (
                <div
                  key={lineIdx}
                  style={{
                    position: 'relative',
                    marginBottom: 6,
                    paddingTop: 26,
                    minHeight: 46,
                    cursor: dragState ? 'grabbing' : 'crosshair',
                  }}
                  onClick={e => { e.stopPropagation(); handleLineClick(e, lineIdx) }}
                >
                  {/* Chord tokens */}
                  {line.chords.map(chord => (
                    <ChordToken
                      key={chord.id}
                      chord={chord}
                      editing={editingChordId === `${lineIdx}-${chord.id}`}
                      onDragStart={e => startDrag(e, lineIdx, chord.id)}
                      onEdit={() => { setAddingChord(null); setEditingChordId(`${lineIdx}-${chord.id}`) }}
                      onEditCommit={newName => editChord(lineIdx, chord.id, newName)}
                      onEditCancel={() => setEditingChordId(null)}
                      onDelete={() => deleteChord(lineIdx, chord.id)}
                    />
                  ))}

                  {/* Add chord inline input */}
                  {isAddingHere && (
                    <AddChordInput
                      charPos={addingChord.charPos}
                      onCommit={name => commitAddChord(lineIdx, addingChord.charPos, name)}
                      onCancel={() => setAddingChord(null)}
                    />
                  )}

                  {/* Lyric text */}
                  <span style={{
                    color: isSectionLabel ? 'var(--muted)' : 'var(--text)',
                    whiteSpace: 'pre',
                    fontStyle: isSectionLabel ? 'italic' : 'normal',
                  }}>
                    {line.text || '\u00a0'}
                  </span>
                </div>
              )
            })}
          </div>

          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 10 }}>
            {dirty ? '● Unsaved changes' : '✓ Up to date'}
            {selectedVariantId && dirty && '  — autosaves in 2s'}
          </div>
        </>
      )}
    </div>
  )
}
