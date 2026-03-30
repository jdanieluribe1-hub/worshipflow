export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  res.setHeader('Access-Control-Allow-Origin', '*')
  try {
    const { url } = req.body

    const pageRes = await fetch(url, {
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,es;q=0.8,pt;q=0.7',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      }
    })

    const html = await pageRes.text()

    if (html.length < 500) {
      return res.status(200).json({ error: 'Page returned empty content — this site may require JavaScript rendering.' })
    }

    // Extract page title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    const pageTitle = titleMatch ? titleMatch[1].replace(/\s*[-–|].*$/, '').trim() : ''

    // Extract <pre> blocks — where chord charts live on cifraclub, e-chords, etc.
    // Convert <b>Chord</b> → [Chord] to preserve chord markers with their spacing
    const preMatches = html.match(/<pre[^>]*>[\s\S]*?<\/pre>/gi) || []
    const preContent = preMatches
      .map(p =>
        p.replace(/<b[^>]*>([^<]+)<\/b>/g, '[$1]')
         .replace(/<[^>]+>/g, '')
         .replace(/&nbsp;/g, ' ')
         .replace(/&amp;/g, '&')
         .replace(/&lt;/g, '<')
         .replace(/&gt;/g, '>')
         .trim()
      )
      .filter(p => p.length > 80)
      .join('\n\n')

    let textForAI
    if (preContent.length > 200) {
      // Chord chart found in <pre> tags — use it directly
      textForAI = `Title from page: ${pageTitle}\n\nChord chart:\n${preContent.slice(0, 14000)}`
    } else {
      // Fallback: strip scripts/styles but keep <b> chord markers before stripping tags
      const fullText = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<b[^>]*>([^<]+)<\/b>/g, '[$1]')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/\s+/g, ' ')
        .trim()

      if (fullText.length < 300) {
        return res.status(200).json({ error: 'Page content appears empty — this site may require JavaScript rendering.' })
      }
      textForAI = fullText.slice(0, 14000)
    }

    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 3000,
        messages: [{
          role: 'user',
          content: `You are extracting a worship song chord chart from web page content.

The content may use "chords above lyrics" format (traditional tab style) where a chord name appears on the line above the syllable it falls on, aligned by spaces. Convert this to INLINE [Chord] notation placed immediately before the syllable.

Example — chords above lyrics input:
[Bb]                    [D]
Abre los cielos, sobre nosotros,
      [Gm]              [Eb]
Abre los cielos Señor haz llover

Expected inline output:
[Chorus]
[Bb]Abre los cielos, [D]sobre nosotros,
[Gm]Abre los cielos [Eb]Señor haz llover

Rules:
- Section labels like Intro, Coro/Chorus, Verso/Verse, Puente/Bridge → use English: [Intro], [Chorus], [Verse 1], [Bridge]
- Place every chord inline before the word/syllable it falls on — do not drop any chords
- The key is the most prominent chord (usually first chord of intro or verse)
- If the key has a flat (b) write it as e.g. "Bb" not "B♭"
- Respond ONLY with valid JSON, no markdown:
{"title":"song title","artist":"artist name","key":"e.g. Bb","tempo":"Fast, Medium, or Slow","lyrics":"full chord chart with inline [Chord] markers and [Section] labels"}

Page content:
${textForAI}`
        }]
      })
    })

    const data = await aiRes.json()
    const text = data.content?.find(b => b.type === 'text')?.text || '{}'
    try {
      const parsed = JSON.parse(text.replace(/```json|```/g, '').trim())
      if (!parsed.title && !parsed.lyrics) {
        return res.status(200).json({ error: 'AI could not find song data on this page.' })
      }
      return res.status(200).json(parsed)
    } catch {
      return res.status(200).json({ error: 'Failed to parse AI response.' })
    }
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
