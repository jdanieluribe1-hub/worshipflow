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

export function generateProPresenterFile(title, key, lyrics) {
  if (!lyrics) return null

  const esc = (s) => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
  const newUuid = () => crypto.randomUUID()

  // Parse lyrics into sections → stanzas, preserving raw (with chords) for stage notes
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

  const groupsXml = sections.map((section, si) => {
    const groupUuid = newUuid()
    const slidesXml = section.stanzas.map((stanza, idx) => {
      const slideUuid = newUuid()
      const elemUuid = newUuid()
      const cleanText = esc(stanza.clean.trim())
      const notes = esc(stanza.raw.trim())
      return `        <RVDisplaySlide backgroundColor="0 0 0 0" enabled="1" highlightColor="" hotKey="" label="${esc(section.name)}" notes="${notes}" slideType="1" sort_index="${idx}" UUID="${slideUuid}" drawingBackgroundColor="0" serialization-array-index="${idx}">
          <cues containerClass="NSMutableArray"/>
          <displayElements containerClass="NSMutableArray">
            <RVTextElement displayName="Lyrics" UUID="${elemUuid}" typeID="0" fromTemplate="0" locked="0" opacity="1" persistent="0" source="" rotation="0" adjustsHeightToFit="0" scaleFactor="1" drawingFill="0" drawingShadow="1" drawingStroke="0" fillColor="1 1 1 0" bezelRadius="0" displayDelay="0" serialization-array-index="0">
              <_-RVRect3D-_position x="0" y="0" z="0" width="1920" height="1080"/>
              <RVTextData verticalAlignment="1">
                <_-NSFont-_font fontFamily="Arial" pointSize="80" antialias="YES"/>
                <string>
                  <NSAttributedString baseWritingDirection="-1">
                    <fragment content="${cleanText}">
                      <attributes>
                        <NSColor RGBA="1 1 1 1"/>
                        <NSFont fontFamily="Arial" pointSize="80"/>
                        <NSParagraphStyle baseWritingDirection="0" alignment="2"/>
                      </attributes>
                    </fragment>
                  </NSAttributedString>
                </string>
              </RVTextData>
            </RVTextElement>
          </displayElements>
        </RVDisplaySlide>`
    }).join('\n')
    return `    <RVSlideGrouping name="${esc(section.name)}" uuid="${groupUuid}" color="0 0 0 1" serialization-array-index="${si}">
      <slides containerClass="NSMutableArray">
${slidesXml}
      </slides>
    </RVSlideGrouping>`
  }).join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<RVPresentationDocument height="1080" width="1920" versionNumber="600" uuid="${docUuid}" name="${esc(title)} (Key of ${esc(key)})" category="Song" artist="" author="" CCLIDisplay="0" backgroundColor="0 0 0 1" drawingBackgroundColor="0" notes="">
  <groups containerClass="NSMutableArray">
${groupsXml}
  </groups>
  <arrangements containerClass="NSMutableArray"/>
</RVPresentationDocument>`
}
