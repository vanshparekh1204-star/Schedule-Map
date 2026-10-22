import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { cx } from './ui'

/** A minted gold coin with an engraved dial on its face. */
export function Coin({ size = 56, className }: { size?: number; className?: string }) {
  const ticks = Array.from({ length: 24 }, (_, i) => i * 15)
  return (
    <svg viewBox="-30 -30 60 60" width={size} height={size} className={className} aria-hidden="true">
      <defs>
        <radialGradient id="coin-face" cx="-8" cy="-10" r="40" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#f0d58f" />
          <stop offset="0.55" stopColor="#c9a04a" />
          <stop offset="1" stopColor="#97722a" />
        </radialGradient>
      </defs>
      <circle r="29" fill="#7d5d1f" />
      <circle r="27.5" fill="url(#coin-face)" />
      <circle r="22" fill="none" stroke="#7d5d1f" strokeOpacity="0.55" strokeWidth="0.8" />
      {ticks.map((a) => (
        <line
          key={a}
          x1="0"
          y1="-24.5"
          x2="0"
          y2={a % 90 === 0 ? -21 : -22.6}
          stroke="#6d5019"
          strokeOpacity="0.6"
          strokeWidth={a % 90 === 0 ? 1.2 : 0.6}
          transform={`rotate(${a})`}
        />
      ))}
      <path d="M0 -12 L7 0 L0 12 L-7 0 Z" fill="none" stroke="#6d5019" strokeOpacity="0.7" strokeWidth="1" />
      <circle r="2" fill="#6d5019" fillOpacity="0.7" />
      <ellipse cx="-9" cy="-14" rx="9" ry="4" fill="#fff8e0" fillOpacity="0.28" transform="rotate(-30 -9 -14)" />
    </svg>
  )
}

function Socket({ size }: { size: number }) {
  return (
    <svg viewBox="-30 -30 60 60" width={size} height={size} aria-hidden="true">
      <circle r="27.5" fill="none" stroke="var(--line-strong)" strokeWidth="1.4" strokeDasharray="3 4" />
    </svg>
  )
}

/** Available coins stacked like a fanned pile, the top one flips away when used. Spent ones leave empty sockets. */
export function CoinStack({ available, spent, size = 56 }: { available: number; spent: number; size?: number }) {
  const reduce = useReducedMotion()
  const overlap = Math.round(size * 0.42)
  return (
    <div className="flex items-center" style={{ perspective: 600 }}>
      <AnimatePresence initial={false}>
        {Array.from({ length: available }, (_, i) => (
          <motion.div
            key={`coin-${i}`}
            className={cx('relative drop-shadow-[0_4px_6px_rgb(60_40_5/0.28)]')}
            style={{ marginLeft: i === 0 ? 0 : -overlap, zIndex: i }}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: -18, rotateY: -90 }}
            animate={{ opacity: 1, y: 0, rotateY: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -28, rotateY: 90, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
          >
            <Coin size={size} />
          </motion.div>
        ))}
      </AnimatePresence>
      {Array.from({ length: Math.min(spent, 12) }, (_, i) => (
        <div key={`socket-${i}`} style={{ marginLeft: available === 0 && i === 0 ? 0 : -overlap * 0.6 }}>
          <Socket size={size} />
        </div>
      ))}
    </div>
  )
}
