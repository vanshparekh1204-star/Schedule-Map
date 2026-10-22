import { Link } from 'react-router'

export function NotFound() {
  return (
    <div className="mx-auto grid max-w-[720px] place-items-center px-6 py-24 text-center">
      <svg viewBox="-60 -60 120 120" className="size-40" aria-hidden="true">
        <circle r="56" fill="var(--surface-2)" stroke="var(--line-strong)" />
        <circle r="46" fill="var(--enamel)" />
        {Array.from({ length: 24 }, (_, i) => (
          <line key={i} x1="0" y1="-42" x2="0" y2={i % 6 ? -39 : -35} stroke="var(--enamel-ink)" strokeOpacity="0.5" transform={`rotate(${i * 15})`} />
        ))}
        {/* The hand has slipped off the dial */}
        <path d="M-1.6 6 L-1 -50 L0 -58 L1 -50 L1.6 6 Z" fill="var(--gold-bright)" stroke="var(--enamel-deep)" strokeWidth="0.6" transform="rotate(200) translate(0 -18)" />
        <circle r="4" fill="var(--gold)" />
      </svg>
      <h1 className="mt-8 font-display text-[44px] leading-tight tracking-[-0.03em]">This page isn’t on the dial.</h1>
      <p className="mt-3 text-[16px] text-ink-soft">The link may be old, or the address has a typo.</p>
      <Link
        to="/"
        className="press mt-8 inline-flex h-11 items-center rounded-full bg-enamel px-6 font-medium text-enamel-ink hover:bg-enamel-deep"
      >
        Go to today
      </Link>
    </div>
  )
}
