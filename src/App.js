import React, { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { getSongs, getSets } from './lib/supabase'
import { AuthProvider, useAuth } from './lib/AuthContext'
import Home from './pages/Home'
import Library from './pages/Library'
import ThisWeek from './pages/ThisWeek'
import History from './pages/History'
import Upload from './pages/Upload'
import BandView from './pages/BandView'
import Settings from './pages/Settings'
import Recommendations from './pages/Recommendations'
import RecommendView from './pages/RecommendView'
import Login from './pages/Login'
import Onboarding from './pages/Onboarding'
import JoinChurch from './pages/JoinChurch'
import './App.css'

const BOTTOM_NAV = [
  { id: 'home', icon: '🏠', label: 'Home' },
  { id: 'library', icon: '♪', label: 'Library' },
  { id: 'thisweek', icon: '📅', label: 'Sets' },
  { id: 'history', icon: '📊', label: 'History' },
]

function Sidebar({ page, setPage, weekCount, churches, activeChurch, setActiveChurch, mode, onToggle, mobileOpen, onMobileClose }) {
  const nav = [
    { id: 'home', icon: '🏠', label: 'Home' },
    { id: 'library', icon: '♪', label: 'Song Library' },
    { id: 'thisweek', icon: '📅', label: 'Set Builder', badge: weekCount },
    { id: 'history', icon: '📊', label: 'Play History' },
  ]
  const tools = [
    { id: 'upload', icon: '⬆', label: 'Upload Chart' },
    { id: 'bandview', icon: '🎸', label: 'Band View' },
    { id: 'recommendations', icon: '💡', label: 'Recommendations' },
  ]
  const iconsOnly = mode === 'icons'

  const handleNav = (id) => {
    setPage(id)
    onMobileClose()
  }

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && <div className="sidebar-overlay" onClick={onMobileClose} />}

      <aside className={`sidebar sidebar-${mode} ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="logo">
          {!iconsOnly && (
            <div>
              <div className="logo-title">WorshipFlow</div>
              <div className="logo-sub">Director Dashboard</div>
            </div>
          )}
          {iconsOnly && <div className="logo-title" style={{ fontSize: 14, textAlign: 'center' }}>WF</div>}
          <button className="sidebar-toggle-btn" onClick={onToggle} title="Toggle sidebar">
            {mode === 'full' ? '‹‹' : '››'}
          </button>
        </div>

        <nav className="nav">
          {!iconsOnly && <div className="nav-section">Main</div>}
          {nav.map(n => (
            <button key={n.id} className={`nav-item ${page === n.id ? 'active' : ''}`} onClick={() => handleNav(n.id)} title={n.label}>
              <span className="nav-icon">{n.icon}</span>
              {!iconsOnly && <span className="nav-label">{n.label}</span>}
              {!iconsOnly && n.badge > 0 && <span className="badge">{n.badge}</span>}
              {iconsOnly && n.badge > 0 && <span className="badge badge-dot" />}
            </button>
          ))}

          {!iconsOnly && <div className="nav-section">Tools</div>}
          {iconsOnly && <div className="nav-divider" />}
          {tools.map(n => (
            <button key={n.id} className={`nav-item ${page === n.id ? 'active' : ''}`} onClick={() => handleNav(n.id)} title={n.label}>
              <span className="nav-icon">{n.icon}</span>
              {!iconsOnly && <span className="nav-label">{n.label}</span>}
            </button>
          ))}

          {churches && churches.length > 1 && (
            <>
              {!iconsOnly && <div className="nav-section">Church</div>}
              {iconsOnly && <div className="nav-divider" />}
              {!iconsOnly && (
                <div style={{ padding: '0 8px 8px' }}>
                  <select
                    value={activeChurch?.id || ''}
                    onChange={e => {
                      const c = churches.find(ch => ch.id === e.target.value)
                      if (c) setActiveChurch(c)
                    }}
                    style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 10px', color: 'var(--text)', fontSize: 13, cursor: 'pointer' }}
                  >
                    {churches.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}
              {iconsOnly && (
                <button className="nav-item" title="Church" style={{ justifyContent: 'center' }}>
                  <span className="nav-icon">⛪</span>
                </button>
              )}
            </>
          )}

          {!iconsOnly && <div className="nav-section">Settings</div>}
          {iconsOnly && <div className="nav-divider" />}
          <button className={`nav-item ${page === 'settings' ? 'active' : ''}`} onClick={() => handleNav('settings')} title="Settings">
            <span className="nav-icon">⚙</span>
            {!iconsOnly && <span className="nav-label">Settings</span>}
          </button>
        </nav>
      </aside>
    </>
  )
}

function AppShell() {
  const { user, profile, loading: authLoading, churches, activeChurch, setActiveChurch } = useAuth()
  const [needsOnboarding, setNeedsOnboarding] = useState(false)
  const [page, setPage] = useState('home')
  const [songs, setSongs] = useState([])
  const [sets, setSets] = useState([])
  const [weekSongIds, setWeekSongIds] = useState([])
  const [dataLoading, setDataLoading] = useState(true)
  const [sidebarMode, setSidebarMode] = useState(() => localStorage.getItem('wf_sidebar') || 'full')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('wf_theme') || 'dark'
    if (saved === 'light') document.documentElement.classList.add('light-mode')
    return saved
  })

  useEffect(() => {
    if (theme === 'light') document.documentElement.classList.add('light-mode')
    else document.documentElement.classList.remove('light-mode')
    localStorage.setItem('wf_theme', theme)
  }, [theme])

  useEffect(() => {
    localStorage.setItem('wf_sidebar', sidebarMode)
  }, [sidebarMode])

  useEffect(() => {
    if (!activeChurch?.id) return
    setDataLoading(true)
    Promise.all([getSongs(activeChurch.id), getSets(activeChurch.id)]).then(([s, st]) => {
      setSongs(s || [])
      setSets(st || [])
      setDataLoading(false)
    }).catch(() => setDataLoading(false))
  }, [activeChurch?.id])

  const refreshSongs = () => getSongs(activeChurch.id).then(s => setSongs(s || []))
  const refreshSets  = () => getSets(activeChurch.id).then(s => setSets(s || []))

  const cycleSidebar = () => {
    setSidebarMode(m => m === 'full' ? 'icons' : 'full')
  }

  const titles = {
    home: 'Dashboard', library: 'Song Library', thisweek: 'Set Builder',
    history: 'Play History', upload: 'Upload Chord Chart',
    bandview: 'Band View', settings: 'Settings',
    recommendations: 'Song Recommendations'
  }

  if (authLoading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0d0f14', color: '#7c85a0', fontFamily: 'sans-serif' }}>
      Loading WorshipFlow...
    </div>
  )

  if (!user) return <Login onNeedsOnboarding={() => setNeedsOnboarding(true)} />
  if (!profile || needsOnboarding) return <Onboarding />

  const weekSongs = weekSongIds.map(id => songs.find(s => s.id === id)).filter(Boolean)

  const pageProps = {
    songs, sets, weekSongIds, weekSongs,
    setWeekSongIds, refreshSongs, refreshSets,
    theme, setTheme, profile, user,
    activeChurch, churches,
  }

  if (dataLoading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0d0f14', color: '#7c85a0', fontFamily: 'sans-serif' }}>
      Loading WorshipFlow...
    </div>
  )

  return (
    <div className={`app sidebar-mode-${sidebarMode}`}>
      <Sidebar
        page={page} setPage={setPage} weekCount={weekSongIds.length}
        churches={churches} activeChurch={activeChurch} setActiveChurch={setActiveChurch}
        mode={sidebarMode} onToggle={cycleSidebar}
        mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)}
      />
      <div className="main">
        <div className="topbar">
          <div className="topbar-title topbar-title-desktop">{titles[page]}</div>
          <div className="topbar-title topbar-title-mobile">{page === 'home' ? 'WorshipFlow' : titles[page]}</div>
          <div className="topbar-actions" id="topbar-actions"></div>
        </div>
        <div className="content">
          {page === 'home' && <Home {...pageProps} setPage={setPage} />}
          {page === 'library' && <Library {...pageProps} />}
          {page === 'thisweek' && <ThisWeek {...pageProps} setPage={setPage} />}
          {page === 'history' && <History {...pageProps} setPage={setPage} />}
          {page === 'upload' && <Upload {...pageProps} />}
          {page === 'bandview' && <BandView {...pageProps} />}
          {page === 'recommendations' && <Recommendations {...pageProps} />}
          {page === 'settings' && <Settings {...pageProps} />}
        </div>
      </div>

      {/* Mobile bottom nav */}
      <nav className="bottom-nav">
        {BOTTOM_NAV.map(n => (
          <button key={n.id} className={`bottom-nav-item ${page === n.id ? 'active' : ''}`} onClick={() => setPage(n.id)}>
            <span className="bottom-nav-icon">{n.icon}</span>
            <span className="bottom-nav-label">{n.label}</span>
            {n.id === 'thisweek' && weekSongIds.length > 0 && <span className="bottom-nav-badge">{weekSongIds.length}</span>}
          </button>
        ))}
        <button className="bottom-nav-item" onClick={() => setMobileOpen(o => !o)}>
          <span className="bottom-nav-icon">☰</span>
          <span className="bottom-nav-label">More</span>
        </button>
      </nav>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/band/:token" element={<BandViewPublic />} />
          <Route path="/band" element={<BandViewPublic />} />
          <Route path="/recommend" element={<RecommendView />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/join/:token" element={<JoinChurch />} />
          <Route path="*" element={<AppShell />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

function SignupPage() {
  const { user, profile, loading } = useAuth()
  if (loading) return null
  if (user && profile) { window.location.replace('/'); return null }
  if (user && !profile) return <Onboarding />
  return <Login onNeedsOnboarding={() => {}} defaultMode="signup" />
}

function BandViewPublic() {
  return (
    <div style={{ background: '#0a0b0f', minHeight: '100vh' }}>
      <BandView public={true} />
    </div>
  )
}
