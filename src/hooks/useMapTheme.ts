import { useEffect, useState } from 'react'
import type { MapTheme } from '../map/navigationDomain'

const STORAGE_KEY = 'aahhmap-theme'

function initialTheme(): MapTheme {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return stored === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

export function useMapTheme() {
  const [theme, setTheme] = useState<MapTheme>(initialTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = theme
    try { window.localStorage.setItem(STORAGE_KEY, theme) } catch { /* Storage is optional. */ }
  }, [theme])

  return { theme, setTheme }
}
