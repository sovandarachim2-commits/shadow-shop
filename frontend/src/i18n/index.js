import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en.json'
import km from './locales/km.json'

const saved = localStorage.getItem('shadow-shop-lang') || 'en'

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      km: { translation: km },
    },
    lng: saved,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  })

i18n.on('languageChanged', (lang) => {
  localStorage.setItem('shadow-shop-lang', lang)
  document.documentElement.lang = lang
})

document.documentElement.lang = saved

export default i18n
