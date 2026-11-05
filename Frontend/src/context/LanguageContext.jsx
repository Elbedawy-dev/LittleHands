import { createContext, useContext, useEffect, useState, useTransition } from 'react'
import i18n from '../config/i18n'

const LanguageContext = createContext({
  language: 'ar',
  isRtl: true,
  dir: 'rtl',
  setLanguage: () => {},
  toggleLanguage: () => {},
})

const LANG_KEY = 'lh_lang'

export function LanguageProvider({ children }) {
  const [, startTransition] = useTransition()
  const [language, setLanguageState] = useState(() => {
    try {
      if (typeof window !== 'undefined') {
        const urlLang = new URLSearchParams(window.location.search).get('lang')
        if (urlLang === 'ar' || urlLang === 'en') {
          return urlLang
        }
      }
      return localStorage.getItem(LANG_KEY) || 'ar'
    } catch {
      return 'ar'
    }
  })

  const isRtl = language === 'ar'
  const dir = isRtl ? 'rtl' : 'ltr'

  useEffect(() => {
    const root = document.documentElement
    root.setAttribute('dir', dir)
    root.setAttribute('lang', language)

    document.title =
      language === 'ar'
        ? 'أيدي صغيرة - وسائل تعليمية يدوية لرياض الأطفال'
        : 'Little Hands - Handmade Educational Aids for Nurseries'

    startTransition(() => {
      i18n.changeLanguage(language)
    })

    try {
      localStorage.setItem(LANG_KEY, language)
    } catch {
      // ignore
    }
  }, [language, dir])

  const setLanguage = (lang) => {
    if (lang === 'ar' || lang === 'en') {
      setLanguageState(lang)
    }
  }

  const toggleLanguage = () => {
    setLanguageState((prev) => (prev === 'ar' ? 'en' : 'ar'))
  }

  return (
    <LanguageContext.Provider value={{ language, isRtl, dir, setLanguage, toggleLanguage }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider')
  return ctx
}

