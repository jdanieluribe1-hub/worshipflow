import React, { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import i18n, { dateLocale } from '../i18n'

function tempoColor(t) { return t==='Fast'?'var(--fast)':t==='Medium'?'var(--medium)':'var(--slow)' }

function getNextSunday() {
  const d = new Date()
  const diff = d.getDay() === 0 ? 0 : 7 - d.getDay()
  d.setDate(d.getDate() + diff)
  return d.toISOString().slice(0, 10)
}

export default function Home({ songs, sets, setPage, setPendingOpenSong, profile }) {
  const { t } = useTranslation()
  const [calDate, setCalDate] = useState(new Date())
  const [hoveredKey, setHoveredKey] = useState(null)

  const locale = dateLocale(i18n.language)

  const today = new Date(); today.setHours(0,0,0,0)
  const todayStr = today.toISOString().slice(0,10)
  const nextSunday = getNextSunday()

  const historyMap = {}
  sets.forEach(s => { historyMap[s.service_date] = s })

  // Upcoming sets (today or future, not finalized), sorted ascending
  const upcomingSets = sets
    .filter(s => s.service_date >= todayStr && !s.finalized)
    .sort((a,b) => a.service_date.localeCompare(b.service_date))
    .slice(0, 5)

  const topSongs = useMemo(() => [...songs].sort((a,b) => (b.plays_year||0)-(a.plays_year||0)).slice(0,5), [songs])
  const librarySongs = useMemo(() => [...songs].sort((a,b) => a.title.localeCompare(b.title)).slice(0,10), [songs])
  const maxPlays = topSongs[0]?.plays_year || 1

  const year = calDate.getFullYear()
  const month = calDate.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month+1, 0).getDate()
  const daysInPrev = new Date(year, month, 0).getDate()

  // Generate locale-aware day labels (starting Sunday)
  const dayLabels = Array.from({length: 7}, (_, i) => {
    const d = new Date(2024, 0, 7 + i) // Jan 7, 2024 is a Sunday
    return new Intl.DateTimeFormat(locale, {weekday: 'narrow'}).format(d)
  })

  const changeMonth = dir => { const d = new Date(calDate); d.setMonth(d.getMonth()+dir); setCalDate(d) }

  const calCells = []
  for (let i = 0; i < firstDay; i++) {
    const d = daysInPrev - firstDay + i + 1
    calCells.push({ d, key: new Date(year, month-1, d).toISOString().slice(0,10), other: true })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    calCells.push({ d, key: new Date(year, month, d).toISOString().slice(0,10), other: false })
  }
  const remaining = (firstDay + daysInMonth) % 7 === 0 ? 0 : 7 - ((firstDay + daysInMonth) % 7)
  for (let d = 1; d <= remaining; d++) {
    calCells.push({ d, key: new Date(year, month+1, d).toISOString().slice(0,10), other: true })
  }

  return (
    <div>
      {/* WELCOME */}
      <div style={{ marginBottom:24, minWidth:0, overflow:'hidden' }}>
        <div style={{ fontFamily:'var(--font-head)', fontSize:'clamp(16px, 4vw, 22px)', fontWeight:700, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {t('home.welcomeBack')}, {profile?.name || 'Director'} 👋
        </div>
        {profile?.church_name && (
          <div style={{ fontSize:13, color:'var(--muted)', marginTop:4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{profile.church_name}</div>
        )}
      </div>

    <div className="home-grid" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, alignItems:'start' }}>

      {/* LEFT — CALENDAR + COMING UP */}
      <div style={{ display:'flex', flexDirection:'column', gap:20, minWidth:0 }}>

        {/* CALENDAR */}
        <div className="card home-cal-card" style={{ padding:24, overflow:'hidden' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18, gap:8 }}>
            <div style={{ fontFamily:'var(--font-head)', fontSize:17, fontWeight:700, minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {calDate.toLocaleDateString(locale,{month:'long',year:'numeric'})}
            </div>
            <div style={{ display:'flex', gap:6, flexShrink:0 }}>
              <button className="btn btn-ghost btn-sm" onClick={()=>changeMonth(-1)}>‹</button>
              <button className="btn btn-ghost btn-sm" onClick={()=>{setCalDate(new Date())}}>{t('home.today')}</button>
              <button className="btn btn-ghost btn-sm" onClick={()=>changeMonth(1)}>›</button>
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:3, marginBottom:4 }}>
            {dayLabels.map(l => (
              <div key={l} style={{ fontSize:11, color:'var(--muted)', textAlign:'center', padding:'4px 0', fontWeight:500 }}>{l}</div>
            ))}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:3 }}>
            {calCells.map(({ d, key, other }) => {
              const hasSet = !!historyMap[key]
              const isToday = key === todayStr
              const isNext = key === nextSunday && !isToday
              const isHovered = hoveredKey === key
              const setData = historyMap[key]
              return (
                <div
                  key={key}
                  onMouseEnter={() => hasSet && setHoveredKey(key)}
                  onMouseLeave={() => setHoveredKey(null)}
                  onClick={() => hasSet && setPage('history')}
                  style={{
                    height:44, borderRadius:8, display:'flex', flexDirection:'column',
                    alignItems:'center', justifyContent:'center', fontSize:13,
                    cursor: hasSet ? 'pointer' : 'default',
                    background: isToday ? 'var(--accent)' : isHovered && hasSet ? 'var(--bg4)' : hasSet ? 'var(--bg3)' : 'transparent',
                    color: isToday ? '#fff' : other ? 'var(--muted)' : 'var(--text)',
                    fontWeight: isToday || isNext ? 700 : 400,
                    border: isNext ? '1.5px solid var(--accent)' : '1.5px solid transparent',
                    position:'relative', transition:'background 0.1s',
                  }}
                >
                  {d}
                  {hasSet && <div style={{ width:5, height:5, borderRadius:'50%', background: isToday ? 'rgba(255,255,255,0.8)' : 'var(--accent)', marginTop:2 }} />}
                  {isHovered && hasSet && setData && (
                    <div style={{
                      position:'absolute', bottom:'calc(100% + 8px)', left:'50%', transform:'translateX(-50%)',
                      background:'var(--bg2)', border:'1px solid var(--border2)', borderRadius:8,
                      padding:'10px 12px', zIndex:200, whiteSpace:'nowrap', boxShadow:'0 6px 20px rgba(0,0,0,0.25)',
                      pointerEvents:'none',
                    }}>
                      <div style={{ fontSize:12, fontWeight:600, marginBottom:5, color:'var(--text)' }}>
                        {new Date(key+'T12:00:00').toLocaleDateString(locale,{weekday:'short',month:'short',day:'numeric'})}
                      </div>
                      {(setData.song_ids||[]).slice(0,4).map(id => {
                        const s = songs.find(x => x.id === id)
                        return s ? <div key={id} style={{ fontSize:11, color:'var(--muted)', marginBottom:1 }}>{s.title}</div> : null
                      })}
                      {(setData.song_ids||[]).length > 4 && <div style={{ fontSize:11, color:'var(--muted)' }}>+{(setData.song_ids||[]).length - 4} more</div>}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          <div style={{ marginTop:14, fontSize:11, color:'var(--muted)', display:'flex', gap:14 }}>
            <span style={{ display:'inline-flex', alignItems:'center', gap:5 }}>
              <span style={{ width:5, height:5, borderRadius:'50%', background:'var(--accent)', display:'inline-block' }}/>{t('home.setScheduled')}
            </span>
            <span style={{ display:'inline-flex', alignItems:'center', gap:5 }}>
              <span style={{ width:10, height:10, borderRadius:3, border:'1.5px solid var(--accent)', display:'inline-block' }}/>{t('home.nextSunday')}
            </span>
          </div>
        </div>

        {/* COMING UP */}
        <div className="card" style={{ padding:20 }}>
          <div style={{ fontFamily:'var(--font-head)', fontSize:15, fontWeight:700, marginBottom:4 }}>{t('home.comingUp')}</div>
          <div style={{ fontSize:12, color:'var(--muted)', marginBottom:14 }}>{t('home.upcomingScheduledSets')}</div>
          {upcomingSets.length === 0 ? (
            <div style={{ color:'var(--muted)', fontSize:13, textAlign:'center', padding:'20px 0' }}>
              {t('home.noUpcomingSets')}{' '}
              <span style={{ color:'var(--accent)', cursor:'pointer' }} onClick={()=>setPage('thisweek')}>{t('home.buildOneInSetBuilder')}</span>
            </div>
          ) : upcomingSets.map(set => {
            const setSongs = (set.song_ids||[]).map(id => songs.find(s => s.id === id)).filter(Boolean)
            const fast = setSongs.filter(s=>s.tempo==='Fast').length
            const mid = setSongs.filter(s=>s.tempo==='Medium').length
            const slow = setSongs.filter(s=>s.tempo==='Slow').length
            const isNext = set.service_date === upcomingSets[0].service_date
            return (
              <div key={set.service_date} style={{
                display:'flex', alignItems:'center', gap:14, padding:'10px 0',
                borderBottom:'1px solid var(--border)',
              }}>
                <div style={{ flexShrink:0, textAlign:'center', minWidth:48 }}>
                  <div style={{ fontSize:11, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.5px' }}>
                    {new Date(set.service_date+'T12:00:00').toLocaleDateString(locale,{month:'short'})}
                  </div>
                  <div style={{ fontFamily:'var(--font-head)', fontSize:22, fontWeight:700, lineHeight:1, color: isNext ? 'var(--accent)' : 'var(--text)' }}>
                    {new Date(set.service_date+'T12:00:00').getDate()}
                  </div>
                  <div style={{ fontSize:10, color:'var(--muted)' }}>
                    {new Date(set.service_date+'T12:00:00').toLocaleDateString(locale,{weekday:'short'})}
                  </div>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:12, color:'var(--muted)', marginBottom:6 }}>
                    {setSongs.length} {setSongs.length !== 1 ? t('common.songs') : t('common.song')}
                  </div>
                  <div style={{ display:'flex', gap:8 }}>
                    {fast > 0 && <span style={{ fontSize:11, color:'var(--fast)', background:'rgba(248,113,113,0.1)', borderRadius:5, padding:'2px 7px' }}>⚡ {fast} {t('thisWeek.fast')}</span>}
                    {mid > 0 && <span style={{ fontSize:11, color:'var(--medium)', background:'rgba(245,200,66,0.1)', borderRadius:5, padding:'2px 7px' }}>♩ {mid} {t('thisWeek.mid')}</span>}
                    {slow > 0 && <span style={{ fontSize:11, color:'var(--slow)', background:'rgba(96,165,250,0.1)', borderRadius:5, padding:'2px 7px' }}>🎶 {slow} {t('thisWeek.slow')}</span>}
                  </div>
                </div>
                {isNext && <span style={{ fontSize:10, background:'var(--accent)', color:'#fff', borderRadius:5, padding:'3px 8px', flexShrink:0, fontWeight:600 }}>{t('home.nextLabel')}</span>}
              </div>
            )
          })}
        </div>

        {/* UPLOAD CHART */}
        <div
          className="card"
          onClick={()=>setPage('upload')}
          style={{ cursor:'pointer', padding:24, display:'flex', alignItems:'center', gap:16, transition:'transform 0.12s', userSelect:'none' }}
          onMouseEnter={e=>e.currentTarget.style.transform='translateY(-2px)'}
          onMouseLeave={e=>e.currentTarget.style.transform='translateY(0)'}
        >
          <div style={{ fontSize:32, flexShrink:0 }}>⬆</div>
          <div>
            <div style={{ fontFamily:'var(--font-head)', fontSize:15, fontWeight:700, marginBottom:2 }}>{t('home.uploadChart')}</div>
            <div style={{ fontSize:12, color:'var(--muted)' }}>{t('home.uploadChartDesc')}</div>
          </div>
        </div>
      </div>

      {/* RIGHT — TOP SONGS + LIBRARY */}
      <div style={{ display:'flex', flexDirection:'column', gap:20, minWidth:0 }}>

        {/* TOP PLAYED THIS YEAR */}
        <div className="card" style={{ padding:20 }}>
          <div style={{ fontFamily:'var(--font-head)', fontSize:15, fontWeight:700, marginBottom:4 }}>{t('home.topPlayedThisYear')}</div>
          <div style={{ fontSize:12, color:'var(--muted)', marginBottom:14 }}>{t('home.keepThingsDiverse')}</div>
          {topSongs.length === 0 ? (
            <div style={{ color:'var(--muted)', fontSize:13, textAlign:'center', padding:16 }}>{t('home.noPlayHistoryYet')}</div>
          ) : topSongs.map((s, i) => (
            <div key={s.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'7px 0', borderBottom: i < topSongs.length-1 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ width:22, height:22, borderRadius:'50%', background:'var(--bg3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color: i===0 ? 'var(--gold)' : 'var(--muted)', flexShrink:0 }}>{i+1}</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.title}</div>
                <div style={{ fontSize:11, color:'var(--muted)' }}>{s.artist}</div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
                <div style={{ width:70, height:5, borderRadius:3, background:'var(--bg3)', overflow:'hidden' }}>
                  <div style={{ height:'100%', borderRadius:3, background: i===0 ? 'var(--gold)' : 'var(--accent)', width:`${Math.round(((s.plays_year||0)/maxPlays)*100)}%` }} />
                </div>
                <div style={{ fontSize:12, color:'var(--muted)', minWidth:20, textAlign:'right' }}>{s.plays_year||0}</div>
              </div>
            </div>
          ))}
        </div>

        {/* SONG LIBRARY PREVIEW */}
        <div className="card" style={{ padding:20 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
            <div style={{ fontFamily:'var(--font-head)', fontSize:15, fontWeight:700 }}>{t('home.songLibraryTitle')}</div>
            <button className="btn btn-ghost btn-sm" onClick={()=>setPage('library')}>{t('home.viewAll')}</button>
          </div>
          <div style={{ fontSize:12, color:'var(--muted)', marginBottom:14 }}>{t('home.firstNofTotal', { n: 10, total: songs.length })}</div>
          {librarySongs.length === 0 ? (
            <div style={{ color:'var(--muted)', fontSize:13, textAlign:'center', padding:16 }}>{t('home.noSongsYet')}</div>
          ) : librarySongs.map((s, i) => (
            <div key={s.id} onClick={() => { setPendingOpenSong(s); setPage('library') }} style={{ display:'flex', alignItems:'center', gap:12, padding:'7px 0', borderBottom: i < librarySongs.length-1 ? '1px solid var(--border)' : 'none', cursor:'pointer' }}>
              <div style={{ width:32, height:32, borderRadius:7, background:'var(--bg3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, flexShrink:0 }}>
                {s.tempo==='Fast'?'⚡':s.tempo==='Medium'?'♩':'🎶'}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.title}</div>
                <div style={{ fontSize:11, color:'var(--muted)' }}>{s.artist}</div>
              </div>
              <span className="tag tag-key" style={{ fontSize:10, flexShrink:0 }}>{s.key}</span>
            </div>
          ))}
          {songs.length > 10 && (
            <button className="btn btn-ghost btn-sm" style={{ width:'100%', marginTop:10 }} onClick={()=>setPage('library')}>
              {t('home.moreInLibrary', { n: songs.length - 10 })}
            </button>
          )}
        </div>
      </div>
    </div>
    </div>
  )
}
