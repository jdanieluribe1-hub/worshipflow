import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  createSongVariant, updateSongVariant, publishSongVariant,
  unpublishSongVariant, deleteSongVariant, listSongVariants,
  updateSong,
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

function ChordToken({ chord, editing, mode, onDragStart, onEdit, onEditCommit, onEditCancel, onDelete }) {
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

  const isDeleteMode = mode === 'delete'
  const isMoveMode = mode === 'move' || mode === 'add'

  const chordColor = isDeleteMode ? 'var(--red)' : 'var(--accent)'
  const chordBg = isDeleteMode
    ? (hovered ? 'rgba(255,80,80,0.18)' : 'var(--bg3)')
    : (hovered ? 'var(--bg4)' : 'var(--bg3)')
  const chordCursor = isDeleteMode ? 'pointer' : 'grab'

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
              fontSize: 12, fontWeight: 700, color: chordColor,
              background: chordBg,
              borderRadius: 4, padding: '3px 7px',
              cursor: chordCursor, whiteSpace: 'nowrap',
              border: '1px solid transparent',
              borderColor: hovered ? (isDeleteMode ? 'var(--red)' : 'var(--border2)') : 'transparent',
              touchAction: 'none',
              minHeight: 28, display: 'inline-flex', alignItems: 'center',
              transition: 'background 0.1s, border-color 0.1s',
            }}
            onPointerDown={e => {
              if (isDeleteMode) {
                e.preventDefault()
                e.stopPropagation()
                onDelete()
                return
              }
              e.preventDefault()
              e.stopPropagation()
              onDragStart(e)
            }}
            onClick={e => {
              e.stopPropagation()
              if (!isDeleteMode && isMoveMode) onEdit()
            }}
          >
            {chord.name}
          </span>
          {/* Show ✕ on hover in move/add mode only — not needed in delete mode */}
          {hovered && !isDeleteMode && (
            <span
              onPointerDown={e => { e.preventDefault(); e.stopPropagation(); onDelete() }}
              style={{
                fontSize: 10, color: 'var(--muted)', cursor: 'pointer',
                lineHeight: 1, padding: '3px 5px',
                borderRadius: 3, background: 'var(--bg4)',
                border: '1px solid var(--border)',
                minHeight: 28, display: 'inline-flex', alignItems: 'center',
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

// ─── Mode toolbar ─────────────────────────────────────────────────────────────

const MODES = [
  { id: 'move',   icon: '⇄', label: 'Move'   },
  { id: 'add',    icon: '+', label: 'Add'    },
  { id: 'delete', icon: '✕', label: 'Delete' },
]

const MODE_HINTS = {
  move:   <><strong>Drag</strong> chord to move it · <strong>Tap chord</strong> to rename · hover for <strong>✕</strong> to delete</>,
  add:    <><strong>Tap empty space</strong> on a line to add a chord · <strong>Tap chord</strong> to rename</>,
  delete: <><strong>Tap any chord</strong> to delete it instantly · switch to Move to reposition</>,
}

function ModeToolbar({ mode, onChange }) {
  return (
    <div style={{
      display: 'inline-flex',
      background: 'var(--bg3)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      padding: 3,
      gap: 2,
    }}>
      {MODES.map(m => {
        const active = mode === m.id
        return (
          <button
            key={m.id}
            onClick={() => onChange(m.id)}
            style={{
              background: active ? 'var(--accent)' : 'transparent',
              color: active ? '#fff' : 'var(--muted)',
              border: 'none',
              borderRadius: 7,
              padding: '8px 18px',
              fontSize: 13,
              fontWeight: active ? 600 : 400,
              cursor: 'pointer',
              minWidth: 80,
              minHeight: 40,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              transition: 'background 0.15s, color 0.15s',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <span style={{ fontSize: 14 }}>{m.icon}</span>
            {m.label}
          </button>
        )
      })}
    </div>
  )
}

// ─── Main editor ─────────────────────────────────────────────────────────────

export default function SongEditor({ songs, user, pendingOpenSong, setPendingOpenSong }) {
  const { t } = useTranslation()
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
  const [confirmSetAsOriginal, setConfirmSetAsOriginal] = useState(false)
  const [editorMode, setEditorMode] = useState('move') // 'move' | 'add' | 'delete'

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

  const switchMode = useCallback((m) => {
    setEditorMode(m)
    setEditingChordId(null)
    setAddingChord(null)
  }, [])

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
    setEditorMode('move')
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

  // ── Drag — uses pointer events for mouse + touch ───────────────────────────

  useEffect(() => {
    if (!dragState) return

    const onPointerMove = (e) => {
      const { chordId, lineIdx: originLineIdx, startX, startCharPos, startLineY } = dragState
      const deltaCharPos = (e.clientX - startX) / CHAR_W
      const LINE_HEIGHT = 52
      const lineOffset = Math.round((e.clientY - startLineY) / LINE_HEIGHT)
      const targetLineIdx = Math.max(0, Math.min(linesRef.current.length - 1, originLineIdx + lineOffset))
      const targetLine = linesRef.current[targetLineIdx]
      const newCharPos = Math.max(0, Math.min(targetLine.text.length, startCharPos + deltaCharPos))

      setLines(prev => {
        // Always find where the chord actually is right now, not where it started
        const currentLineIdx = prev.findIndex(line => line.chords.some(c => c.id === chordId))
        if (currentLineIdx === -1) return prev

        if (currentLineIdx === targetLineIdx) {
          return prev.map((line, li) =>
            li === currentLineIdx
              ? { ...line, chords: line.chords.map(c => c.id === chordId ? { ...c, charPos: newCharPos } : c) }
              : line
          )
        }

        const movedChord = prev[currentLineIdx].chords.find(c => c.id === chordId)
        if (!movedChord) return prev
        return prev.map((line, li) => {
          if (li === currentLineIdx) return { ...line, chords: line.chords.filter(c => c.id !== chordId) }
          if (li === targetLineIdx) return { ...line, chords: [...line.chords.filter(c => c.id !== chordId), { ...movedChord, charPos: newCharPos }] }
          return line
        })
      })
    }

    const onPointerUp = () => {
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

    document.addEventListener('pointermove', onPointerMove)
    document.addEventListener('pointerup', onPointerUp)
    return () => {
      document.removeEventListener('pointermove', onPointerMove)
      document.removeEventListener('pointerup', onPointerUp)
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

  // ── Add chord — only in 'add' mode ────────────────────────────────────────

  const handleLineClick = useCallback((e, lineIdx) => {
    if (dragState) return
    if (editorMode !== 'add') return
    const rect = e.currentTarget.getBoundingClientRect()
    const charPos = Math.round((e.clientX - rect.left) / CHAR_W)
    setEditingChordId(null)
    setAddingChord({ lineIdx, charPos: Math.max(0, charPos) })
  }, [dragState, editorMode])

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
        const name = variantName.trim() || t('songEditor.untitledVariant')
        const newId = await createSongVariant(selectedSong.id, name, serializeLinesToLyrics(lines))
        setSelectedVariantId(newId)
        setVariantName(name)
        const v = await listSongVariants(selectedSong.id)
        setVariants(v)
        setSavedLines(JSON.parse(JSON.stringify(lines)))
      } else {
        await updateSongVariant(selectedVariantId, variantName || t('songEditor.untitledVariant'), serializeLinesToLyrics(lines))
        setSavedLines(JSON.parse(JSON.stringify(lines)))
        setVariants(v => v.map(x => x.id === selectedVariantId ? { ...x, name: variantName, chord_data: serializeLinesToLyrics(lines) } : x))
      }
      setDirty(false)
    } catch (err) {
      setSaveError(err.message || t('errors.saveFailed', { msg: '' }))
    } finally {
      setSaving(false)
    }
  }

  const publishVariant = async () => {
    if (!selectedVariantId) return
    setSaving(true); setSaveError('')
    try {
      await updateSongVariant(selectedVariantId, variantName || t('songEditor.untitledVariant'), serializeLinesToLyrics(lines))
      await publishSongVariant(selectedVariantId)
      const v = await listSongVariants(selectedSong.id)
      setVariants(v)
      setDirty(false)
      setSavedLines(JSON.parse(JSON.stringify(lines)))
    } catch (err) {
      setSaveError(err.message || t('errors.publishFailed', { msg: '' }))
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
      setSaveError(err.message || t('errors.generic', { msg: '' }))
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
      setSaveError(err.message || t('errors.deleteFailed', { msg: '' }))
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

  const setAsOriginal = async () => {
    if (!selectedSong || !selectedVariantId) return
    setSaving(true); setSaveError('')
    try {
      const newLyrics = serializeLinesToLyrics(lines)
      await updateSong(selectedSong.id, { lyrics: newLyrics })
      const newParsed = parseLyricsToLines(newLyrics)
      setOriginalLines(newParsed)
      setSelectedSong(prev => ({ ...prev, lyrics: newLyrics }))
    } catch (err) {
      setSaveError(err.message || 'Failed to set as original')
    } finally {
      setSaving(false)
      setConfirmSetAsOriginal(false)
    }
  }

  const currentVariant = variants.find(v => v.id === selectedVariantId)
  const isPublished = currentVariant?.status === 'published'

  // Canvas cursor feedback
  const canvasCursor = dragState ? 'grabbing' : (editorMode === 'add' ? 'crosshair' : 'default')
  const lineCursor = dragState ? 'grabbing' : (editorMode === 'add' ? 'crosshair' : 'default')

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
          <option value="">{t('songEditor.selectSong')}</option>
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
            <option value="">{t('songEditor.originalEditing')}</option>
            {variants.map(v => (
              <option key={v.id} value={v.id}>
                {v.name}{v.status === 'draft' ? t('songEditor.draftLabel') : ''}
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
          <div style={{ fontFamily: 'var(--font-head)', fontSize: 16, marginBottom: 8 }}>{t('songEditor.title')}</div>
          <div style={{ fontSize: 14 }}>{t('songEditor.emptyState')}</div>
          {songs.filter(s => s.lyrics).length === 0 && (
            <div style={{ fontSize: 13, marginTop: 12, color: 'var(--red)' }}>
              {t('songEditor.noSongsWithCharts')}
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
              placeholder={t('songEditor.variantNamePlaceholder')}
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
              >{t('songEditor.undo')}</button>
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
              >{t('songEditor.redo')}</button>
            </div>

            <button
              onClick={discardChanges}
              disabled={!dirty}
              style={toolBtn(!dirty)}
              title="Discard unsaved changes"
            >{t('songEditor.discardChanges')}</button>

            <button
              onClick={() => setConfirmReset(true)}
              style={toolBtn(false)}
              title="Reset to original song chords"
            >{t('songEditor.resetToOriginal')}</button>
          </div>

          {/* Confirm reset dialog */}
          {confirmReset && (
            <div style={dialogOverlay}>
              <div style={dialogBox}>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>{t('songEditor.resetConfirmTitle')}</div>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>
                  {t('songEditor.resetConfirmBody')}
                </div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button onClick={() => setConfirmReset(false)} style={toolBtn(false)}>{t('common.cancel')}</button>
                  <button onClick={resetToOriginal} style={dangerBtn}>{t('songEditor.reset')}</button>
                </div>
              </div>
            </div>
          )}

          {/* ── Save / publish / delete row ──────────────────────────────── */}
          <div style={{
            display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 20,
          }}>
            <button onClick={saveVariant} disabled={saving} style={accentBtn}>
              {saving ? t('songEditor.saving') : selectedVariantId ? t('songEditor.saveDraft') : t('songEditor.saveAsVariant')}
            </button>

            {selectedVariantId && !isPublished && (
              <button onClick={() => setConfirmPublish(true)} disabled={saving} style={accentBtn}>
                {t('songEditor.publish')}
              </button>
            )}

            {selectedVariantId && isPublished && (
              <button onClick={unpublishVariant} disabled={saving} style={toolBtn(false)}>
                {t('songEditor.unpublish')}
              </button>
            )}

            {selectedVariantId && (
              <button onClick={() => setConfirmSetAsOriginal(true)} disabled={saving} style={toolBtn(false)}
                title="Promote this variant's chords to become the base song">
                Set as original
              </button>
            )}

            {selectedVariantId && (
              <button onClick={() => setConfirmDelete(true)} disabled={saving} style={dangerBtnSm}>
                {t('songEditor.deleteVariant')}
              </button>
            )}

            {currentVariant && (
              <span style={{ fontSize: 12, color: isPublished ? 'var(--green)' : 'var(--muted)', marginLeft: 4 }}>
                {isPublished ? t('songEditor.published') : t('songEditor.draft')}
              </span>
            )}

            {!selectedVariantId && (
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>{t('songEditor.editingOriginalHint')}</span>
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
                  {t('songEditor.publishConfirmTitle', { name: variantName || t('songEditor.untitledVariant') })}
                </div>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>
                  {t('songEditor.publishConfirmBody')}
                </div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button onClick={() => setConfirmPublish(false)} style={toolBtn(false)}>{t('common.cancel')}</button>
                  <button onClick={publishVariant} disabled={saving} style={accentBtn}>
                    {saving ? t('songEditor.publishing') : t('songEditor.publish')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Confirm set as original dialog */}
          {confirmSetAsOriginal && (
            <div style={dialogOverlay}>
              <div style={dialogBox}>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>Set "{variantName}" as original?</div>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>
                  This will permanently overwrite the base song's chords with this variant's chords.
                  All band members will see the new version. This cannot be undone.
                </div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button onClick={() => setConfirmSetAsOriginal(false)} style={toolBtn(false)}>{t('common.cancel')}</button>
                  <button onClick={setAsOriginal} disabled={saving} style={accentBtn}>
                    {saving ? 'Saving…' : 'Set as original'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Confirm delete dialog */}
          {confirmDelete && (
            <div style={dialogOverlay}>
              <div style={dialogBox}>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>{t('songEditor.deleteConfirmTitle')}</div>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>
                  {t('songEditor.deleteConfirmBody')}
                </div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button onClick={() => setConfirmDelete(false)} style={toolBtn(false)}>{t('common.cancel')}</button>
                  <button onClick={deleteVariant} disabled={saving} style={dangerBtn}>
                    {saving ? t('songEditor.deleting') : t('common.delete')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Mode toolbar + hint ───────────────────────────────────────── */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 16,
            marginBottom: 16, flexWrap: 'wrap',
          }}>
            <ModeToolbar mode={editorMode} onChange={switchMode} />
            <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
              {MODE_HINTS[editorMode]}
            </div>
          </div>

          {/* ── Canvas ───────────────────────────────────────────────────── */}
          <div
            style={{
              background: 'var(--bg2)', border: '1px solid var(--border)',
              borderRadius: 12, padding: '24px 28px',
              fontFamily: 'monospace', fontSize: 13,
              cursor: canvasCursor,
              userSelect: dragState ? 'none' : 'auto',
              overflowX: 'auto',
              touchAction: dragState ? 'none' : 'pan-y',
            }}
            onClick={() => { setEditingChordId(null); setAddingChord(null) }}
          >
            {lines.length === 0 && (
              <div style={{ color: 'var(--muted)', fontSize: 14 }}>
                {t('songEditor.noChordData')}
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
                    minHeight: 52,
                    cursor: lineCursor,
                  }}
                  onClick={e => { e.stopPropagation(); handleLineClick(e, lineIdx) }}
                >
                  {/* Chord tokens */}
                  {line.chords.map(chord => (
                    <ChordToken
                      key={chord.id}
                      chord={chord}
                      mode={editorMode}
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
                    {line.text || ' '}
                  </span>
                </div>
              )
            })}
          </div>

          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 10 }}>
            {dirty ? t('songEditor.unsavedChanges') : t('songEditor.upToDate')}
            {selectedVariantId && dirty && t('songEditor.autosavesIn2s')}
          </div>
        </>
      )}
    </div>
  )
}
