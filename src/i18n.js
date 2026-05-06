import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import en from './locales/en.json'
import es from './locales/es.json'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      es: { translation: es },
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'es'],
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'wf_language',
    },
  })

const LOCALE_MAP = { en: 'en-US', es: 'es-ES' }
export const dateLocale = (lang) => LOCALE_MAP[lang] || 'en-US'

export const capDateWords = (str) =>
  str.replace(/\b[a-záéíóúüñ]{3,}/gi, w => w.charAt(0).toUpperCase() + w.slice(1))

export default i18n
