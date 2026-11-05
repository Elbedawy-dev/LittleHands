import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext({
  theme: 'light',
  isDark: false,
  setTheme: () => {},
  toggleTheme: () => {},
})

const THEME_KEY = 'lh_theme'

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    try {
      if (typeof window !== 'undefined') {
        const urlTheme = new URLSearchParams(window.location.search).get('theme')
        if (urlTheme === 'dark' || urlTheme === 'light' || urlTheme === 'system') {
          return urlTheme
        }
      }
      return localStorage.getItem(THEME_KEY) || 'light'
    } catch {
      return 'light'
    }
  })

  const [resolvedDark, setResolvedDark] = useState(false)

  useEffect(() => {
    const root = document.documentElement
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)')

    const applyTheme = () => {
      const isDark = theme === 'system' ? prefersDark.matches : theme === 'dark'

      setResolvedDark(isDark)
      if (isDark) {
        root.classList.add('dark')
      } else {
        root.classList.remove('dark')
      }
    }

    applyTheme()

    try {
      localStorage.setItem(THEME_KEY, theme)
    } catch {
      // ignore
    }

    const listener = () => {
      if (theme === 'system') applyTheme()
    }
    prefersDark.addEventListener('change', listener)
    return () => prefersDark.removeEventListener('change', listener)
  }, [theme])

  const setTheme = (newTheme) => {
    setThemeState(newTheme)
  }

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }

  return (
    <ThemeContext.Provider value={{ theme, isDark: resolvedDark, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
