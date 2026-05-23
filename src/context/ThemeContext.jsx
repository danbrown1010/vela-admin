import { createContext, useContext, useState, useEffect } from 'react'

const THEMES = ['slate', 'parchment', 'evergreen']
const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('vela-admin-theme') || 'slate')

  useEffect(() => {
    const html = document.documentElement
    THEMES.forEach(t => html.classList.remove(t))
    html.classList.add(theme)
    localStorage.setItem('vela-admin-theme', theme)
  }, [theme])

  const cycleTheme = () => {
    setTheme(t => THEMES[(THEMES.indexOf(t) + 1) % THEMES.length])
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, cycleTheme, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
