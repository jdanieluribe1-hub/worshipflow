export async function parsePDFWithAI(base64PDF) {
  const response = await fetch('/api/parse-pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
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
            text: `You are processing a worship song chord chart PDF. Your job is to extract clean song data.

IMPORTANT INSTRUCTIONS:
- The PDF may have chord symbols (like G, Am, C/E, D/F#) mixed in with lyrics. IGNORE all chord symbols completely.
- Extract ONLY the actual sung lyrics — the words people sing.
- Keep section headings like [Verse 1], [Chorus], [Bridge], [Pre-Chorus], [Outro] etc.
- The song title is usually at the top of the page. Do NOT include the filename.
- The key is usually listed near the top (e.g. "Key of Bb" or just "Bb").
- Tempo clues: words like "slowly", "ballad", "moderately" = Slow or Medium. "Upbeat", "driving", "fast" = Fast.

Respond ONLY with a valid JSON object, no markdown fences, no extra text:
{
  "title": "actual song title only, not the filename",
  "artist": "artist or writer name if visible",
  "key": "musical key e.g. Bb, G, A, D, E, C, F",
  "tempo": "Fast, Medium, or Slow",
  "lyrics": "full lyrics with section headings like [Verse 1], [Chorus] etc. Strip all chord symbols. Keep only sung words and section labels."
}

If you cannot determine a field with confidence, use an empty string.`
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
  if (!lyrics) {
    return `<!-- No lyrics extracted. Upload a text-based PDF for best results. -->`
  }

  // Split into sections by headings like [Verse 1], [Chorus] etc
  const sectionRegex = /(\[.*?\])/g
  const parts = lyrics.split(sectionRegex).filter(s => s.trim())

  const slides = []
  let currentHeading = ''
  for (const part of parts) {
    if (part.match(/^\[.*\]$/)) {
      currentHeading = part.trim()
    } else {
      const lines = part.trim()
      if (lines) slides.push({ heading: currentHeading, text: lines })
    }
  }

  if (slides.length === 0) {
    // No section headings found, split by double newlines
    lyrics.split('\n\n').filter(s => s.trim()).forEach((s, i) => {
      slides.push({ heading: `Section ${i + 1}`, text: s.trim() })
    })
  }

  const slideXml = slides.map((s, i) => `    <RVDisplaySlide uuid="slide-${i + 1}">
      <!-- ${s.heading} -->
      <RVTextElement>
        <NSString>${s.text}</NSString>
      </RVTextElement>
    </RVDisplaySlide>`).join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<!--
  WorshipFlow ProPresenter Import Template
  Song:  ${title}
  Key:   ${key}

  HOW TO IMPORT:
  1. Copy this entire block
  2. In ProPresenter go to File > Import > Text
  3. Paste and confirm
-->
<RVPresentationDocument>
  <RVSlideGrouping name="${title} (Key of ${key})">
${slideXml}
  </RVSlideGrouping>
</RVPresentationDocument>`
}
