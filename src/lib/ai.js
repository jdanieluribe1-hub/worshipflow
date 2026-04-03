export async function parsePDFWithAI(base64PDF) {
  const response = await fetch('/api/parse-pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: base64PDF }
          },
          {
            type: 'text',
            text: `You are processing a worship song chord chart PDF. Extract the full song data including all chords.

PDFs typically show chords above the lyric line they belong to (traditional tab style), aligned by spaces over the syllable they fall on. Convert this to INLINE [Chord] notation placed immediately before the syllable.

Example — chords above lyrics in PDF:
G              D     Em    C
Amazing grace how sweet the sound

Expected inline output:
[Chorus]
[G]Amazing [D]grace how [Em]sweet the [C]sound

Rules:
- Keep ALL chords — do not drop any
- Place each chord inline before the word/syllable it falls on based on spacing
- Use section labels like [Verse 1], [Chorus], [Bridge], [Intro], [Pre-Chorus]
- Song title is at the top of the PDF — do NOT use the filename
- The key is the most prominent chord (usually first chord of intro or verse)
- If the key has a flat write it as e.g. "Bb" not "B♭"
- Respond ONLY with valid JSON, no markdown:
{"title":"song title","artist":"artist name","key":"musical key e.g. G, Bb","tempo":"Fast, Medium, or Slow","lyrics":"full chord chart with inline [Chord] markers and [Section] labels"}`
          }
        ]
      }]
    })
  })
  const data = await response.json()
  const text = data.content?.find(b => b.type === 'text')?.text || '{}'
  try {
    return JSON.parse(text.replace(/```json|```/g, '').trim())
  } catch {
    return { title: '', artist: '', key: '', tempo: 'Medium', lyrics: '' }
  }
}

// Removes inline chord markers like [G], [Am], [C/E], [Bb] but keeps section labels like [Chorus]
function isChordToken(s) {
  return /^[A-G][#b]?(m|M|maj|min|dim|aug|sus|add|2|4|5|6|7|9|11|13)*(\/[A-G][#b]?)?$/.test(s)
}

export function stripChords(lyrics) {
  return lyrics
    .replace(/\[([^\]]+)\]/g, (match, inner) => isChordToken(inner.trim()) ? '' : match)
    .replace(/ {2,}/g, ' ')
    .split('\n').map(l => l.trimEnd()).join('\n')
}

// ─── ProPresenter 7 native binary (.pro) encoder ───────────────────────────
// Generates a real PP7 protobuf binary by templating from known-good slide
// structure extracted from "Abre los cielos.pro" (a real PP7 library file).

function pbVarint(n) {
  const out = []
  while (true) {
    let b = n & 0x7f; n >>>= 7
    if (n) b |= 0x80
    out.push(b)
    if (!n) break
  }
  return new Uint8Array(out)
}
function pbField(fieldNum, wireType) { return pbVarint((fieldNum << 3) | wireType) }
function pbLenDelim(fieldNum, bytes) {
  return concat(pbField(fieldNum, 2), pbVarint(bytes.length), bytes)
}
function pbString(fieldNum, str) {
  const enc = new TextEncoder().encode(str)
  return pbLenDelim(fieldNum, enc)
}
function pbVarintField(fieldNum, val) {
  return concat(pbField(fieldNum, 0), pbVarint(val))
}
function concat(...arrays) {
  const total = arrays.reduce((s, a) => s + a.length, 0)
  const out = new Uint8Array(total)
  let pos = 0
  for (const a of arrays) { out.set(a, pos); pos += a.length }
  return out
}
function hexToBytes(hex) {
  const arr = new Uint8Array(hex.length / 2)
  for (let i = 0; i < arr.length; i++) arr[i] = parseInt(hex.slice(i*2, i*2+2), 16)
  return arr
}
function uuidToProto(uuid) {
  // PP7 stores UUID as a string inside a wrapper message: field[1] = string
  return pbString(1, uuid)
}

function buildRTFBytes(text) {
  // RTF-escape the text for Latin-1 encoding
  const escaped = text
    .replace(/\\/g, '\\\\')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .split('').map(c => {
      const code = c.charCodeAt(0)
      if (code > 255) return `\\'3f` // unknown → '?'
      if (code > 127) return `\\'${code.toString(16).padStart(2, '0')}`
      return c
    }).join('')
    .replace(/\n/g, '\\line\n')

  const rtf =
    `{\\rtf1\\ansi\\ansicpg1252\\cocoartf2869\n` +
    `\\cocoatextscaling0\\cocoaplatform0{\\fonttbl\\f0\\fswiss\\fcharset0 Arial-BoldMT;}\n` +
    `{\\colortbl;\\red255\\green255\\blue255;\\red255\\green255\\blue255;}\n` +
    `{\\*\\expandedcolortbl;;\\cssrgb\\c100000\\c100000\\c100000;}\n` +
    `\\pard\\pardirnatural\\qc\\partightenfactor0\n\n` +
    `\\f0\\b\\fs160 \\cf2 \\kerning1\\expnd20\\expndtw100\n` +
    `${escaped}  }`

  // Encode as Latin-1 bytes (RTF is 8-bit)
  const bytes = new Uint8Array(rtf.length)
  for (let i = 0; i < rtf.length; i++) bytes[i] = rtf.charCodeAt(i) & 0xff
  return bytes
}

// Fixed template bytes extracted from a real PP7 slide's presentation object.
// TMPL_A: everything in the slide's presentation_obj up to and including the
//         RTF field tag byte (0x2a). The varint length is generated dynamically.
// TMPL_B: everything AFTER the RTF content bytes.
// These encode the text element dimensions (1920×1080), font metadata, color,
// transforms, shadow settings — all copied verbatim from "Abre los cielos.pro".
const TMPL_A = hexToBytes(
  '0a260a2442314342313234392d333544342d344436372d393231422d3042353844394543384234303001480bba01e10912de090a87080ab2070a97070a260a2430343746464530412d424436382d343437382d424141412d32423541323630384130423912064c79726963731a280a12090000000000806940117d28a3a838fd76401212090000000000a097401107afb9ae8e85754029000000000000f03f429201080112060a0012001a0012210a0909000000000000f03f120909000000000000f03f1a0909000000000000f03f123c0a1209000000000000f03f11000000000000f03f121209000000000000f03f11000000000000f03f1a1209000000000000f03f11000000000000f03f12210a0911000000000000f03f120911000000000000f03f1a0911000000000000f03f1a0208014a160a140df1f0f03d159190103f1d0000803f250000803f521f1100000000000008401a140d0000803f150000803f1d0000803f250000803f5a2b110000000000b073401900000000000014402100000000000014402a05250000803f31000000000000e83f6209119a9999999999a93f6aa9041a670a200a0c417269616c2d426f6c644d5411000000000000544040014a05417269616c10011a140d0000803f150000803f1d0000803f250000803f2200320d080229000000000000f03f6a003900000000000014404a005900000000000000806a060a02101f1001222d110000000000b07340190000000000001c402100000000000014402a05250000803f31000000000000f03f38012a'
)
const TMPL_B = hexToBytes(
  '30013802420048015a072020e280a2202062161a140d0000803f150000803f1d0000803f250000803f720020034a1411000000000000e03f180121e60e993b64eeb03f2a140dd3d2523f15d3d2d23e1df1f0f03d250000803f3212090000000000009e40110000000000e090403a260a2442394344363230362d443438422d343532342d413335442d4346463039373439394246421a330a260a2431413438383631352d373231452d344334342d393034382d45383246304130334539423310011971339f4df96569401a310a260a2434413044433746412d353630352d344534462d384532362d42433939423334394632353719e24bb65a90ff76401a310a260a2441393837323334352d433743372d344241352d424630312d443138343137324537303241192e0211eb8f6286401a330a260a2431424341393132382d333945452d344632312d413346302d343338313131353245464632100119e48963f1afce9a4022021801'
)

// Section color palette — one entry per section index (cycles)
const SECTION_COLORS = [
  hexToBytes('0dcdcc4c3f1d9d9c9c3e250000803f'),           // Chorus  — blue-ish
  hexToBytes('15efeeee3e1dcdcc4c3f250000803f'),           // Verse 1 — teal
  hexToBytes('15b3b2b23e1d9a99193f250000803f'),           // Verse 2 — green
  hexToBytes('0d9190103e15b4b3333f1d9998983e250000803f'), // Refrain — purple
  hexToBytes('0d9a99193f15908f0f3f1df9f8f83d250000803f'), // End     — orange
]

// Replace a fixed UUID string (36 ASCII bytes) within a Uint8Array with a new one.
// UUIDs are always 36 chars so lengths don't change — no re-encoding needed.
function swapUUID(arr, oldUuid, newUuid) {
  const enc = new TextEncoder()
  const old = enc.encode(oldUuid)
  const nw  = enc.encode(newUuid)
  const out = new Uint8Array(arr)
  for (let i = 0; i <= out.length - old.length; i++) {
    let match = true
    for (let j = 0; j < old.length; j++) {
      if (out[i + j] !== old[j]) { match = false; break }
    }
    if (match) { out.set(nw, i); return out }
  }
  return out
}

function buildSlide(slideUuid, rtfBytes) {
  // Each slide must have unique UUIDs or PP7 deduplicates and drops slides.
  // TMPL_A contains 2 hardcoded UUIDs; TMPL_B contains 5. Replace all 7 per slide.
  let tA = swapUUID(TMPL_A, 'B1CB1249-35D4-4D67-921B-0B58D9EC8B40', crypto.randomUUID())
      tA = swapUUID(tA,     '047FFE0A-BD68-4478-BAAA-2B5A2608A0B9', crypto.randomUUID())
  let tB = swapUUID(TMPL_B, 'B9CD6206-D48B-4524-A35D-CFF097499BFB', crypto.randomUUID())
      tB = swapUUID(tB,     '1A488615-721E-4C44-9048-E82F0A03E9B3', crypto.randomUUID())
      tB = swapUUID(tB,     '4A0DC7FA-5605-4E4F-8E26-BC99B349F257', crypto.randomUUID())
      tB = swapUUID(tB,     'A9872345-C7C7-4BA5-BF01-D184172E702A', crypto.randomUUID())
      tB = swapUUID(tB,     '1BCA9128-39EE-4F21-A3F0-43811152EFF2', crypto.randomUUID())

  // Build the full presentation_obj: [TMPL_A] [varint(rtf_len)] [rtf_bytes] [TMPL_B]
  const presObj = concat(tA, pbVarint(rtfBytes.length), rtfBytes, tB)

  // Build the slide wrapper:
  // [1]=uuid, [5]=enabled, [8]=notes (empty), [10]=presObj, [12]=flag
  return concat(
    pbLenDelim(1, uuidToProto(slideUuid)),
    pbVarintField(5, 1),
    pbString(8, ''),
    pbLenDelim(10, presObj),
    pbVarintField(12, 1)
  )
}

function buildGroup(groupUuid, name, colorBytes, slideUuids) {
  // Inner group info message (field [1] of the [12] group message):
  // [1]=uuid, [2]=name, [3]=color, [4]=empty string
  const groupInfo = concat(
    pbLenDelim(1, uuidToProto(groupUuid)),
    pbString(2, name),
    pbLenDelim(3, colorBytes),
    pbString(4, '')
  )
  // The group [12] message: [1]=groupInfo, then [2]=slideUuid for each slide
  let groupMsg = pbLenDelim(1, groupInfo)
  for (const sid of slideUuids) {
    groupMsg = concat(groupMsg, pbLenDelim(2, uuidToProto(sid)))
  }
  return groupMsg
}

export function generateProPresenterFile(title, key, lyrics) {
  if (!lyrics) return null

  const newUuid = () => crypto.randomUUID()

  // Parse lyrics into sections → stanzas
  const sections = []
  let currentSection = { name: 'Song', stanzas: [] }
  let currentStanza = []

  const flushStanza = () => {
    const raw = currentStanza.join('\n').trim()
    if (raw) currentSection.stanzas.push({ raw, clean: stripChords(raw) })
    currentStanza = []
  }
  const flushSection = () => {
    flushStanza()
    if (currentSection.stanzas.length > 0) sections.push(currentSection)
  }

  for (const line of lyrics.split('\n')) {
    const trimmed = line.trim()
    const isSectionLabel = /^\[[^\]]+\]$/.test(trimmed) && !isChordToken(trimmed.slice(1,-1).trim())
    if (isSectionLabel) {
      flushSection()
      currentSection = { name: trimmed.slice(1,-1), stanzas: [] }
    } else if (trimmed === '') {
      flushStanza()
    } else {
      currentStanza.push(line)
    }
  }
  flushSection()

  if (sections.length === 0) {
    sections.push({ name: 'Song', stanzas: [{ raw: lyrics, clean: stripChords(lyrics) }] })
  }

  const docUuid = newUuid()

  // ── Fixed header fields from real PP7 file ──
  // [1] app version info (fixed)
  const f1 = hexToBytes('0a1b08011204081a10051801220f081510032209333532353138313738')
  // [2] document UUID
  const f2 = pbString(2, docUuid)
  // [3] title
  const f3 = pbString(3, `${title} (Key of ${key})`)
  // [8] background color (black, alpha 1)
  const f8 = hexToBytes('42070a05250000803f')
  // [9] flags
  const f9 = hexToBytes('4a021801')

  // ── Build all slides and groups ──
  const allSlides = []   // { uuid, bytes }
  const groupMsgs = []   // complete group [12] field bytes

  for (let si = 0; si < sections.length; si++) {
    const section = sections[si]
    const groupUuid = newUuid()
    const colorBytes = SECTION_COLORS[si % SECTION_COLORS.length]
    const slideUuids = []

    for (const stanza of section.stanzas) {
      const slideUuid = newUuid()
      const rtfBytes = buildRTFBytes(stanza.clean.trim())
      const slideBytes = buildSlide(slideUuid, rtfBytes)
      allSlides.push({ uuid: slideUuid, bytes: slideBytes })
      slideUuids.push(slideUuid)
    }

    groupMsgs.push(pbLenDelim(12, buildGroup(groupUuid, section.name, colorBytes, slideUuids)))
  }

  // ── Assemble the document ──
  // Header fields
  let doc = concat(f1, f2, f3, f8, f9)

  // [11] arrangement (empty — no named arrangements needed)
  const arrangementSlideUuids = allSlides.map(s => s.uuid)
  let arrangementMsg = concat(
    pbLenDelim(1, uuidToProto(newUuid())),
    pbString(2, 'Live Version')
  )
  for (const sid of arrangementSlideUuids) {
    arrangementMsg = concat(arrangementMsg, pbLenDelim(3, uuidToProto(sid)))
  }
  doc = concat(doc, pbLenDelim(11, arrangementMsg))

  // [12] groups
  for (const gMsg of groupMsgs) doc = concat(doc, gMsg)

  // [13] slides
  for (const slide of allSlides) {
    doc = concat(doc, pbLenDelim(13, slide.bytes))
  }

  return doc  // Uint8Array — caller must use Blob with application/octet-stream
}
