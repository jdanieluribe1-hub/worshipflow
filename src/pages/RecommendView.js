import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { submitRecommendation } from '../lib/supabase'

function detectLinkType(url) {
  if (!url) return null
  if (url.includes('spotify.com') || url.includes('spotify:')) return 'spotify'
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube'
  return 'other'
}

export default function RecommendView() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const churchId = searchParams.get('church')
  const churchName = searchParams.get('name') || 'Worship Flow'

  const [songName, setSongName] = useState('')
  const [reason, setReason] = useState('')
  const [link, setLink] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState(null)

  const linkType = detectLinkType(link)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!songName.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      await submitRecommendation(songName.trim(), reason.trim(), link.trim(), churchId)
      setSubmitted(true)
    } catch (err) {
      setError(t('recommendView.errorTryAgain'))
    }
    setSubmitting(false)
  }

  const handleAnother = () => {
    setSongName('')
    setReason('')
    setLink('')
    setSubmitted(false)
    setError(null)
  }

  return (
    <div className="rec-page">
      <div className="rec-topbar">
        <div className="rec-logo">{churchName}</div>
        <div className="rec-label">{t('recommendView.songRecommendations')}</div>
      </div>

      <div className="rec-content">
        {submitted ? (
          <div className="rec-card" style={{ textAlign: 'center', padding: '48px 28px' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🙏</div>
            <div style={{ fontFamily: 'var(--font-head)', fontSize: 22, fontWeight: 700, color: '#1a1a1a', marginBottom: 10 }}>
              {t('recommendView.thankYouTitle')}
            </div>
            <div style={{ fontSize: 14, color: '#888', marginBottom: 28, lineHeight: 1.6 }}>
              {t('recommendView.thankYouDesc')}
            </div>
            <button className="rec-btn" onClick={handleAnother}>
              {t('recommendView.recommendAnother')}
            </button>
          </div>
        ) : (
          <div className="rec-card">
            <div style={{ fontFamily: 'var(--font-head)', fontSize: 20, fontWeight: 700, color: '#1a1a1a', marginBottom: 6 }}>
              {t('recommendView.suggestSong')}
            </div>
            <div style={{ fontSize: 13, color: '#888', marginBottom: 24, lineHeight: 1.5 }}>
              {t('recommendView.suggestDesc')}
            </div>

            <form onSubmit={handleSubmit}>
              <div className="rec-form-group">
                <label className="rec-label-text">{t('recommendView.songNameLabel')}</label>
                <input
                  className="rec-input"
                  type="text"
                  placeholder={t('recommendView.songNamePlaceholder')}
                  value={songName}
                  onChange={e => setSongName(e.target.value)}
                  required
                />
              </div>

              <div className="rec-form-group">
                <label className="rec-label-text">{t('recommendView.whyThisSong')}</label>
                <textarea
                  className="rec-input rec-textarea"
                  placeholder={t('recommendView.whyPlaceholder')}
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  rows={4}
                />
              </div>

              <div className="rec-form-group">
                <label className="rec-label-text">{t('recommendView.spotifyOrYoutube')}</label>
                <div style={{ position: 'relative' }}>
                  {linkType === 'spotify' && (
                    <span className="rec-link-badge" style={{ background: '#1DB954', color: '#fff' }}>Spotify</span>
                  )}
                  {linkType === 'youtube' && (
                    <span className="rec-link-badge" style={{ background: '#FF0000', color: '#fff' }}>YouTube</span>
                  )}
                  <input
                    className="rec-input"
                    style={linkType ? { paddingRight: 80 } : {}}
                    type="url"
                    placeholder={t('recommendView.linkPlaceholder')}
                    value={link}
                    onChange={e => setLink(e.target.value)}
                  />
                </div>
              </div>

              {error && (
                <div style={{ fontSize: 13, color: '#e53e3e', marginBottom: 16 }}>{error}</div>
              )}

              <button className="rec-btn rec-btn-primary" type="submit" disabled={submitting || !songName.trim()}>
                {submitting ? t('thisWeek.sending') : t('recommendView.submitRec')}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
