import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { ToastProvider } from './components/Toast'
import { HashRouter, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getSongs, getSets, createChurch, getChurchByShortCode, joinChurchByShortCode, setActiveChurchDB } from './lib/supabase'
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
import Landing from './pages/Landing'
import SongEditor from './pages/SongEditor'
import './App.css'

// Compute play counts dynamically from finalized sets so they stay in sync
// with actual set history (prevents stale DB counters from showing wrong data).
function computePlayCounts(songs, sets) {
  const now = new Date()
  const currentYear = now.getFullYear()
  const MS_3_WEEKS  = 21 * 24 * 60 * 60 * 1000
  const MS_3_MONTHS = 90 * 24 * 60 * 60 * 1000

  const counts = {}
  songs.forEach(s => { counts[s.id] = { plays_3weeks: 0, plays_3months: 0, plays_year: 0 } })

  sets.filter(s => s.finalized).forEach(set => {
    const date = new Date(set.service_date + 'T12:00:00')
    const age  = now - date
    ;(set.song_ids || []).forEach(id => {
      if (!counts[id]) return
      if (age <= MS_3_WEEKS)  counts[id].plays_3weeks++
      if (age <= MS_3_MONTHS) counts[id].plays_3months++
      if (date.getFullYear() === currentYear) counts[id].plays_year++
    })
  })

  return songs.map(s => ({ ...s, ...counts[s.id] }))
}

const PAGE_PATHS = {
  home: '/home',
  library: '/library',
  thisweek: '/sets',
  history: '/history',
  upload: '/upload',
  bandview: '/band-view',
  recommendations: '/recommendations',
  settings: '/settings',
  editor: '/editor',
}
const PATH_PAGES = Object.fromEntries(Object.entries(PAGE_PATHS).map(([k, v]) => [v, k]))

function Sidebar({ page, setPage, weekCount, churches, activeChurch, setActiveChurch, mode, onToggle, mobileOpen, onMobileClose }) {
  const { t } = useTranslation()
  const nav = [
    { id: 'home', icon: '🏠', label: t('nav.home') },
    { id: 'library', icon: '♪', label: t('nav.songLibrary') },
    { id: 'thisweek', icon: '📅', label: t('nav.setBuilder'), badge: weekCount },
    { id: 'history', icon: '📊', label: t('nav.playHistory') },
  ]
  const tools = [
    { id: 'upload', icon: '⬆', label: t('nav.uploadChart') },
    { id: 'bandview', icon: '🎸', label: t('nav.bandView') },
    { id: 'editor', icon: '✏️', label: t('nav.songEditor') },
    { id: 'recommendations', icon: '💡', label: t('nav.recommendations') },
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
            <Link to="/home" className="logo-link">
              <div className="logo-title">WorshipFlow</div>
              <div className="logo-sub">Director Dashboard</div>
            </Link>
          )}
          {iconsOnly && <div className="logo-title" style={{ fontSize: 14, textAlign: 'center' }}>WF</div>}
          <button className="sidebar-toggle-btn" onClick={onToggle} title="Toggle sidebar">
            {mode === 'full' ? '‹‹' : '››'}
          </button>
        </div>

        <nav className="nav">
          {!iconsOnly && <div className="nav-section">{t('nav.sectionMain')}</div>}
          {nav.map(n => (
            <button key={n.id} className={`nav-item ${page === n.id ? 'active' : ''}`} onClick={() => handleNav(n.id)} title={n.label}>
              <span className="nav-icon">{n.icon}</span>
              {!iconsOnly && <span className="nav-label">{n.label}</span>}
              {!iconsOnly && n.badge > 0 && <span className="badge">{n.badge}</span>}
              {iconsOnly && n.badge > 0 && <span className="badge badge-dot" />}
            </button>
          ))}

          {!iconsOnly && <div className="nav-section">{t('nav.sectionTools')}</div>}
          {iconsOnly && <div className="nav-divider" />}
          {tools.map(n => (
            <button key={n.id} className={`nav-item ${page === n.id ? 'active' : ''}`} onClick={() => handleNav(n.id)} title={n.label}>
              <span className="nav-icon">{n.icon}</span>
              {!iconsOnly && <span className="nav-label">{n.label}</span>}
            </button>
          ))}

          {churches && churches.length > 1 && (
            <>
              {!iconsOnly && <div className="nav-section">{t('nav.sectionChurch')}</div>}
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

          {!iconsOnly && <div className="nav-section">{t('nav.sectionSettings')}</div>}
          {iconsOnly && <div className="nav-divider" />}
          <button className={`nav-item ${page === 'settings' ? 'active' : ''}`} onClick={() => handleNav('settings')} title={t('nav.settings')}>
            <span className="nav-icon">⚙</span>
            {!iconsOnly && <span className="nav-label">{t('nav.settings')}</span>}
          </button>
        </nav>

        <div className="sidebar-app-switch">
          <a href={process.env.REACT_APP_SERVICEFLOW_URL} className="app-switch-link" title="Switch to ServiceFlow">
            <span className="app-switch-icon">⇄</span>
            {!iconsOnly && (
              <div className="app-switch-text">
                <span className="app-switch-label">{t('nav.switchTo')}</span>
                <span className="app-switch-name">ServiceFlow</span>
              </div>
            )}
          </a>
        </div>
      </aside>
    </>
  )
}

function NoChurchState() {
  const { t } = useTranslation()
  const { user, refreshChurches } = useAuth()

  const [churchName, setChurchName] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  const [joinCode, setJoinCode] = useState('')
  const [joinPreview, setJoinPreview] = useState(null)
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState('')

  const handleCreate = async () => {
    if (!churchName.trim()) return
    setCreating(true)
    setCreateError('')
    try {
      await createChurch(churchName.trim())
      await refreshChurches()
    } catch (err) {
      setCreateError(err.message || 'Something went wrong.')
      setCreating(false)
    }
  }

  const handleJoinCodeChange = async (val) => {
    setJoinCode(val)
    setJoinPreview(null)
    setJoinError('')
    if (val.trim().length >= 4) {
      try {
        const c = await getChurchByShortCode(val.trim())
        setJoinPreview(c)
      } catch {}
    }
  }

  const handleJoin = async () => {
    if (!joinPreview) return
    setJoining(true)
    setJoinError('')
    try {
      await joinChurchByShortCode(joinCode.trim())
      await setActiveChurchDB(user.id, joinPreview.id)
      await refreshChurches()
    } catch (err) {
      setJoinError(err.message || t('settings.failedToJoin'))
      setJoining(false)
    }
  }

  return (
    <div style={{
      display: 'flex', justifyContent: 'center',
      paddingTop: 64, paddingLeft: 32, paddingRight: 32, paddingBottom: 32,
    }}>
      <div style={{ width: '100%', maxWidth: 760 }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ fontSize: 64, marginBottom: 20 }}>⛪</div>
          <div style={{ fontFamily: 'var(--font-head)', fontSize: 28, fontWeight: 700, marginBottom: 10 }}>
            {t('noChurch.title')}
          </div>
          <div style={{ color: 'var(--muted)', fontSize: 15 }}>
            {t('noChurch.subtitle')}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 20, alignItems: 'start' }}>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 32 }}>
            <div style={{ fontFamily: 'var(--font-head)', fontWeight: 600, fontSize: 17 }}>
              {t('noChurch.createTitle')}
            </div>
            <input
              className="form-input"
              placeholder={t('noChurch.churchNamePlaceholder')}
              value={churchName}
              onChange={e => setChurchName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              disabled={creating}
            />
            {createError && <div style={{ fontSize: 13, color: 'var(--red)' }}>{createError}</div>}
            <button
              className="btn btn-primary"
              onClick={handleCreate}
              disabled={creating || !churchName.trim()}
            >
              {creating ? t('noChurch.creating') : t('noChurch.create')}
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, paddingTop: 64 }}>
            <div style={{ width: 1, height: 56, background: 'var(--border)' }} />
            <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              {t('noChurch.or')}
            </div>
            <div style={{ width: 1, height: 56, background: 'var(--border)' }} />
          </div>

          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 32 }}>
            <div style={{ fontFamily: 'var(--font-head)', fontWeight: 600, fontSize: 17 }}>
              {t('noChurch.joinTitle')}
            </div>
            <input
              className="form-input"
              placeholder={t('noChurch.shortCodePlaceholder')}
              value={joinCode}
              onChange={e => handleJoinCodeChange(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
              disabled={joining}
            />
            {joinPreview && (
              <div style={{ fontSize: 13, color: 'var(--green)' }}>
                {t('settings.foundChurch', { name: joinPreview.name })}
              </div>
            )}
            {joinCode.length >= 4 && !joinPreview && !joining && (
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                {t('settings.noChurchFound')}
              </div>
            )}
            {joinError && <div style={{ fontSize: 13, color: 'var(--red)' }}>{joinError}</div>}
            <button
              className="btn btn-primary"
              onClick={handleJoin}
              disabled={joining || !joinPreview}
            >
              {joining ? t('noChurch.joining') : t('noChurch.join')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function AppShell() {
  const { t } = useTranslation()
  const { user, profile, loading: authLoading, churches, activeChurch, setActiveChurch } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const page = PATH_PAGES[location.pathname] || 'home'
  const setPage = useCallback((id) => navigate(PAGE_PATHS[id] || '/home'), [navigate])
  const [pendingOpenSong, setPendingOpenSong] = useState(null)
  const [pendingEditSetDate, setPendingEditSetDate] = useState(null)
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
    if (!activeChurch?.id) { setDataLoading(false); return }
    setDataLoading(true)
    Promise.all([getSongs(activeChurch.id), getSets(activeChurch.id)]).then(([s, st]) => {
      setSongs(s || [])
      setSets(st || [])
      setDataLoading(false)
    }).catch(() => setDataLoading(false))
  }, [activeChurch?.id])

  const refreshSongs = () => activeChurch?.id ? getSongs(activeChurch.id).then(s => setSongs(s || [])) : Promise.resolve()
  const refreshSets  = () => activeChurch?.id ? getSets(activeChurch.id).then(s => setSets(s || [])) : Promise.resolve()

  const cycleSidebar = () => {
    setSidebarMode(m => m === 'full' ? 'icons' : 'full')
  }

  const titles = {
    home: t('nav.home'), library: t('nav.songLibrary'), thisweek: t('nav.setBuilder'),
    history: t('nav.playHistory'), upload: t('nav.uploadChart'),
    bandview: t('nav.bandView'), settings: t('nav.settings'),
    recommendations: t('nav.recommendations'), editor: t('nav.songEditor'),
  }

  const BOTTOM_NAV = [
    { id: 'home', icon: '🏠', label: t('nav.home') },
    { id: 'library', icon: '🎵', label: t('nav.library') },
    { id: 'thisweek', icon: '📅', label: t('nav.thisWeek') },
    { id: 'history', icon: '📊', label: t('nav.history') },
  ]

  // useMemo must be called before any conditional returns to satisfy React hooks rules
  const enrichedSongs = useMemo(() => computePlayCounts(songs, sets), [songs, sets])
  const weekSongs = weekSongIds.map(id => enrichedSongs.find(s => s.id === id)).filter(Boolean)

  if (authLoading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0d0f14', color: '#7c85a0', fontFamily: 'sans-serif' }}>
      Loading WorshipFlow...
    </div>
  )

  if (!user) {
    navigate('/', { replace: true })
    return null
  }
  if (!profile) return <Onboarding />

  if (dataLoading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0d0f14', color: '#7c85a0', fontFamily: 'sans-serif' }}>
      Loading WorshipFlow...
    </div>
  )

  const pageProps = {
    songs: enrichedSongs, sets, weekSongIds, weekSongs,
    setWeekSongIds, refreshSongs, refreshSets,
    theme, setTheme, profile, user,
    activeChurch, churches, setPage,
    pendingEditSetDate, setPendingEditSetDate,
  }

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
          {!activeChurch && page !== 'settings' ? (
            <NoChurchState />
          ) : (
            <>
              {page === 'home' && <Home {...pageProps} setPage={setPage} setPendingOpenSong={setPendingOpenSong} />}
              {page === 'library' && <Library {...pageProps} pendingOpenSong={pendingOpenSong} setPendingOpenSong={setPendingOpenSong} />}
              {page === 'thisweek' && <ThisWeek {...pageProps} setPage={setPage} />}
              {page === 'history' && <History {...pageProps} setPage={setPage} />}
              {page === 'upload' && <Upload {...pageProps} setPendingOpenSong={setPendingOpenSong} />}
              {page === 'bandview' && <BandView {...pageProps} />}
              {page === 'recommendations' && <Recommendations {...pageProps} />}
              {page === 'settings' && <Settings {...pageProps} />}
              {page === 'editor' && <SongEditor {...pageProps} pendingOpenSong={pendingOpenSong} setPendingOpenSong={setPendingOpenSong} />}
            </>
          )}
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
    <HashRouter>
      <AuthProvider>
        <ToastProvider>
        <Routes>
          <Route path="/" element={<LandingRoute />} />
          <Route path="/band/:token" element={<BandViewPublic />} />
          <Route path="/band" element={<BandViewPublic />} />
          <Route path="/recommend" element={<RecommendView />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/join/:token" element={<JoinChurch />} />
          <Route path="*" element={<AppShell />} />
        </Routes>
        </ToastProvider>
      </AuthProvider>
    </HashRouter>
  )
}

function SignupPage() {
  const { user, profile, loading } = useAuth()
  const navigate = useNavigate()
  if (loading) return null
  if (user && profile) { navigate('/home', { replace: true }); return null }
  if (user && !profile) return <Onboarding />
  return <Login onNeedsOnboarding={() => {}} defaultMode="signup" />
}

function LandingRoute() {
  const { user, profile, loading } = useAuth()
  const navigate = useNavigate()
  if (loading) return null
  if (user && profile) { navigate('/home', { replace: true }); return null }
  if (user && !profile) return <Onboarding />
  return <Landing />
}

function LoginPage() {
  const { user, profile, loading } = useAuth()
  const navigate = useNavigate()
  if (loading) return null
  if (user && profile) { navigate('/home', { replace: true }); return null }
  if (user && !profile) return <Onboarding />
  return <Login onNeedsOnboarding={() => {}} defaultMode="signin" />
}

function BandViewPublic() {
  return (
    <div style={{ background: '#0a0b0f', minHeight: '100vh' }}>
      <BandView public={true} />
    </div>
  )
}
