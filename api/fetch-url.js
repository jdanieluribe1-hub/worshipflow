export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  res.setHeader('Access-Control-Allow-Origin', '*')
  try {
    const { url } = req.body
    const pageRes = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
    const html = await pageRes.text()
    const clean = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                      .replace(/<[^>]+>/g, ' ')
                      .replace(/\s+/g, ' ')
                      .slice(0, 8000)
    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: 'You are reading a worship song chord chart from a webpage. Extract the song data and respond ONLY with valid JSON, no markdown: {"title":"song title","artist":"artist name","key":"musical key e.g. Bb, G, A","tempo":"Fast, Medium, or Slow","lyrics":"full lyrics with chord symbols placed inline using [Chord] notation before the word they fall on, and section labels like [Verse 1], [Chorus], [Bridge]"}. Here is the page text: ' + clean
        }]
      })
    })
    const data = await aiRes.json()
    const text = data.content?.find(b => b.type === 'text')?.text || '{}'
    try {
      const parsed = JSON.parse(text.replace(/```json|```/g, '').trim())
      return res.status(200).json(parsed)
    } catch {
      return res.status(200).json({ title: '', artist: '', key: '', tempo: 'Medium', lyrics: '' })
    }
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
