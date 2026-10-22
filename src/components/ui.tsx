import * as Dialog from '@radix-ui/react-dialog'
import * as Popover from '@radix-ui/react-popover'
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(' ')
}

type Variant = 'primary' | 'quiet' | 'outline' | 'danger' | 'gold'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-enamel text-enamel-ink hover:bg-enamel-deep shadow-[var(--shadow-raised)]',
  gold: 'bg-gold text-[#1b1606] hover:bg-gold-bright shadow-[var(--shadow-raised)]',
  outline: 'border border-line-strong text-ink hover:bg-surface-2 hover:border-ink-faint',
  quiet: 'text-ink-soft hover:text-ink hover:bg-surface-2',
  danger: 'text-oxblood hover:bg-oxblood/10',
}

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md' | 'lg' }
>(function Button({ variant = 'outline', size = 'md', className, ...rest }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      className={cx(
        'press inline-flex items-center justify-center gap-2 rounded-full font-medium whitespace-nowrap',
        'disabled:pointer-events-none disabled:opacity-45',
        size === 'sm' && 'h-8 px-3.5 text-[13.5px]',
        size === 'md' && 'h-10 px-5 text-[15px]',
        size === 'lg' && 'h-12 px-6 text-base',
        VARIANTS[variant],
        className,
      )}
      {...rest}
    />
  )
})

export function Chip({
  pressed,
  onClick,
  children,
  className,
  title,
}: {
  pressed: boolean
  onClick: () => void
  children: ReactNode
  className?: string
  title?: string
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      title={title}
      className={cx(
        'press inline-flex h-9 min-w-9 items-center justify-center rounded-full px-3.5 text-[14px] font-medium',
        pressed
          ? 'bg-enamel text-enamel-ink shadow-[var(--shadow-raised)]'
          : 'border border-line-strong text-ink-soft hover:border-ink-faint hover:text-ink',
        className,
      )}
    >
      {children}
    </button>
  )
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  className,
}: {
  value: T
  options: { value: T; label: ReactNode }[]
  onChange: (v: T) => void
  label: string
  className?: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cx('inline-flex flex-wrap rounded-full bg-surface p-1 ring-1 ring-line', className)}>
      {options.map((o) => {
        const on = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={cx(
              'press h-8 rounded-full px-3.5 text-[14px] font-medium',
              on ? 'bg-surface-2 text-ink shadow-[var(--shadow-raised)]' : 'text-ink-soft hover:text-ink',
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

export function Field({ label, hint, children, htmlFor }: { label: string; hint?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="grid gap-2">
      <label htmlFor={htmlFor} className="text-[14px] font-semibold text-ink">
        {label}
        {hint && <span className="ml-2 font-normal text-ink-faint">{hint}</span>}
      </label>
      {children}
    </div>
  )
}

export const inputClass =
  'h-10 w-full rounded-xl border border-line-strong bg-surface-2 px-3.5 text-[15px] text-ink placeholder:text-ink-faint hover:border-ink-faint focus-visible:border-steel focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-steel/30'

/** Side sheet on wide screens, bottom sheet on phones. */
export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  wide,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="sheet-overlay fixed inset-0 z-40 bg-[#0b1220]/55" />
        <Dialog.Content
          className={cx(
            'sheet fixed z-50 flex flex-col bg-bg shadow-[var(--shadow-float)] outline-none',
            'inset-x-0 bottom-0 max-h-[92dvh] rounded-t-[28px]',
            'md:inset-y-3 md:right-3 md:left-auto md:max-h-none md:rounded-[28px]',
            wide ? 'md:w-[620px]' : 'md:w-[520px]',
          )}
        >
          <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4 md:px-8 md:pt-8">
            <div>
              <Dialog.Title className="font-display text-[28px] leading-tight tracking-[-0.02em]">{title}</Dialog.Title>
              {description ? (
                <Dialog.Description className="mt-1 text-[14.5px] text-ink-soft">{description}</Dialog.Description>
              ) : (
                <Dialog.Description className="sr-only">{title}</Dialog.Description>
              )}
            </div>
            <Dialog.Close asChild>
              <button className="press -mr-2 grid size-10 place-items-center rounded-full text-ink-soft hover:bg-surface-2 hover:text-ink" aria-label="Close">
                <CloseGlyph />
              </button>
            </Dialog.Close>
          </div>
          <div className="scroll-quiet flex-1 overflow-y-auto px-6 pb-6 md:px-8">{children}</div>
          {footer && <div className="border-t border-line px-6 py-4 md:px-8">{footer}</div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

/** Centred dialog for short prompts. */
export function Modal({
  open,
  onOpenChange,
  title,
  children,
  label,
  top,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  label?: string
  children: ReactNode
  top?: boolean
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="sheet-overlay fixed inset-0 z-40 bg-[#0b1220]/55" />
        <Dialog.Content
          aria-describedby={undefined}
          className={cx(
            'modal fixed left-1/2 z-50 w-[calc(100vw-32px)] max-w-[560px] -translate-x-1/2 rounded-[24px] bg-bg shadow-[var(--shadow-float)] outline-none',
            top ? 'top-[12vh]' : 'top-1/2 -translate-y-1/2',
          )}
        >
          {title ? (
            <Dialog.Title className="px-6 pt-6 font-display text-[24px] tracking-[-0.02em]">{title}</Dialog.Title>
          ) : (
            <Dialog.Title className="sr-only">{label}</Dialog.Title>
          )}
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export function Menu({ trigger, children, align = 'end' }: { trigger: ReactNode; children: ReactNode; align?: 'start' | 'end' }) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>{trigger}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align={align}
          sideOffset={6}
          className="pop z-50 min-w-[220px] rounded-2xl bg-surface-2 p-1.5 shadow-[var(--shadow-float)] ring-1 ring-line outline-none"
        >
          {children}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

export function MenuItem({ onSelect, children, danger }: { onSelect: () => void; children: ReactNode; danger?: boolean }) {
  return (
    <Popover.Close asChild>
      <button
        type="button"
        onClick={onSelect}
        className={cx(
          'flex w-full items-center rounded-xl px-3 py-2 text-left text-[14.5px] hover:bg-surface focus-visible:bg-surface active:bg-line',
          danger ? 'text-oxblood' : 'text-ink',
        )}
      >
        {children}
      </button>
    </Popover.Close>
  )
}

export function DotsGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <circle cx="4" cy="9" r="1.5" fill="currentColor" />
      <circle cx="9" cy="9" r="1.5" fill="currentColor" />
      <circle cx="14" cy="9" r="1.5" fill="currentColor" />
    </svg>
  )
}

export function CloseGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

export function ChevronGlyph({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" style={{ transform: dir === 'left' ? 'scaleX(-1)' : undefined }}>
      <path d="M6 3.5L10.5 8 6 12.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Small engraved divider: a line with a centred lozenge, used between major sections. */
export function Flourish({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 12" className={cx('h-3 w-40 text-gold', className)} aria-hidden="true">
      <path d="M0 6h104M136 6h104" stroke="currentColor" strokeWidth="0.8" />
      <path d="M120 1l6 5-6 5-6-5z" fill="none" stroke="currentColor" strokeWidth="0.9" />
      <circle cx="108" cy="6" r="1.2" fill="currentColor" />
      <circle cx="132" cy="6" r="1.2" fill="currentColor" />
    </svg>
  )
}
