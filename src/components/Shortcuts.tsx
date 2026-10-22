import { useEffect } from 'react'
import { useNavigate } from 'react-router'
import { useUI } from '../state/ui'
import { Kbd } from './CommandPalette'
import { Modal } from './ui'

const LIST: [string, string][] = [
  ['N', 'Quick add a task'],
  ['Ctrl K', 'Search and commands'],
  ['T', 'Go to today'],
  ['C', 'Calendar'],
  ['R', 'Rewards'],
  ['I', 'Insights'],
  ['← →', 'Previous or next day, on Today and Calendar'],
  ['?', 'Show this list'],
]

function typing(e: KeyboardEvent) {
  const el = e.target as HTMLElement | null
  return !!el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))
}

/** App-wide keys. Page-specific keys (arrows) are handled by the pages. */
export function useGlobalShortcuts() {
  const navigate = useNavigate()
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const ui = useUI.getState()
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        ui.setPalette(!ui.palette)
        return
      }
      if (e.ctrlKey || e.metaKey || e.altKey || typing(e)) return
      if (ui.composer || ui.quickAdd || ui.palette || ui.shortcuts) return
      if (document.querySelector('[role="dialog"]')) return
      const k = e.key.toLowerCase()
      if (k === 'n') {
        e.preventDefault()
        ui.openQuickAdd()
      } else if (k === 't') navigate('/')
      else if (k === 'c') navigate('/calendar')
      else if (k === 'r') navigate('/rewards')
      else if (k === 'i') navigate('/insights')
      else if (e.key === '?') ui.setShortcuts(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate])
}

export function useArrowKeys(onLeft: () => void, onRight: () => void) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (typing(e) || e.ctrlKey || e.metaKey || e.altKey) return
      if (document.querySelector('[role="dialog"]')) return
      if (e.key === 'ArrowLeft') onLeft()
      else if (e.key === 'ArrowRight') onRight()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onLeft, onRight])
}

export function ShortcutsSheet() {
  const open = useUI((s) => s.shortcuts)
  const setOpen = useUI((s) => s.setShortcuts)
  return (
    <Modal open={open} onOpenChange={setOpen} title="Keyboard shortcuts">
      <ul className="grid gap-1 px-6 pt-3 pb-6">
        {LIST.map(([k, label]) => (
          <li key={k} className="flex items-center justify-between gap-4 border-b border-line py-2.5 text-[15px] last:border-0">
            <span>{label}</span>
            <span className="flex gap-1">
              {k.split(' ').map((part) => (
                <Kbd key={part}>{part}</Kbd>
              ))}
            </span>
          </li>
        ))}
      </ul>
    </Modal>
  )
}
