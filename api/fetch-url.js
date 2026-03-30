export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  res.setHeader('Access-Control-Allow-Origin', '*')

  const { url } = req.body
  console.log('[fetch-url] target url:', url)

  try {
    // Abort page fetch after 15 s so there is still time left for the AI call
    const controller = new AbortController()
    const fetchTimeout = setTimeout(() => controller.abort(), 15000)

    let pageRes
    try {
      pageRes = await fetch(url, {
        signal: controller.signal,
        redirect: 'follow',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9,es;q=0.8,pt;q=0.7',
          'Referer': new URL(url).origin + '/',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
      })
    } catch (fetchErr) {
      const reason = fetchErr.name === 'AbortError' ? 'Page fetch timed out after 15 s' : fetchErr.message
      console.error('[fetch-url] page fetch failed:', reason)
      return res.status(200).json({ error: 'Could not reach the page: ' + reason })
    } finally {
      clearTimeout(fetchTimeout)
    }

    console.log('[fetch-url] page status:', pageRes.status, 'url:', pageRes.url)

    if (!pageRes.ok) {
      return res.status(200).json({
        error: `Site returned HTTP ${pageRes.status}. It may be blocking server requests.`,
        _debug: { httpStatus: pageRes.status, finalUrl: pageRes.url },
      })
    }

    const html = await pageRes.text()
    console.log('[fetch-url] html length:', html.length)

    if (html.length < 500) {
      return res.status(200).json({
        error: 'Page returned almost no content — this site may require JavaScript to render.',
        _debug: { htmlLength: html.length, preview: html.slice(0, 200) },
      })
    }

    // Detect anti-bot / Cloudflare challenge pages
    const lowerHtml = html.toLowerCase()
    if (
      (lowerHtml.includes('cf-browser-verification') || lowerHtml.includes('just a moment')) &&
      html.length < 20000
    ) {
      console.error('[fetch-url] cloudflare challenge detected')
      return res.status(200).json({ error: 'Site is protected by Cloudflare bot detection. Try a different URL or paste the lyrics manually.' })
    }

    // Extract page title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    const pageTitle = titleMatch ? titleMatch[1].replace(/\s*[-–|].*$/, '').trim() : ''

    // Extract <pre> blocks — where chord charts live on cifraclub, e-chords, etc.
    // Convert <b>Chord</b> → [Chord] to preserve chord markers with their spacing
    const preMatches = html.match(/<pre[^>]*>[\s\S]*?<\/pre>/gi) || []
    console.log('[fetch-url] pre tag count:', preMatches.length)

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
      console.log('[fetch-url] using pre content, length:', preContent.length)
      textForAI = `Title from page: ${pageTitle}\n\nChord chart:\n${preContent.slice(0, 14000)}`
    } else {
      // Fallback: strip scripts/styles but convert <b>chord</b> before tag-stripping
      const fullText = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<b[^>]*>([^<]+)<\/b>/g, '[$1]')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/\s+/g, ' ')
        .trim()

      console.log('[fetch-url] no pre tags, falling back to full text, length:', fullText.length)

      if (fullText.length < 300) {
        return res.status(200).json({
          error: 'Page content appears empty — this site may require JavaScript rendering.',
          _debug: { htmlLength: html.length, preTagCount: preMatches.length, textLength: fullText.length },
        })
      }
      textForAI = fullText.slice(0, 14000)
    }

    const MODEL = 'claude-sonnet-4-6'
    console.log('[fetch-url] calling anthropic api, model:', MODEL, 'key prefix:', process.env.ANTHROPIC_API_KEY?.slice(0, 10))
    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
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
${textForAI}`,
        }],
      }),
    })

    if (!aiRes.ok) {
      const errText = await aiRes.text()
      console.error('[fetch-url] anthropic api error:', aiRes.status, errText)
      return res.status(200).json({
        error: `AI API error (${aiRes.status}) — see _debug for full response.`,
        _debug: { anthropicStatus: aiRes.status, anthropicError: errText },
      })
    }

    const data = await aiRes.json()
    const text = data.content?.find(b => b.type === 'text')?.text || '{}'
    console.log('[fetch-url] ai response preview:', text.slice(0, 100))

    try {
      const parsed = JSON.parse(text.replace(/```json|```/g, '').trim())
      if (!parsed.title && !parsed.lyrics) {
        return res.status(200).json({ error: 'AI could not find song data on this page.' })
      }
      return res.status(200).json(parsed)
    } catch {
      console.error('[fetch-url] json parse failed, raw text:', text.slice(0, 300))
      return res.status(200).json({ error: 'AI returned an unexpected response format.' })
    }
  } catch (error) {
    console.error('[fetch-url] unhandled error:', error.message)
    return res.status(500).json({ error: error.message })
  }
}
