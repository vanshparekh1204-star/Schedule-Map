import { memo, useMemo, useRef } from 'react'
import { timeToMin } from '../lib/dates'
import { fmtTime } from '../lib/format'
import { PART_HOURS, PART_LABEL, type Occurrence } from '../lib/recurrence'
import type { PartOfDay } from '../lib/types'

/*
  A 24-hour dial in an antique case. Noon sits at the top like the sun,
  midnight at the bottom, and the porcelain chapter ring counts I–XII twice,
  as old astronomical clocks do. Timed tasks are arcs on up to three lanes;
  untimed ones are jewels set in their part of the day; "any time" tasks
  circle the centre.
*/

const FACE = 170
const LANES = [142, 126, 110]
const JEWEL_R = 90
const ANYTIME_R = 68
/** Radius of the fixed centre plate. */
const PLATE = 50
/** Outer edge of the porcelain chapter ring; the brass case runs from here to the rim. */
const RING = 191
const RIM = 198
const RUBY = '#d4566a'
const ROMAN = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI']

/** Degrees clockwise from the top for a minute of the day. */
const angleOf = (min: number) => ((min / 1440) * 360 + 180) % 360

function polar(r: number, deg: number): [number, number] {
  const rad = (deg * Math.PI) / 180
  return [r * Math.sin(rad), -r * Math.cos(rad)]
}

function arcPath(r: number, fromDeg: number, toDeg: number): string {
  let sweep = (toDeg - fromDeg + 360) % 360
  if (sweep === 0) sweep = 359.99
  const [x1, y1] = polar(r, fromDeg)
  const [x2, y2] = polar(r, fromDeg + sweep)
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${sweep > 180 ? 1 : 0} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`
}

/** Engraved rosette for the dial face, built once. */
const GUILLOCHE = (() => {
  const curves: string[] = []
  const n = 30
  const steps = 96
  for (let k = 0; k < n; k++) {
    const phase = (k / n) * Math.PI * 2
    let d = ''
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * Math.PI * 2
      const r = 118 + 38 * Math.sin(6 * t + phase)
      d += `${i ? 'L' : 'M'}${(r * Math.sin(t)).toFixed(1)} ${(-r * Math.cos(t)).toFixed(1)}`
    }
    curves.push(d + 'Z')
  }
  return curves.join('')
})()

const SUNBURST = (() => {
  let d = ''
  for (let i = 0; i < 144; i++) {
    const a = (i / 144) * 360
    const [x1, y1] = polar(26, a)
    const [x2, y2] = polar(FACE, a)
    d += `M${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}`
  }
  return d
})()

interface Placed {
  occ: Occurrence
  kind: 'arc' | 'jewel'
  /** For arcs. */
  lane?: number
  from?: number
  to?: number
  /** For jewels. */
  at?: number
  r?: number
}

function layout(occs: Occurrence[]): Placed[] {
  const placed: Placed[] = []
  const laneEnds = LANES.map(() => -Infinity)
  const timed = occs.filter((o) => o.time).sort((a, b) => timeToMin(a.time!) - timeToMin(b.time!))
  for (const occ of timed) {
    const start = timeToMin(occ.time!)
    const end = start + Math.max(occ.task.durationMin ?? 30, 20)
    let lane = laneEnds.findIndex((e) => e + 8 <= start)
    if (lane === -1) lane = LANES.length - 1
    laneEnds[lane] = Math.max(laneEnds[lane], end)
    placed.push({ occ, kind: 'arc', lane, from: angleOf(start), to: angleOf(end) })
  }

  const byPart = new Map<PartOfDay, Occurrence[]>()
  for (const o of occs) {
    if (o.time) continue
    byPart.set(o.task.part, [...(byPart.get(o.task.part) ?? []), o])
  }
  for (const [part, list] of byPart) {
    if (part === 'anytime') {
      list.forEach((occ, i) => placed.push({ occ, kind: 'jewel', at: (i / list.length) * 360, r: ANYTIME_R }))
      continue
    }
    const [h1, h2] = PART_HOURS[part]
    const span = (h2 - h1) * 60
    list.forEach((occ, i) => {
      const min = h1 * 60 + ((i + 1) * span) / (list.length + 1)
      placed.push({ occ, kind: 'jewel', at: angleOf(min), r: JEWEL_R })
    })
  }
  return placed
}

interface Props {
  occurrences: Occurrence[]
  /** Minute of the day for the hand, or null to hide it (not today). */
  nowMin: number | null
  heading: string
  hovered: string | null
  onHover: (key: string | null) => void
  onToggle: (occ: Occurrence) => void
}

export const DayDial = memo(function DayDial({ occurrences, nowMin, heading, hovered, onHover, onToggle }: Props) {
  const placed = useMemo(() => layout(occurrences), [occurrences])
  // Only glint for tasks seen open during this visit, not for ones already kept on arrival.
  const armed = useRef(new Set<string>()).current
  for (const o of occurrences) if (o.status !== 'done') armed.add(o.key)
  const counted = occurrences.filter((o) => o.status !== 'skipped')
  const done = counted.filter((o) => o.status === 'done').length
  const total = counted.length
  const share = total ? done / total : 0
  const closed = total > 0 && done === total

  const label = total
    ? `${heading}: ${done} of ${total} kept.`
    : `${heading}: nothing planned.`

  return (
    <svg
      viewBox="-206 -204 412 422"
      className="block h-auto w-full select-none"
      role="img"
      aria-label={label}
    >
      <defs>
        <radialGradient id="dial-face" cx="0" cy="-40" r="230" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="var(--enamel)" stopOpacity="0.82" />
          <stop offset="0.55" stopColor="var(--enamel)" />
          <stop offset="1" stopColor="var(--enamel-deep)" />
        </radialGradient>
        <linearGradient id="dial-gold" x1="-200" y1="-200" x2="200" y2="200" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="var(--gold-bright)" />
          <stop offset="0.5" stopColor="var(--gold)" />
          <stop offset="1" stopColor="var(--gold-bright)" />
        </linearGradient>
        <linearGradient id="dial-brass" x1="-160" y1="-200" x2="160" y2="200" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="var(--gold-bright)" />
          <stop offset="0.35" stopColor="var(--gold)" />
          <stop offset="0.6" stopColor="var(--brass-shade)" />
          <stop offset="0.85" stopColor="var(--gold)" />
          <stop offset="1" stopColor="var(--gold-bright)" />
        </linearGradient>
        {/* Porcelain yellows towards its edges with age */}
        <radialGradient id="dial-porcelain" r={RING} cx="0" cy="0" gradientUnits="userSpaceOnUse">
          <stop offset={FACE / RING} stopColor="var(--porcelain-edge)" />
          <stop offset={(FACE + 5) / RING} stopColor="var(--porcelain)" />
          <stop offset="0.95" stopColor="var(--porcelain)" />
          <stop offset="1" stopColor="var(--porcelain-edge)" />
        </radialGradient>
        {/* Foxing: sparse sepia specks clipped to whatever the filter is applied to */}
        <filter id="dial-age" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="3" seed="11" result="noise" />
          <feColorMatrix
            in="noise"
            type="matrix"
            values="0 0 0 0 0.42  0 0 0 0 0.3  0 0 0 0 0.14  1.6 0 0 0 -0.78"
            result="specks"
          />
          <feComposite in="specks" in2="SourceGraphic" operator="in" />
        </filter>
        <filter id="dial-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="rgb(18 36 72)" floodOpacity="0.3" />
        </filter>
      </defs>

      {/* Brass case, reeded like a pocket-watch bezel */}
      <circle r={RIM} fill="url(#dial-brass)" filter="url(#dial-shadow)" />
      <Reeding />
      <circle r={RIM - 0.5} fill="none" stroke="var(--brass-shade)" strokeOpacity="0.8" strokeWidth="1" />

      {/* Porcelain chapter ring */}
      <circle r={(RING + FACE) / 2} fill="none" stroke="url(#dial-porcelain)" strokeWidth={RING - FACE} />
      <circle
        r={(RING + FACE) / 2}
        fill="none"
        stroke="#000"
        strokeWidth={RING - FACE}
        filter="url(#dial-age)"
        opacity="0.5"
        aria-hidden="true"
      />
      <circle r={RING} fill="none" stroke="var(--brass-shade)" strokeWidth="1.2" />
      <ChapterRing />

      {/* Face */}
      <circle r={FACE} fill="url(#dial-face)" />
      <path d={SUNBURST} stroke="var(--enamel-ink)" strokeOpacity="0.035" strokeWidth="0.6" fill="none" />
      <path d={GUILLOCHE} stroke="var(--enamel-ink)" strokeOpacity="0.07" strokeWidth="0.5" fill="none" />
      <PartLabels />

      {/* Lane guides */}
      {LANES.map((r) => (
        <circle key={r} r={r} fill="none" stroke="var(--enamel-ink)" strokeOpacity="0.07" strokeWidth="11" />
      ))}

      {/* Power reserve: a gold ring that closes as the day is kept */}
      <circle r={FACE - 2} fill="none" stroke="var(--enamel-ink)" strokeOpacity="0.1" strokeWidth="3" />
      {share > 0 && (
        <circle
          r={FACE - 2}
          fill="none"
          stroke="url(#dial-gold)"
          strokeWidth="3"
          strokeLinecap={closed ? 'butt' : 'round'}
          pathLength={1000}
          strokeDasharray={`${share * 1000} 1000`}
          transform="rotate(-90)"
        />
      )}

      {placed.map((p) =>
        p.kind === 'arc' ? (
          <TaskArc
            key={p.occ.key}
            p={p}
            glint={armed.has(p.occ.key)}
            hovered={hovered === p.occ.key}
            onHover={onHover}
            onToggle={onToggle}
          />
        ) : (
          <Jewel
            key={p.occ.key}
            p={p}
            glint={armed.has(p.occ.key)}
            hovered={hovered === p.occ.key}
            onHover={onHover}
            onToggle={onToggle}
          />
        ),
      )}

      {nowMin !== null && <Hand deg={angleOf(nowMin)} />}

      {/* Centre plate: fixed, like the date disc on a world-time watch, so the hand never crosses the figures */}
      <circle r={PLATE} fill="var(--enamel-deep)" />
      <circle r={PLATE} fill="none" stroke="url(#dial-gold)" strokeOpacity="0.7" strokeWidth="1" />
      <text y="-20" textAnchor="middle" className="font-display" fontSize="11.5" fill="var(--enamel-ink-soft)">
        {heading}
      </text>
      <text
        y="13"
        textAnchor="middle"
        className="font-display"
        fontSize={total ? 34 : 30}
        fill={closed ? 'var(--gold-bright)' : 'var(--enamel-ink)'}
      >
        {total ? `${done}/${total}` : '0'}
      </text>
      <text y="31" textAnchor="middle" fontSize="9.5" fill="var(--enamel-ink-soft)" letterSpacing="0.04em">
        {total ? (closed ? 'all kept' : 'kept') : 'nothing planned'}
      </text>
    </svg>
  )
})

/** Fine vertical grooves around the brass case. */
const REEDS = (() => {
  let d = ''
  for (let i = 0; i < 240; i++) {
    const a = (i / 240) * 360
    const [x1, y1] = polar(RING + 1.5, a)
    const [x2, y2] = polar(RIM - 1.5, a)
    d += `M${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}`
  }
  return d
})()

function Reeding() {
  return <path d={REEDS} stroke="var(--brass-shade)" strokeOpacity="0.35" strokeWidth="0.7" fill="none" aria-hidden="true" />
}

/** Railway minute track and Roman hours, I–XII for the morning and again for the afternoon. */
function ChapterRing() {
  const inner = FACE + 2.5
  const outer = FACE + 7.5
  const ticks: React.ReactNode[] = []
  for (let q = 0; q < 96; q++) {
    const deg = (q / 96) * 360
    const hour = q % 4 === 0
    const [x1, y1] = polar(inner, deg)
    const [x2, y2] = polar(outer, deg)
    ticks.push(
      <line
        key={q}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke="var(--porcelain-ink)"
        strokeOpacity={hour ? 0.85 : 0.45}
        strokeWidth={hour ? 1.6 : 0.6}
      />,
    )
  }
  const numerals = Array.from({ length: 24 }, (_, h) => {
    const deg = angleOf(h * 60)
    const [x, y] = polar((outer + RING) / 2, deg)
    // Numerals run around the ring; the lower half turns over so none read upside down.
    const lower = deg > 90 && deg < 270
    const twelve = h % 12 === 0
    return (
      <text
        key={h}
        x={x}
        y={y}
        dy="0.35em"
        textAnchor="middle"
        className="font-display"
        fontSize={twelve ? 13 : 10.5}
        letterSpacing="0.02em"
        fill="var(--porcelain-ink)"
        transform={`rotate(${(lower ? deg + 180 : deg).toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)})`}
      >
        {ROMAN[h % 12]}
      </text>
    )
  })
  return (
    <g aria-hidden="true">
      <circle r={inner} fill="none" stroke="var(--porcelain-ink)" strokeOpacity="0.7" strokeWidth="0.6" />
      <circle r={outer} fill="none" stroke="var(--porcelain-ink)" strokeOpacity="0.7" strokeWidth="0.6" />
      {ticks}
      {numerals}
    </g>
  )
}

function PartLabels() {
  const parts: Exclude<PartOfDay, 'anytime'>[] = ['morning', 'afternoon', 'evening', 'night']
  return (
    <g aria-hidden="true">
      {parts.map((part) => {
        const [h1, h2] = PART_HOURS[part]
        const mid = ((h1 + h2) / 2) * 60
        // Labels on the lower half would read upside down along the arc, so flip them onto a reversed path.
        const deg = angleOf(mid)
        const lower = deg > 90 && deg < 270
        const r = lower ? 162 : 155
        const from = angleOf(h1 * 60)
        const to = angleOf(h2 * 60)
        const d = lower ? reversedArc(r, from, to) : arcPath(r, from, to)
        const [bx1, by1] = polar(FACE - 6, from)
        const [bx2, by2] = polar(LANES[LANES.length - 1] - 9, from)
        return (
          <g key={part}>
            <line x1={bx1} y1={by1} x2={bx2} y2={by2} stroke="var(--enamel-ink)" strokeOpacity="0.16" strokeWidth="0.8" />
            <path id={`part-${part}`} d={d} fill="none" />
            <text fontSize="8.5" fill="var(--enamel-ink-soft)" letterSpacing="0.08em">
              <textPath href={`#part-${part}`} startOffset="50%" textAnchor="middle">
                {PART_LABEL[part].toLowerCase()}
              </textPath>
            </text>
          </g>
        )
      })}
    </g>
  )
}

function reversedArc(r: number, fromDeg: number, toDeg: number): string {
  const sweep = (toDeg - fromDeg + 360) % 360
  const [x1, y1] = polar(r, toDeg)
  const [x2, y2] = polar(r, fromDeg)
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${sweep > 180 ? 1 : 0} 0 ${x2.toFixed(2)} ${y2.toFixed(2)}`
}

interface ItemProps {
  p: Placed
  glint: boolean
  hovered: boolean
  onHover: (key: string | null) => void
  onToggle: (occ: Occurrence) => void
}

function tip(o: Occurrence) {
  const when = o.time ? fmtTime(o.time) : PART_LABEL[o.task.part]
  const state = o.status === 'done' ? 'kept' : o.status === 'skipped' ? 'skipped' : 'open'
  return `${o.task.title}, ${when}, ${state}`
}

function TaskArc({ p, glint, hovered, onHover, onToggle }: ItemProps) {
  const { occ } = p
  const r = LANES[p.lane!]
  const d = arcPath(r, p.from!, p.to!)
  const done = occ.status === 'done'
  const skipped = occ.status === 'skipped'
  const high = occ.task.priority === 'high'
  const [sx, sy] = polar(r, p.from!)
  const [ex, ey] = polar(r, p.to!)
  return (
    <g
      className="cursor-pointer"
      onPointerEnter={() => onHover(occ.key)}
      onPointerLeave={() => onHover(null)}
      onClick={() => onToggle(occ)}
    >
      <title>{tip(occ)}</title>
      {/* Wide invisible hit area */}
      <path d={d} stroke="transparent" strokeWidth="18" fill="none" />
      {hovered && <path d={d} stroke="var(--enamel-ink)" strokeOpacity="0.28" strokeWidth="17" strokeLinecap="round" fill="none" />}
      <path
        d={d}
        fill="none"
        strokeLinecap="round"
        strokeWidth="9"
        stroke="var(--enamel-ink)"
        strokeOpacity={skipped ? 0.22 : 0.42}
        strokeDasharray={skipped ? '2 5' : undefined}
      />
      <path
        d={d}
        fill="none"
        strokeLinecap="round"
        strokeWidth="9"
        stroke="url(#dial-gold)"
        style={{ opacity: done ? 1 : 0, transition: 'opacity 420ms var(--ease-calm)' }}
      />
      {high && !done && <circle cx={sx} cy={sy} r="3" fill={RUBY} />}
      {done && glint && <Spark x={ex} y={ey} />}
    </g>
  )
}

function Jewel({ p, glint, hovered, onHover, onToggle }: ItemProps) {
  const { occ } = p
  const [x, y] = polar(p.r!, p.at!)
  const done = occ.status === 'done'
  const skipped = occ.status === 'skipped'
  const high = occ.task.priority === 'high'
  return (
    <g
      className="cursor-pointer"
      onPointerEnter={() => onHover(occ.key)}
      onPointerLeave={() => onHover(null)}
      onClick={() => onToggle(occ)}
    >
      <title>{tip(occ)}</title>
      <circle cx={x} cy={y} r="13" fill="transparent" />
      {hovered && <circle cx={x} cy={y} r="11" fill="var(--enamel-ink)" fillOpacity="0.16" />}
      <circle
        cx={x}
        cy={y}
        r="6.5"
        fill="none"
        stroke="var(--enamel-ink)"
        strokeOpacity={skipped ? 0.25 : 0.55}
        strokeWidth="1.4"
        strokeDasharray={skipped ? '1.5 2.5' : undefined}
      />
      <circle
        cx={x}
        cy={y}
        r="6.5"
        fill="url(#dial-gold)"
        style={{ opacity: done ? 1 : 0, transition: 'opacity 420ms var(--ease-calm)' }}
      />
      {high && <circle cx={x} cy={y} r="2.4" fill={done ? 'var(--enamel-deep)' : RUBY} />}
      {done && glint && <Spark x={x} y={y} />}
    </g>
  )
}

/** A brief gold glint where something was just kept. */
function Spark({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`} style={{ pointerEvents: 'none' }}>
      <circle r="10" fill="none" stroke="var(--gold-bright)" strokeWidth="1.5" className="dial-spark" />
    </g>
  )
}

function Hand({ deg }: { deg: number }) {
  return (
    <g aria-hidden="true">
      <g
        style={{
          transform: `rotate(${deg}deg)`,
          transformOrigin: '0px 0px',
          transformBox: 'view-box',
          transition: 'transform 900ms var(--ease-calm)',
        }}
      >
        {/* Gilt Breguet hand: tapered shaft, hollow moon, lance tip. Edged so it reads on the enamel; its root hides under the plate. */}
        <g fill="var(--gold-bright)" stroke="var(--enamel-deep)" strokeWidth="0.8">
          <path d={`M -2.6 ${-PLATE + 6} L -1.4 -125 L 1.4 -125 L 2.6 ${-PLATE + 6} Z`} />
          <path d="M -1.4 -137 L 0 -164 L 1.4 -137 Z" />
        </g>
        <circle cy="-131" r="6" fill="none" stroke="var(--enamel-deep)" strokeWidth="4" />
        <circle cy="-131" r="6" fill="none" stroke="var(--gold-bright)" strokeWidth="2.2" />
        {/* Pointer on the minute track, so the time reads at a glance */}
        <path d="M 0 -171 L -4 -178.5 L 4 -178.5 Z" fill="var(--enamel)" />
      </g>
    </g>
  )
}
