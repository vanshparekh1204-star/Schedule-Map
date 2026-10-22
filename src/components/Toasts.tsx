import { AnimatePresence, motion } from 'motion/react'
import { useUI } from '../state/ui'

export function Toasts() {
  const toasts = useUI((s) => s.toasts)
  const dismiss = useUI((s) => s.dismiss)
  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-[calc(76px+env(safe-area-inset-bottom))] z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-6"
      aria-live="polite"
    >
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            className="pointer-events-auto flex max-w-[520px] items-center gap-4 rounded-2xl bg-enamel py-2.5 pr-2.5 pl-4 text-[14.5px] text-enamel-ink shadow-[var(--shadow-float)]"
          >
            <span>{t.message}</span>
            {t.action && (
              <button
                type="button"
                onClick={() => {
                  t.action!.run()
                  dismiss(t.id)
                }}
                className="press shrink-0 rounded-full bg-enamel-ink/10 px-3 py-1 font-semibold text-gold-bright hover:bg-enamel-ink/20"
              >
                {t.action.label}
              </button>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
