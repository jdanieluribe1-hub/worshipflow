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

export function generateProPresenterTemplate(title, key, lyrics) {
  if (!lyrics) return '<!-- No lyrics extracted -->'
  const parts = lyrics.split(/(\[[^\]]+\])/).filter(s => s.trim())
  const slides = []
  let currentHeading = ''
  for (const part of parts) {
    if (/^\[[^\]]+\]$/.test(part)) {
      currentHeading = part.trim()
    } else {
      const lines = part.trim()
      if (lines) slides.push({ heading: currentHeading, text: lines })
    }
  }
  if (slides.length === 0) {
    lyrics.split('\n\n').filter(s => s.trim()).forEach((s, i) => {
      slides.push({ heading: 'Section ' + (i + 1), text: s.trim() })
    })
  }
  const slideXml = slides.map((s, i) => '    <RVDisplaySlide uuid="slide-' + (i+1) + '">\n      <!-- ' + s.heading + ' -->\n      <RVTextElement>\n        <NSString>' + s.text + '</NSString>\n      </RVTextElement>\n    </RVDisplaySlide>').join('\n')
  return '<?xml version="1.0" encoding="UTF-8"?>\n<RVPresentationDocument>\n  <RVSlideGrouping name="' + title + ' (Key of ' + key + ')">\n' + slideXml + '\n  </RVSlideGrouping>\n</RVPresentationDocument>'
}
