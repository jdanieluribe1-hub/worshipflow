import React from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

export default function Landing() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const FEATURES = [
    { title: t('landing.feature1Title'), desc: t('landing.feature1Body'), screenshot: t('landing.screenshotLibrary') },
    { title: t('landing.feature2Title'), desc: t('landing.feature2Body'), screenshot: t('landing.screenshotSetBuilder') },
    { title: t('landing.feature3Title'), desc: t('landing.feature3Body'), screenshot: t('landing.screenshotBandView') },
    { title: t('landing.feature4Title'), desc: t('landing.feature4Body'), screenshot: t('landing.screenshotHistory') },
  ]

  const STEPS = [
    { num: '1', title: t('landing.howStep1'), desc: t('landing.step1Desc') },
    { num: '2', title: t('landing.howStep2'), desc: t('landing.step2Desc') },
    { num: '3', title: t('landing.howStep3'), desc: t('landing.step3Desc') },
  ]

  return (
    <div style={{ background: 'var(--bg)', color: 'var(--text)', minHeight: '100vh', fontFamily: 'var(--font-body, sans-serif)' }}>

      {/* ── Nav ─────────────────────────────────────────────────── */}
      <header style={{
        borderBottom: '1px solid var(--border)',
        position: 'sticky', top: 0, background: 'var(--bg)', zIndex: 100,
        paddingTop: 'env(safe-area-inset-top)',
      }}>
        {/* Desktop: single row with logo + buttons */}
        <div className="landing-nav-desktop" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <a href={process.env.REACT_APP_SERVICEFLOW_URL} style={{ fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: 18, color: 'var(--muted)', textDecoration: 'none' }}>ServiceFlow</a>
            <span style={{ color: 'var(--border2)', fontWeight: 300, fontSize: 18 }}>|</span>
            <span style={{ fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: 18, color: 'var(--text)' }}>WorshipFlow</span>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => navigate('/login')} style={linkBtn}>{t('landing.signIn')}</button>
            <button onClick={() => navigate('/signup')} style={primaryBtn}>{t('landing.getStarted')}</button>
          </div>
        </div>
        {/* Mobile: buttons row */}
        <div className="landing-nav-mobile-btns">
          <button onClick={() => navigate('/login')} style={linkBtn}>{t('landing.signIn')}</button>
          <button onClick={() => navigate('/signup')} style={primaryBtn}>{t('landing.getStarted')}</button>
        </div>
        {/* Mobile: app switcher row */}
        <div className="landing-nav-mobile-switcher">
          <a href={process.env.REACT_APP_SERVICEFLOW_URL} style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 17, color: 'var(--muted)', textDecoration: 'none' }}>ServiceFlow</a>
          <span style={{ color: 'var(--border2)', fontWeight: 300 }}>|</span>
          <span style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 17, color: 'var(--text)' }}>WorshipFlow</span>
        </div>
      </header>

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        textAlign: 'center', padding: '100px 24px 80px',
      }}>
        <div style={{ fontSize: 48, marginBottom: 20 }}>🎸</div>
        <h1 style={{
          fontFamily: 'var(--font-head)', fontSize: 'clamp(32px, 6vw, 56px)',
          fontWeight: 800, lineHeight: 1.1, margin: '0 0 20px',
          maxWidth: 720,
        }}>
          {t('landing.heroTitle')}
        </h1>
        <p style={{
          fontSize: 'clamp(16px, 2.5vw, 20px)', color: 'var(--muted)',
          maxWidth: 540, margin: '0 0 40px', lineHeight: 1.6,
        }}>
          {t('landing.heroSubtitle')}
        </p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button onClick={() => navigate('/signup')} style={{ ...primaryBtn, fontSize: 16, padding: '14px 28px' }}>{t('landing.getStarted')}</button>
          <button onClick={() => navigate('/login')} style={{ ...linkBtn, fontSize: 16, padding: '14px 28px' }}>{t('landing.signIn')}</button>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────── */}
      <section style={{ padding: '60px 24px', maxWidth: 1100, margin: '0 auto' }}>
        <h2 style={{ fontFamily: 'var(--font-head)', fontSize: 28, fontWeight: 700, textAlign: 'center', marginBottom: 48 }}>
          {t('landing.featuresSectionTitle')}
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 32,
        }}>
          {FEATURES.map(f => (
            <div key={f.title} style={{
              background: 'var(--bg2)', border: '1px solid var(--border)',
              borderRadius: 16, overflow: 'hidden',
            }}>
              <div style={{
                height: 200, background: 'var(--bg3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--muted)', fontSize: 13, borderBottom: '1px solid var(--border)',
              }}>
                {f.screenshot}
              </div>
              <div style={{ padding: '20px 24px 24px' }}>
                <h3 style={{ fontFamily: 'var(--font-head)', fontSize: 18, fontWeight: 700, margin: '0 0 8px' }}>
                  {f.title}
                </h3>
                <p style={{ color: 'var(--muted)', fontSize: 17, lineHeight: 1.6, margin: 0 }}>
                  {f.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────── */}
      <section style={{
        padding: '80px 24px', background: 'var(--bg2)',
        borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <h2 style={{ fontFamily: 'var(--font-head)', fontSize: 28, fontWeight: 700, textAlign: 'center', marginBottom: 56 }}>
            {t('landing.howItWorksTitle')}
          </h2>
          <div style={{
            display: 'flex', gap: 40, flexWrap: 'wrap', justifyContent: 'center',
          }}>
            {STEPS.map(s => (
              <div key={s.num} style={{
                flex: '1 1 200px', maxWidth: 260,
                display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
              }}>
                <div style={{
                  width: 48, height: 48, borderRadius: '50%',
                  background: 'var(--accent)', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: 20,
                  marginBottom: 16, flexShrink: 0,
                }}>
                  {s.num}
                </div>
                <h3 style={{ fontFamily: 'var(--font-head)', fontSize: 17, fontWeight: 700, margin: '0 0 8px' }}>
                  {s.title}
                </h3>
                <p style={{ color: 'var(--muted)', fontSize: 17, lineHeight: 1.6, margin: 0 }}>
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Secondary CTA ────────────────────────────────────────── */}
      <section style={{
        padding: '100px 24px', textAlign: 'center',
      }}>
        <h2 style={{ fontFamily: 'var(--font-head)', fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 800, margin: '0 0 16px' }}>
          {t('landing.ctaTitle')}
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: 16, margin: '0 0 36px' }}>
          {t('landing.ctaSubtitle')}
        </p>
        <button onClick={() => navigate('/signup')} style={{ ...primaryBtn, fontSize: 16, padding: '14px 32px' }}>
          {t('landing.getStarted')}
        </button>
        <div style={{ marginTop: 20 }}>
          <span onClick={() => navigate('/login')} style={{ color: 'var(--muted)', fontSize: 17, cursor: 'pointer' }}>
            {t('landing.alreadyHaveAccount')} <span style={{ color: 'var(--accent)' }}>{t('landing.signIn')}</span>
          </span>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer style={{
        borderTop: '1px solid var(--border)', padding: '28px 40px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 12,
      }}>
        <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>
          WorshipFlow
        </div>
        <div style={{ fontSize: 13, color: 'var(--muted)' }}>
          © {new Date().getFullYear()} WorshipFlow. All rights reserved.
        </div>
      </footer>

    </div>
  )
}

const primaryBtn = {
  background: 'var(--accent)',
  color: '#fff',
  padding: '10px 20px',
  borderRadius: 8,
  border: 'none',
  textDecoration: 'none',
  fontWeight: 600,
  fontSize: 14,
  fontFamily: 'inherit',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
}

const linkBtn = {
  background: 'var(--bg3)',
  color: 'var(--text)',
  border: '1px solid var(--border2)',
  padding: '10px 20px',
  borderRadius: 8,
  textDecoration: 'none',
  fontWeight: 600,
  fontSize: 14,
  fontFamily: 'inherit',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
}
