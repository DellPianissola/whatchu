import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'theme'

const readTheme = () => document.documentElement.getAttribute('data-theme') || 'dark'

const applyTheme = (theme) => {
  document.documentElement.setAttribute('data-theme', theme)
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // localStorage indisponível — tema persiste só na sessão
  }
}

// Tema é aplicado no <html> por script inline em index.html antes do React montar
// (evita flash). Aqui só sincronizamos o estado React e expomos toggle.
export const useTheme = () => {
  const [theme, setTheme] = useState(readTheme)

  useEffect(() => {
    if (readTheme() !== theme) {
      applyTheme(theme)
    }
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }, [])

  return { theme, toggleTheme }
}
