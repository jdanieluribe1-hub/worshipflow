import React, { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { getSongs, getSets } from './lib/supabase'
import Library from './pages/Library'
import ThisWeek from './pages/ThisWeek'
import History from './pages/History'
import Upload from './pages/Upload'
import BandView from './pages/BandView'
import Settings from './pages/Settings'
import Recommendations from './pages/Recommendations'
import RecommendView from './pages/RecommendView'
import './App.css'

function Sidebar({ page, setPage, weekCount }) {
  const nav = [
    { id: 'library', icon: '♪', label: 'Song Library' },
    { id: 'thisweek', icon: '📅', label: 'This Week', badge: weekCount },
    { id: 'history', icon: '📊', label: 'Play History' },
  ]
  const tools = [
    { id: 'upload', icon: '⬆', label: 'Upload Chart' },
    { id: 'bandview', icon: '🎸', label: 'Band View' },
    { id: 'recommendations', icon: '💡', label: 'Recommendations' },
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
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('wf_theme') || 'dark'
    if (saved === 'light') document.documentElement.classList.add('light-mode')
    return saved
  })

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light-mode')
    } else {
      document.documentElement.classList.remove('light-mode')
    }
    localStorage.setItem('wf_theme', theme)
  }, [theme])
  const titles = {
    library: 'Song Library', thisweek: 'This Week',
    history: 'Play History', upload: 'Upload Chord Chart',
    bandview: 'Band View', settings: 'Settings',
    recommendations: 'Song Recommendations'
  }

  useEffect(() => {
    Promise.all([getSongs(), getSets()]).then(([s, sets]) => {
      setSongs(s || [])
      setSets(sets || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const refreshSongs = () => getSongs().then(s => setSongs(s || []))
  const refreshSets = () => getSets().then(s => setSets(s || []))

  const weekSongs = weekSongIds.map(id => songs.find(s => s.id === id)).filter(Boolean)

  const pageProps = {
    songs, sets, weekSongIds, weekSongs,
    setWeekSongIds, refreshSongs, refreshSets,
    theme, setTheme,
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
          {page === 'history' && <History {...pageProps} setPage={setPage} />}
          {page === 'upload' && <Upload {...pageProps} />}
          {page === 'bandview' && <BandView {...pageProps} />}
          {page === 'recommendations' && <Recommendations />}
          {page === 'settings' && <Settings {...pageProps} />}
        </div>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/band" element={<BandViewPublic />} />
        <Route path="/recommend" element={<RecommendView />} />
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
