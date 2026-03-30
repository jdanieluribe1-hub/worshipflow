import React, { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { getSongs, getSets } from './lib/supabase'
import { exchangeCodeForToken } from './lib/spotify'
import Library from './pages/Library'
import ThisWeek from './pages/ThisWeek'
import History from './pages/History'
import Upload from './pages/Upload'
import BandView from './pages/BandView'
import Settings from './pages/Settings'
import './App.css'

function SpotifyCallback({ onDone }) {
  const navigate = useNavigate()
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('code')
    if (code) {
      exchangeCodeForToken(code).then(() => { onDone(); navigate('/settings') })
    }
  }, [])
  return <div style={{ padding: 40, color: '#fff' }}>Connecting Spotify...</div>
}

function Sidebar({ page, setPage, weekCount }) {
  const nav = [
    { id: 'library', icon: '♪', label: 'Song Library' },
    { id: 'thisweek', icon: '📅', label: 'This Week', badge: weekCount },
    { id: 'history', icon: '📊', label: 'Play History' },
  ]
  const tools = [
    { id: 'upload', icon: '⬆', label: 'Upload Chart' },
    { id: 'bandview', icon: '🎸', label: 'Band View' },
  ]
  return (
    <aside className="sidebar">
      <div className="logo">
        <div className="logo-title">WorshipFlow</div>
        <div className="logo-sub">Director Dashboard</div>
      </div>
      <nav className="nav">
        <div className="nav-section">Main</div>
        {nav.map(n => (
          <button key={n.id} className={`nav-item ${page === n.id ? 'active' : ''}`} onClick={() => setPage(n.id)}>
            <span className="nav-icon">{n.icon}</span>
            {n.label}
            {n.badge > 0 && <span className="badge">{n.badge}</span>}
          </button>
        ))}
        <div className="nav-section">Tools</div>
        {tools.map(n => (
          <button key={n.id} className={`nav-item ${page === n.id ? 'active' : ''}`} onClick={() => setPage(n.id)}>
            <span className="nav-icon">{n.icon}</span>
            {n.label}
          </button>
        ))}
        <div className="nav-section">Settings</div>
        <button className={`nav-item ${page === 'settings' ? 'active' : ''}`} onClick={() => setPage('settings')}>
          <span className="nav-icon">⚙</span> Settings
        </button>
      </nav>
    </aside>
  )
}

function AppShell() {
  const [page, setPage] = useState('library')
  const [songs, setSongs] = useState([])
  const [sets, setSets] = useState([])
  const [weekSongIds, setWeekSongIds] = useState([])
  const [loading, setLoading] = useState(true)
  const [spotifyConnected, setSpotifyConnected] = useState(false)

  const titles = {
    library: 'Song Library', thisweek: 'This Week',
    history: 'Play History', upload: 'Upload Chord Chart',
    bandview: 'Band View', settings: 'Settings'
  }

  useEffect(() => {
    Promise.all([getSongs(), getSets()]).then(([s, sets]) => {
      setSongs(s || [])
      setSets(sets || [])
      setLoading(false)
    }).catch(() => setLoading(false))
    setSpotifyConnected(!!localStorage.getItem('spotify_access_token'))
  }, [])

  const refreshSongs = () => getSongs().then(s => setSongs(s || []))
  const refreshSets = () => getSets().then(s => setSets(s || []))

  const weekSongs = songs.filter(s => weekSongIds.includes(s.id))

  const pageProps = {
    songs, sets, weekSongIds, weekSongs,
    setWeekSongIds, refreshSongs, refreshSets,
    spotifyConnected, setSpotifyConnected
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0d0f14', color: '#7c85a0', fontFamily: 'sans-serif' }}>
      Loading WorshipFlow...
    </div>
  )

  return (
    <div className="app">
      <Sidebar page={page} setPage={setPage} weekCount={weekSongIds.length} />
      <div className="main">
        <div className="topbar">
          <div className="topbar-title">{titles[page]}</div>
          <div className="topbar-actions" id="topbar-actions"></div>
        </div>
        <div className="content">
          {page === 'library' && <Library {...pageProps} />}
          {page === 'thisweek' && <ThisWeek {...pageProps} setPage={setPage} />}
          {page === 'history' && <History {...pageProps} />}
          {page === 'upload' && <Upload {...pageProps} />}
          {page === 'bandview' && <BandView {...pageProps} />}
          {page === 'settings' && <Settings {...pageProps} />}
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [spotifyConnected, setSpotifyConnected] = useState(false)
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/callback" element={<SpotifyCallback onDone={() => setSpotifyConnected(true)} />} />
        <Route path="/band" element={<BandViewPublic />} />
        <Route path="*" element={<AppShell />} />
      </Routes>
    </BrowserRouter>
  )
}

function BandViewPublic() {
  return (
    <div style={{ background: '#0a0b0f', minHeight: '100vh' }}>
      <BandView public={true} />
    </div>
  )
}
