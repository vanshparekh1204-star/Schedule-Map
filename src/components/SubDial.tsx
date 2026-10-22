import { memo } from 'react'
import { cx } from './ui'

/**
 * The small dial used for each calendar day. Past days show how much was kept as a
 * gold arc; future days show one tick per planned task.
 */
export const SubDial = memo(function SubDial({
  day,
  planned,
  done,
  future,
  today,
  size = 44,
}: {
  day: number
  planned: number
  done: number
  future: boolean
  today: boolean
  size?: number
}) {
  const r = 17
  const share = planned ? done / planned : 0
  const ticks = future ? Math.min(planned, 24) : 0
  return (
    <svg viewBox="-22 -22 44 44" aria-hidden="true" className="block h-auto w-full" style={{ maxWidth: size }}>
      <circle r="21" fill={today ? 'var(--enamel)' : 'transparent'} />
      <circle r={r} fill="none" stroke={today ? 'var(--enamel-ink)' : 'var(--ink)'} strokeOpacity={planned ? 0.14 : 0.06} strokeWidth="2.5" />
      {!future && share > 0 && (
        <circle
          r={r}
          fill="none"
          stroke={today ? 'var(--gold-bright)' : 'var(--gold)'}
          strokeWidth="2.5"
          strokeLinecap={share >= 1 ? 'butt' : 'round'}
          pathLength={100}
          strokeDasharray={`${share * 100} 100`}
          transform="rotate(-90)"
        />
      )}
      {Array.from({ length: ticks }, (_, i) => (
        <line
          key={i}
          x1="0"
          y1={-r - 1.2}
          x2="0"
          y2={-r + 1.2}
          stroke={today ? 'var(--enamel-ink)' : 'var(--ink)'}
          strokeOpacity="0.5"
          strokeWidth="1.2"
          transform={`rotate(${(i / ticks) * 360})`}
        />
      ))}
      <text
        y="0.36em"
        textAnchor="middle"
        fontSize="13"
        className={cx('font-display')}
        fill={today ? 'var(--enamel-ink)' : share >= 1 && !future ? 'var(--gold-text)' : 'var(--ink)'}
      >
        {day}
      </text>
    </svg>
  )
})
