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
    // Save the granted scopes so we can detect missing-scope 403s later
    if (data.scope) localStorage.setItem('spotify_scope', data.scope)
  }
  return data
}

export async function refreshAccessToken() {
  const CLIENT_SECRET = process.env.REACT_APP_SPOTIFY_CLIENT_SECRET
  const refreshToken = localStorage.getItem('spotify_refresh_token')
  if (!refreshToken) {
    console.error('[spotify] refreshAccessToken: no refresh token stored')
    return null
  }
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
    if (data.scope) localStorage.setItem('spotify_scope', data.scope)
    console.log('[spotify] Token refreshed successfully')
    return data.access_token
  }
  console.error('[spotify] Token refresh failed:', JSON.stringify(data))
  return null
}

async function getValidToken() {
  const expiry = parseInt(localStorage.getItem('spotify_token_expiry') || '0')
  const token = localStorage.getItem('spotify_access_token')

  if (!token) {
    console.error('[spotify] getValidToken: no access token in storage')
    return null
  }

  if (Date.now() > expiry - 60000) {
    console.log('[spotify] Token expired or expiring in <60s — refreshing')
    const newToken = await refreshAccessToken()
    if (!newToken) {
      console.error('[spotify] Token refresh failed; user likely needs to reconnect')
    }
    return newToken
  }

  return token
}

export function isSpotifyConnected() {
  return !!localStorage.getItem('spotify_access_token')
}

export function disconnectSpotify() {
  localStorage.removeItem('spotify_access_token')
  localStorage.removeItem('spotify_refresh_token')
  localStorage.removeItem('spotify_token_expiry')
  localStorage.removeItem('spotify_playlist_id')
  localStorage.removeItem('spotify_scope')
}

// Central fetch wrapper — always logs the full Spotify error body on failure
async function spotifyFetch(url, options = {}) {
  const token = await getValidToken()
  if (!token) {
    throw new Error(
      'No valid Spotify token. Please disconnect and reconnect your Spotify account in Settings.'
    )
  }

  const method = options.method || 'GET'
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })

  if (!res.ok) {
    // Always read the body so the real Spotify error message is visible
    let errBody = ''
    try {
      errBody = JSON.stringify(await res.json())
    } catch {
      errBody = await res.text().catch(() => '(unreadable)')
    }
    console.error(`[spotify] ${method} ${url} → ${res.status}:`, errBody)

    if (res.status === 401) {
      throw new Error(
        `Spotify token is invalid or expired (401). Please disconnect and reconnect in Settings.\nDetail: ${errBody}`
      )
    }

    if (res.status === 403) {
      const grantedScopes = localStorage.getItem('spotify_scope') || '(not recorded — reconnect to capture)'
      const requiredScopes = SCOPES.split(' ')
      const missing = requiredScopes.filter(s => !grantedScopes.includes(s))
      const scopeHint = missing.length
        ? `Missing scopes: ${missing.join(', ')}. Disconnect and reconnect to re-authorize.`
        : `Scopes look correct (${grantedScopes}). This 403 may mean your Spotify app is in Development Mode — add your Spotify account as an allowed user in the Spotify Developer Dashboard.`
      throw new Error(`Spotify 403 Forbidden on ${method} ${url}.\n${scopeHint}\nFull error: ${errBody}`)
    }

    if (res.status === 404) {
      throw new Error(`Spotify 404 Not Found on ${method} ${url}. ${errBody}`)
    }

    throw new Error(`Spotify ${res.status} on ${method} ${url}: ${errBody}`)
  }

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
  // Check scopes before making any calls
  const grantedScopes = localStorage.getItem('spotify_scope') || ''
  if (grantedScopes) {
    const missing = SCOPES.split(' ').filter(s => !grantedScopes.includes(s))
    if (missing.length > 0) {
      throw new Error(
        `Your Spotify authorization is missing required scopes: ${missing.join(', ')}.\nPlease disconnect and reconnect your Spotify account in Settings to re-authorize.`
      )
    }
  }

  console.log('[spotify] syncWeeklyPlaylist start — fetching user profile')
  const user = await getSpotifyUser()
  const userId = user.id
  console.log('[spotify] Spotify user:', userId)

  let playlistId = localStorage.getItem('spotify_playlist_id')

  if (playlistId) {
    console.log('[spotify] Using stored playlist id:', playlistId)
    // Verify it still exists and belongs to this user — 404/403 means stale id
    try {
      await spotifyFetch(`https://api.spotify.com/v1/playlists/${playlistId}`)
    } catch (e) {
      console.warn('[spotify] Stored playlist unreachable, will create a new one:', e.message)
      playlistId = null
      localStorage.removeItem('spotify_playlist_id')
    }
  }

  if (!playlistId) {
    console.log('[spotify] Creating new playlist via /v1/me/playlists')
    const playlist = await spotifyFetch(
      'https://api.spotify.com/v1/me/playlists',
      {
        method: 'POST',
        body: JSON.stringify({
          name: 'WorshipFlow — This Week',
          description: 'Auto-synced by WorshipFlow',
          public: false,
        }),
      }
    )
    playlistId = playlist.id
    localStorage.setItem('spotify_playlist_id', playlistId)
    console.log('[spotify] Created playlist:', playlistId)
  }

  console.log('[spotify] Searching Spotify for', songs.length, 'songs')
  const trackUris = []
  for (const song of songs) {
    const track = await searchTrack(song.title, song.artist || '')
    if (track) {
      console.log(`[spotify] Found "${song.title}" → ${track.uri}`)
      trackUris.push(track.uri)
    } else {
      console.warn(`[spotify] Not found on Spotify: "${song.title}" by "${song.artist || '—'}"`)
    }
  }

  if (trackUris.length === 0) {
    throw new Error(
      'None of the songs in this set were found on Spotify. Check that titles and artists are spelled correctly.'
    )
  }

  console.log(
    `[spotify] ${trackUris.length} of ${songs.length} songs found. URIs:`,
    trackUris
  )

  // Clear existing tracks first so repeated syncs don't accumulate duplicates.
  // PUT with an empty array replaces the snapshot; if this 403s too, the issue
  // is a Development Mode permission restriction, not specific to PUT vs POST.
  console.log('[spotify] Clearing existing playlist tracks')
  await spotifyFetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
    method: 'PUT',
    body: JSON.stringify({ uris: [] }),
  })

  // POST appends tracks (avoids the broader PUT-replace 403 on some app configs)
  console.log('[spotify] Adding', trackUris.length, 'track(s) via POST')
  await spotifyFetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
    method: 'POST',
    body: JSON.stringify({ uris: trackUris }),
  })

  console.log('[spotify] Updating playlist name for', serviceDate)
  await spotifyFetch(`https://api.spotify.com/v1/playlists/${playlistId}`, {
    method: 'PUT',
    body: JSON.stringify({
      name: `WorshipFlow — ${serviceDate}`,
      description: `Worship set for ${serviceDate} — synced by WorshipFlow`,
    }),
  })

  const playlistUrl = `https://open.spotify.com/playlist/${playlistId}`
  console.log('[spotify] Sync complete:', playlistUrl)
  return playlistUrl
}
