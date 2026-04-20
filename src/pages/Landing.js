import React from 'react'

const FEATURES = [
  {
    title: 'Song Library',
    desc: 'Upload, organize, and transpose on the fly. Every chart your church has ever used, in one place.',
    screenshot: 'Screenshot: Song Library',
  },
  {
    title: 'Set Builder',
    desc: 'Drag and drop to build your Sunday set in minutes. Add notes, key overrides, and share with the band.',
    screenshot: 'Screenshot: Set Builder',
  },
  {
    title: 'Band View',
    desc: 'Everyone sees the same chord chart, in the right key, on their phone. No printing, no confusion.',
    screenshot: 'Screenshot: Band View',
  },
  {
    title: 'History & Recommendations',
    desc: "See what you've played and get smart suggestions for what's next.",
    screenshot: 'Screenshot: History & Recommendations',
  },
]

const STEPS = [
  { num: '1', title: 'Build your library', desc: 'Upload chord charts or paste lyrics. Transpose any song instantly.' },
  { num: '2', title: 'Plan your set', desc: 'Drag songs into order, set keys per-song, add rehearsal notes.' },
  { num: '3', title: 'Share with your team', desc: 'Your band opens the Band View on their phone — chords ready to go.' },
]

export default function Landing() {
  return (
    <div style={{ background: 'var(--bg)', color: 'var(--text)', minHeight: '100vh', fontFamily: 'var(--font-body, sans-serif)' }}>

      {/* ── Nav ─────────────────────────────────────────────────── */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 40px', borderBottom: '1px solid var(--border)',
        position: 'sticky', top: 0, background: 'var(--bg)', zIndex: 100,
      }}>
        <div style={{ fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: 18, color: 'var(--text)' }}>
          WorshipFlow
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <a href="/login" style={linkBtn}>Sign in</a>
          <a href="/signup" style={primaryBtn}>Get started free</a>
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
          Run your worship set<br />without the chaos.
        </h1>
        <p style={{
          fontSize: 'clamp(16px, 2.5vw, 20px)', color: 'var(--muted)',
          maxWidth: 540, margin: '0 0 40px', lineHeight: 1.6,
        }}>
          One place for your songs, your sets, your band, and your Sundays.
        </p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
          <a href="/signup" style={{ ...primaryBtn, fontSize: 16, padding: '14px 28px' }}>Get started free</a>
          <a href="/login" style={{ ...linkBtn, fontSize: 16, padding: '14px 28px' }}>Sign in</a>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────── */}
      <section style={{ padding: '60px 24px', maxWidth: 1100, margin: '0 auto' }}>
        <h2 style={{ fontFamily: 'var(--font-head)', fontSize: 28, fontWeight: 700, textAlign: 'center', marginBottom: 48 }}>
          Everything your worship team needs
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
              {/* Screenshot placeholder */}
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
                <p style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.6, margin: 0 }}>
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
            How it works
          </h2>
          <div style={{
            display: 'flex', gap: 40, flexWrap: 'wrap', justifyContent: 'center',
          }}>
            {STEPS.map((s, i) => (
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
                {i < STEPS.length - 1 && (
                  <div style={{
                    display: 'none', // connector hidden on wrap; visual flow is clear enough
                  }} />
                )}
                <h3 style={{ fontFamily: 'var(--font-head)', fontSize: 17, fontWeight: 700, margin: '0 0 8px' }}>
                  {s.title}
                </h3>
                <p style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.6, margin: 0 }}>
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
          Ready to simplify your Sundays?
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: 16, margin: '0 0 36px' }}>
          Free to get started. No credit card required.
        </p>
        <a href="/signup" style={{ ...primaryBtn, fontSize: 16, padding: '14px 32px', display: 'inline-block' }}>
          Get started free
        </a>
        <div style={{ marginTop: 20 }}>
          <a href="/login" style={{ color: 'var(--muted)', fontSize: 14, textDecoration: 'none' }}>
            Already have an account? <span style={{ color: 'var(--accent)' }}>Sign in</span>
          </a>
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
  textDecoration: 'none',
  fontWeight: 600,
  fontSize: 14,
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
  display: 'inline-flex',
  alignItems: 'center',
}
