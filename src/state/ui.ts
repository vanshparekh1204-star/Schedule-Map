import { create } from 'zustand'
import type { DateStr, Task } from '../lib/types'

export interface Toast {
  id: number
  message: string
  action?: { label: string; run: () => void }
}

/** What the task editor opens with: an existing task, or a draft for a new one. */
export type ComposerTarget = { mode: 'edit'; task: Task } | { mode: 'new'; draft?: Partial<Task>; date?: DateStr }

interface UIState {
  composer: ComposerTarget | null
  quickAdd: { date?: DateStr } | null
  palette: boolean
  shortcuts: boolean
  hovered: string | null
  toasts: Toast[]
  openComposer: (t: ComposerTarget) => void
  closeComposer: () => void
  openQuickAdd: (date?: DateStr) => void
  closeQuickAdd: () => void
  setPalette: (open: boolean) => void
  setShortcuts: (open: boolean) => void
  setHovered: (key: string | null) => void
  toast: (message: string, action?: Toast['action']) => void
  dismiss: (id: number) => void
}

let nextId = 1

export const useUI = create<UIState>((set, get) => ({
  composer: null,
  quickAdd: null,
  palette: false,
  shortcuts: false,
  hovered: null,
  toasts: [],
  openComposer: (composer) => set({ composer, quickAdd: null, palette: false }),
  closeComposer: () => set({ composer: null }),
  openQuickAdd: (date) => set({ quickAdd: { date }, palette: false }),
  closeQuickAdd: () => set({ quickAdd: null }),
  setPalette: (palette) => set({ palette }),
  setShortcuts: (shortcuts) => set({ shortcuts }),
  setHovered: (hovered) => set({ hovered }),
  toast: (message, action) => {
    const id = nextId++
    set({ toasts: [...get().toasts.slice(-2), { id, message, action }] })
    setTimeout(() => get().dismiss(id), action ? 6000 : 3500)
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}))
