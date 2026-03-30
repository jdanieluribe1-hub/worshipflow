export async function parsePDFWithAI(base64PDF) {
  const response = await fetch('/api/parse-pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: base64PDF }
          },
          {
            type: 'text',
            text: 'You are reading a worship song chord chart PDF. Extract the following and respond ONLY with a JSON object, no markdown, no preamble: {"title": "song title", "artist": "artist or writer name", "key": "musical key like G, A, D, E, C, F, Bb, Eb etc", "tempo": "Fast, Medium, or Slow", "lyrics": "full lyrics text only, no chord symbols, formatted with line breaks"}. If you cannot determine a field, use an empty string.'
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
  const slides = lyrics
    ? lyrics.split('\n\n').map(s => s.trim()).filter(Boolean)
    : ['[Verse 1]\nPaste lyrics here...', '[Chorus]\nPaste lyrics here...']
  return '<?xml version="1.0" encoding="UTF-8"?>\n<RVPresentationDocument>\n  <RVSlideGrouping name="' + title + ' (Key of ' + key + ')">\n' + slides.map((s, i) => '    <RVDisplaySlide uuid="slide-' + (i+1) + '">\n      <RVTextElement>\n        <NSString>' + s + '</NSString>\n      </RVTextElement>\n    </RVDisplaySlide>').join('\n') + '\n  </RVSlideGrouping>\n</RVPresentationDocument>'
}
