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
            text: 'You are processing a worship song chord chart PDF. Extract clean song data. IMPORTANT: ignore all chord symbols (like G, Am, C/E, D/F#). Extract ONLY sung lyrics. Keep section labels like [Verse 1], [Chorus], [Bridge]. Song title is at the top - do NOT use the filename. Key is usually near the top. Respond ONLY with valid JSON, no markdown: {"title":"song title","artist":"artist name","key":"musical key e.g. Bb","tempo":"Fast, Medium, or Slow","lyrics":"full lyrics with [Section] labels, no chords"}'
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
  const sectionRegex = /(\[[^\]]+\])/g
  const parts = lyrics.split(sectionRegex).filter(s => s.trim())
  const slides = []
  let currentHeading = ''
  for (const part of parts) {
    if (part.match(/^\[[^\]]+\]$/)) {
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
  return '<?xml version="1.0" encoding="UTF-8"?>\n<!--\n  WorshipFlow ProPresenter Import\n  Song: ' + title + '\n  Key: ' + key + '\n-->\n<RVPresentationDocument>\n  <RVSlideGrouping name="' + title + ' (Key of ' + key + ')">\n' + slideXml + '\n  </RVSlideGrouping>\n</RVPresentationDocument>'
}
```