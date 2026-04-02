import React, { useState, useEffect } from 'react'
import { getRecommendations, deleteRecommendation } from '../lib/supabase'

function linkIcon(url) {
  if (!url) return null
  if (url.includes('spotify.com') || url.includes('spotify:')) return { label: 'Spotify', color: '#1DB954' }
  if (url.includes('youtube.com') || url.includes('youtu.be')) return { label: 'YouTube', color: '#FF0000' }
  return { label: 'Link', color: 'var(--accent)' }
}

export default function Recommendations({ user }) {
  const [recs, setRecs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = async () => {
    if (!user) return
    setLoading(true)
    try {
      const data = await getRecommendations(user.id)
      setRecs(data)
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [user])

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this recommendation?')) return
    try {
      await deleteRecommendation(id)
      setRecs(prev => prev.filter(r => r.id !== id))
    } catch (e) {
      alert('Error: ' + e.message)
    }
  }

  const recommendLink = `${window.location.origin}/recommend`

  if (loading) return <div style={{ color: 'var(--muted)', padding: 20 }}>Loading...</div>
  if (error) return <div style={{ color: 'var(--red)', padding: 20 }}>Error: {error}</div>

  return (
    <div style={{ maxWidth: 640 }}>
      {recs.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🎵</div>
          <div className="empty-text">
            No recommendations yet<br />
            Share the link below with your congregation
          </div>
          <div style={{ marginTop: 20, display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: '9px 14px', fontSize: 13, color: 'var(--accent)', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {recommendLink}
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => { navigator.clipboard.writeText(recommendLink); alert('Link copied!') }}>Copy</button>
          </div>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>{recs.length} recommendation{recs.length !== 1 ? 's' : ''}</div>
            <button className="btn btn-ghost btn-sm" onClick={() => { navigator.clipboard.writeText(recommendLink); alert('Link copied!') }}>
              📋 Copy Share Link
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {recs.map(rec => {
              const link = linkIcon(rec.link)
              const date = rec.created_at
                ? new Date(rec.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                : null
              return (
                <div key={rec.id} className="card card-sm" style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--bg4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                    🎵
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{rec.song_name}</div>
                    {rec.reason && (
                      <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5, marginBottom: 8 }}>{rec.reason}</div>
                    )}
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      {rec.link && link && (
                        <a
                          href={rec.link}
                          target="_blank"
                          rel="noreferrer"
                          style={{ fontSize: 12, color: link.color, fontWeight: 500, textDecoration: 'none', background: `${link.color}18`, padding: '3px 9px', borderRadius: 6 }}
                        >
                          {link.label} →
                        </a>
                      )}
                      {date && <span style={{ fontSize: 11, color: 'var(--muted)' }}>{date}</span>}
                    </div>
                  </div>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ color: 'var(--red)', flexShrink: 0 }}
                    onClick={() => handleDelete(rec.id)}
                  >
                    ✕
                  </button>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
