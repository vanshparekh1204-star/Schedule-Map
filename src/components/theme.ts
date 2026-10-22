import { useSyncExternalStore } from 'react'

export type Theme = 'system' | 'light' | 'dark'

const KEY = 'dsm-theme'
const listeners = new Set<() => void>()

function read(): Theme {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '"system"')
    return v === 'light' || v === 'dark' ? v : 'system'
  } catch {
    return 'system'
  }
}

/** Theme lives in localStorage so the page can paint in the right colours before React loads. */
export function setTheme(t: Theme) {
  try {
    localStorage.setItem(KEY, JSON.stringify(t))
  } catch {
    // Storage blocked: the choice just won't persist.
  }
  if (t === 'system') delete document.documentElement.dataset.theme
  else document.documentElement.dataset.theme = t
  listeners.forEach((l) => l())
}

export function useTheme(): Theme {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    read,
  )
}
