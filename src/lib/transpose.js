const SHARPS = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']
const FLATS  = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B']
const NOTE_MAP = {
  C:0,'C#':1,Db:1,D:2,'D#':3,Eb:3,E:4,F:5,
  'F#':6,Gb:6,G:7,'G#':8,Ab:8,A:9,'A#':10,Bb:10,B:11
}
const FLAT_KEY_ROOTS = new Set(['F','Bb','Eb','Ab','Db','Gb','Dm','Gm','Cm','Fm','Bbm','Ebm'])

export const TRANSPOSE_KEYS = [
  'C','C#','Db','D','D#','Eb','E','F','F#','Gb','G','G#','Ab','A','A#','Bb','B',
  'Cm','C#m','Dbm','Dm','D#m','Ebm','Em','Fm','F#m','Gbm','Gm','G#m','Abm','Am','A#m','Bbm','Bm',
  'Numbers'
]

const SCALE_DEGREES = { 0:'1', 1:'b2', 2:'2', 3:'b3', 4:'3', 5:'4', 6:'b5', 7:'5', 8:'b6', 9:'6', 10:'b7', 11:'7' }

export function chordToNashville(chord, fromKey) {
  const keyRoot = (fromKey?.includes('/') ? fromKey.split('/')[0] : fromKey)?.replace(/m$/, '')
  const keyIdx = noteIndex(keyRoot)
  if (keyIdx === -1) return chord
  let i = (chord.length > 1 && (chord[1] === '#' || chord[1] === 'b')) ? 2 : 1
  const root = chord.slice(0, i)
  let suffix = chord.slice(i)
  let bassNote = null
  const slashIdx = suffix.lastIndexOf('/')
  if (slashIdx !== -1) {
    const rawBass = suffix.slice(slashIdx + 1)
    if (/^[A-G][#b]?$/.test(rawBass)) { bassNote = rawBass; suffix = suffix.slice(0, slashIdx) }
  }
  const rootDeg = SCALE_DEGREES[(noteIndex(root) - keyIdx + 12) % 12]
  const bassDeg = bassNote ? SCALE_DEGREES[(noteIndex(bassNote) - keyIdx + 12) % 12] : null
  return rootDeg + suffix + (bassDeg ? '/' + bassDeg : '')
}

export function convertLyricsToNashville(lyrics, fromKey) {
  if (!lyrics || !fromKey) return lyrics
  return lyrics.replace(/\[([^\]]+)\]/g, (match, inner) => {
    if (!isChordName(inner)) return match
    return '[' + chordToNashville(normalizeChord(inner), fromKey) + ']'
  })
}

export function noteIndex(note) {
  return NOTE_MAP[note] ?? -1
}

export function usesFlats(key) {
  const k = key?.includes('/') ? key.split('/')[1] : key
  return FLAT_KEY_ROOTS.has(k)
}

export function transposeNote(note, semitones, useFlats) {
  const idx = noteIndex(note)
  if (idx === -1) return note
  return (useFlats ? FLATS : SHARPS)[(idx + semitones + 12) % 12]
}

export function transposeChord(chord, semitones, useFlats) {
  // Extract root: [A-G] optionally followed by # or b
  let i = (chord.length > 1 && (chord[1] === '#' || chord[1] === 'b')) ? 2 : 1
  const root = chord.slice(0, i)
  let suffix = chord.slice(i)

  // Handle slash bass e.g. Bbm7/F
  let bassNote = null
  const slashIdx = suffix.lastIndexOf('/')
  if (slashIdx !== -1) {
    const rawBass = suffix.slice(slashIdx + 1)
    if (/^[A-G][#b]?$/.test(rawBass)) {
      bassNote = rawBass
      suffix = suffix.slice(0, slashIdx)
    }
  }

  const newRoot = transposeNote(root, semitones, useFlats)
  const newBass = bassNote ? transposeNote(bassNote, semitones, useFlats) : null
  return newRoot + suffix + (newBass ? '/' + newBass : '')
}

export function getSemitones(fromKey, toKey) {
  const rootFrom = (fromKey?.includes('/') ? fromKey.split('/')[0] : fromKey)?.replace(/m$/, '')
  const rootTo   = (toKey?.includes('/')   ? toKey.split('/')[0]   : toKey)?.replace(/m$/, '')
  const from = noteIndex(rootFrom)
  const to   = noteIndex(rootTo)
  if (from === -1 || to === -1) return 0
  return (to - from + 12) % 12
}

// Normalize shorthand notations: D+ → D (major), D- → Dm (minor), D-7 → Dm7
export function normalizeChord(s) {
  return s
    .replace(/^([A-G][#b]?)\+([0-9]*)$/, '$1$2')
    .replace(/^([A-G][#b]?)-([0-9]*)$/, '$1m$2')
}

export function isChordName(s) {
  return /^[A-G][#b]?(\+[0-9]*|-[0-9]*|(m|M|maj|min|dim|aug|sus|add)?[0-9]*)(\/[A-G][#b]?)?$/.test(s)
}

export function transposeLyrics(lyrics, fromKey, toKey) {
  if (!lyrics || !fromKey || !toKey) return lyrics
  if (toKey === 'Numbers') return convertLyricsToNashville(lyrics, fromKey)
  if (fromKey === toKey) return lyrics
  const semitones = getSemitones(fromKey, toKey)
  if (semitones === 0) return lyrics
  const flats = usesFlats(toKey)
  return lyrics.replace(/\[([^\]]+)\]/g, (match, inner) => {
    if (!isChordName(inner)) return match
    return '[' + transposeChord(normalizeChord(inner), semitones, flats) + ']'
  })
}
