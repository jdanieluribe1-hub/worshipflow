const CLIENT_ID = process.env.REACT_APP_SPOTIFY_CLIENT_ID
const REDIRECT_URI = process.env.REACT_APP_SPOTIFY_REDIRECT_URI
const SCOPES = 'playlist-modify-public playlist-modify-private playlist-read-private'

export function getSpotifyAuthUrl() {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
  })
  return `https://accounts.spotify.com/authorize?${params}`
}

export async function exchangeCodeForToken(code) {
  const CLIENT_SECRET = process.env.REACT_APP_SPOTIFY_CLIENT_SECRET
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: REDIRECT_URI,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
  })
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  const data = await res.json()
  if (data.access_token) {
    localStorage.setItem('spotify_access_token', data.access_token)
    localStorage.setItem('spotify_refresh_token', data.refresh_token)
    localStorage.setItem('spotify_token_expiry', Date.now() + data.expires_in * 1000)
  }
  return data
}

export async function refreshAccessToken() {
  const CLIENT_SECRET = process.env.REACT_APP_SPOTIFY_CLIENT_SECRET
  const refreshToken = localStorage.getItem('spotify_refresh_token')
  if (!refreshToken) return null
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
  })
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  const data = await res.json()
  if (data.access_token) {
    localStorage.setItem('spotify_access_token', data.access_token)
    localStorage.setItem('spotify_token_expiry', Date.now() + data.expires_in * 1000)
  }
  return data.access_token
}

async function getValidToken() {
  const expiry = parseInt(localStorage.getItem('spotify_token_expiry') || '0')
  if (Date.now() > expiry - 60000) return await refreshAccessToken()
  return localStorage.getItem('spotify_access_token')
}

export function isSpotifyConnected() {
  return !!localStorage.getItem('spotify_access_token')
}

export function disconnectSpotify() {
  localStorage.removeItem('spotify_access_token')
  localStorage.removeItem('spotify_refresh_token')
  localStorage.removeItem('spotify_token_expiry')
  localStorage.removeItem('spotify_playlist_id')
}

async function spotifyFetch(url, options = {}) {
  const token = await getValidToken()
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })
  if (!res.ok) throw new Error(`Spotify API error: ${res.status}`)
  if (res.status === 204) return null
  return res.json()
}

export async function getSpotifyUser() {
  return spotifyFetch('https://api.spotify.com/v1/me')
}

export async function searchTrack(title, artist) {
  const q = encodeURIComponent(`track:${title} artist:${artist}`)
  const data = await spotifyFetch(`https://api.spotify.com/v1/search?q=${q}&type=track&limit=1`)
  return data?.tracks?.items?.[0] || null
}

export async function syncWeeklyPlaylist(songs, serviceDate) {
  const user = await getSpotifyUser()
  const userId = user.id

  let playlistId = localStorage.getItem('spotify_playlist_id')

  if (!playlistId) {
    const playlist = await spotifyFetch(`https://api.spotify.com/v1/users/${userId}/playlists`, {
      method: 'POST',
      body: JSON.stringify({
        name: 'WorshipFlow — This Week',
        description: 'Auto-synced by WorshipFlow',
        public: false,
      }),
    })
    playlistId = playlist.id
    localStorage.setItem('spotify_playlist_id', playlistId)
  }

  const trackUris = []
  for (const song of songs) {
    const track = await searchTrack(song.title, song.artist || '')
    if (track) trackUris.push(track.uri)
  }

  if (trackUris.length === 0) throw new Error('No tracks found on Spotify for this set.')

  await spotifyFetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
    method: 'PUT',
    body: JSON.stringify({ uris: trackUris }),
  })

  await spotifyFetch(`https://api.spotify.com/v1/playlists/${playlistId}`, {
    method: 'PUT',
    body: JSON.stringify({
      name: `WorshipFlow — ${serviceDate}`,
      description: `Worship set for ${serviceDate} — synced by WorshipFlow`,
    }),
  })

  return `https://open.spotify.com/playlist/${playlistId}`
}
