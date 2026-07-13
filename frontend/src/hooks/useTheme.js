import { useCallback, useEffect, useState } from 'react'
import { STORAGE_KEYS } from '../constants/storageKeys.js'

const readTheme = () => document.documentElement.getAttribute('data-theme') || 'dark'

// O primeiro paint do meta theme-color é responsabilidade do script inline
// do index.html; aqui só acompanhamos o toggle em runtime
const syncMetaThemeColor = () => {
  const meta = document.querySelector('meta[name="theme-color"]')
  if (!meta) return
  const background = getComputedStyle(document.documentElement).getPropertyValue('--background').trim()
  if (background) meta.setAttribute('content', background)
}

const applyTheme = (theme) => {
  document.documentElement.setAttribute('data-theme', theme)
  syncMetaThemeColor()
  try {
    localStorage.setItem(STORAGE_KEYS.THEME, theme)
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
