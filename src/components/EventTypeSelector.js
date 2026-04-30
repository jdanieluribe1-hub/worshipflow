import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'

export const EVENT_TYPES = [
  { key: 'sunday_service',  en: 'Sunday Service',      es: 'Servicio Dominical' },
  { key: 'midweek_service', en: 'Midweek Service',     es: 'Servicio Entre Semana' },
  { key: 'youth_service',   en: 'Youth Service',       es: 'Servicio de Jóvenes' },
  { key: 'prayer_meeting',  en: 'Prayer Meeting',      es: 'Reunión de Oración' },
  { key: 'special_event',   en: 'Special Event',       es: 'Evento Especial' },
  { key: 'bible_study',     en: 'Bible Study',         es: 'Estudio Bíblico' },
]

export function getEventLabel(value, lang = 'en') {
  if (!value) return ''
  const found = EVENT_TYPES.find(e => e.key === value)
  if (found) return lang === 'es' ? found.es : found.en
  // Legacy time format — display as-is
  if (/^\d{1,2}:\d{2}$/.test(value)) {
    try { return new Date('2000-01-01T' + value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) } catch { return value }
  }
  return value
}

export function isPresetEvent(value) {
  return EVENT_TYPES.some(e => e.key === value)
}

export default function EventTypeSelector({ value, onChange, lang, selectStyle = {}, inputStyle = {} }) {
  const { i18n } = useTranslation()
  const effectiveLang = lang || (i18n.language.startsWith('es') ? 'es' : 'en')
  const isCustomInitial = !!value && !isPresetEvent(value) && !/^\d{1,2}:\d{2}$/.test(value)
  const [showCustom, setShowCustom] = useState(isCustomInitial)
  const [customText, setCustomText] = useState(isCustomInitial ? value : '')

  const selectValue = showCustom ? '__custom__' : (value || '')

  const labels = {
    placeholder: effectiveLang === 'es' ? 'Seleccionar evento...' : 'Select event...',
    customInput: effectiveLang === 'es' ? 'Nombre del evento...' : 'Event name...',
    addCustom: effectiveLang === 'es' ? '+ Añadir evento personalizado' : '+ Add custom event',
  }

  function handleSelect(e) {
    const v = e.target.value
    if (v === '__custom__') {
      setShowCustom(true)
      onChange(customText || '')
    } else {
      setShowCustom(false)
      setCustomText('')
      onChange(v)
    }
  }

  function handleCustomInput(e) {
    setCustomText(e.target.value)
    onChange(e.target.value)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <select value={selectValue} onChange={handleSelect} style={selectStyle}>
        <option value="">{labels.placeholder}</option>
        {EVENT_TYPES.map(et => (
          <option key={et.key} value={et.key}>{effectiveLang === 'es' ? et.es : et.en}</option>
        ))}
        <option disabled style={{ color: 'var(--border)' }}>──────────────</option>
        <option value="__custom__">{labels.addCustom}</option>
      </select>
      {showCustom && (
        <input
          type="text"
          value={customText}
          onChange={handleCustomInput}
          placeholder={labels.customInput}
          autoFocus
          style={inputStyle}
        />
      )}
    </div>
  )
}
