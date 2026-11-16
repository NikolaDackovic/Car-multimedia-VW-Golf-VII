import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { Icon } from '@/components/ui/Icon'
import type { IconName } from '@/components/ui/Icon'
import { useShell } from '@/app/shell'
import { useLongPress } from '@/hooks/useLongPress'
import { useT } from '@/hooks/useT'
import { useBridge } from '@/hooks/useBridge'

/* --------------------------------------------------------------------------
   Osnovne kontrole fabrickog MIB2 ekrana
-------------------------------------------------------------------------- */

const BTN_SIZES = {
  sm: 'h-12 min-w-12 px-4 text-small',
  md: 'h-14 min-w-14 px-5 text-body',
  lg: 'h-16 min-w-16 px-6 text-body-lg',
} as const

/**
 * Funkcijsko dugme: tamno sivi preliv i svetlija gornja ivica. Aktivno stanje
 * (ukljuceno, izabrano) dobija akcentni okvir — kao fabricko dugme.
 * Podrzava dugi pritisak (`onHold`) i ponavljanje dok se drzi (`repeatMs`).
 */
export function OemButton({
  children,
  onClick,
  onHold,
  repeatMs,
  active = false,
  disabled = false,
  size = 'md',
  className = '',
  'aria-label': ariaLabel,
  pressed,
}: {
  children: ReactNode
  onClick?: () => void
  onHold?: () => void
  repeatMs?: number
  active?: boolean
  disabled?: boolean
  size?: keyof typeof BTN_SIZES
  className?: string
  'aria-label'?: string
  /** aria-pressed za dugmad koja su prekidaci. */
  pressed?: boolean
}) {
  const press = useLongPress({ onClick, onHold, repeatMs })
  const handlers = onHold ? press : { onClick }
  return (
    <motion.button
      type="button"
      disabled={disabled}
      aria-label={ariaLabel}
      aria-pressed={pressed}
      data-active={active}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      transition={{ duration: 0.08 }}
      className={[
        'oem-btn inline-flex shrink-0 items-center justify-center gap-2 font-medium whitespace-nowrap select-none',
        BTN_SIZES[size],
        className,
      ].join(' ')}
      {...handlers}
    >
      {children}
    </motion.button>
  )
}

/** Dugme sa ikonicom i natpisom ispod — za donju traku funkcija. */
export function BarButton({
  icon,
  label,
  onClick,
  active = false,
  disabled = false,
}: {
  icon: IconName
  label: string
  onClick: () => void
  active?: boolean
  disabled?: boolean
}) {
  return (
    <OemButton
      onClick={onClick}
      active={active}
      disabled={disabled}
      className="h-[60px] flex-1 flex-col !gap-1 !px-2"
    >
      <Icon name={icon} size={21} />
      <span className="text-caption leading-none">{label}</span>
    </OemButton>
  )
}

/** Donja traka funkcija (fabricki: dugmad uz donju ivicu ekrana). */
export function FunctionBar({ children }: { children: ReactNode }) {
  return <div className="prox flex shrink-0 gap-2 border-t border-line-soft px-4 pt-3 pb-3">{children}</div>
}

/** Kvadratno polje za potvrdu (checkbox) — fabricki MIB2 stil. */
export function Checkbox({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden="true"
      className="flex size-[30px] shrink-0 items-center justify-center border-2 transition-colors"
      style={{
        borderColor: checked ? 'var(--accent)' : 'var(--line-strong)',
        background: checked ? 'var(--accent-soft)' : 'transparent',
        boxShadow: checked ? 'var(--accent-glow)' : undefined,
      }}
    >
      {checked && <Icon name="check" size={20} strokeWidth={2.6} className="text-accent-ink" />}
    </span>
  )
}

/**
 * Traka sa podeocima i tasterima − / +, za glasnocu, osvetljenost, jacinu
 * signala ParkPilot-a... Dodir na traku postavlja vrednost.
 */
export function StepBar({
  value,
  min,
  max,
  step = 1,
  onChange,
  format,
  label,
  width = 260,
}: {
  value: number
  min: number
  max: number
  step?: number
  onChange: (value: number) => void
  format?: (value: number) => string
  label: string
  width?: number
}) {
  const steps = Math.round((max - min) / step)
  const segments = Math.min(steps, 30)
  const ratio = (value - min) / (max - min || 1)
  const set = (v: number) => onChange(Math.max(min, Math.min(max, Math.round(v / step) * step)))

  return (
    <div className="flex min-w-0 items-center gap-2" role="group" aria-label={label}>
      <OemButton size="sm" aria-label={label + ' −'} disabled={value <= min} onClick={() => set(value - step)} className="!w-12 shrink-0 !px-0">
        <Icon name="minus" size={20} />
      </OemButton>
      <div
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={format ? format(value) : String(value)}
        onPointerDown={(e) => {
          const rect = e.currentTarget.getBoundingClientRect()
          set(min + ((e.clientX - rect.left) / rect.width) * (max - min))
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight' || e.key === 'ArrowUp') set(value + step)
          if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') set(value - step)
        }}
        className="flex h-12 min-w-[72px] shrink cursor-pointer items-center gap-[2px] px-1"
        style={{ width, maxWidth: '100%' }}
      >
        {Array.from({ length: segments }, (_, i) => {
          const filled = (i + 1) / segments <= ratio + 0.0001
          return (
            <span
              key={i}
              className="h-[18px] flex-1 transition-colors"
              style={{
                background: filled ? 'var(--accent)' : 'var(--surface-3)',
                boxShadow: filled ? 'var(--accent-glow)' : undefined,
              }}
            />
          )
        })}
      </div>
      <OemButton size="sm" aria-label={label + ' +'} disabled={value >= max} onClick={() => set(value + step)} className="!w-12 shrink-0 !px-0">
        <Icon name="plus" size={20} />
      </OemButton>
      <span className="w-14 shrink-0 truncate text-right text-body tabular-nums text-text-1">{format ? format(value) : value}</span>
    </div>
  )
}

/** Tacke strana (grupe memorija radija, strane menija). */
export function PageDots({
  count,
  index,
  onSelect,
  label,
}: {
  count: number
  index: number
  onSelect: (i: number) => void
  label: string
}) {
  return (
    <div className="flex items-center justify-center gap-1">
      {Array.from({ length: count }, (_, i) => (
        <button
          key={i}
          type="button"
          aria-label={label + ' ' + (i + 1)}
          aria-pressed={i === index}
          onClick={() => onSelect(i)}
          className="flex h-10 w-10 items-center justify-center"
        >
          <span
            className="size-[9px] rounded-full transition-colors"
            style={{
              background: i === index ? 'var(--accent)' : 'var(--line-strong)',
              boxShadow: i === index ? 'var(--accent-glow)' : undefined,
            }}
          />
        </button>
      ))}
    </div>
  )
}

/** Funkcijska dugmad u naslovnoj traci — iscrtavaju se na desnoj strani trake. */
export function TitleActions({ children }: { children: ReactNode }) {
  const { actionsEl } = useShell()
  if (!actionsEl) return null
  return createPortal(children, actionsEl)
}

/** Malo dugme za naslovnu traku (npr. opseg "FM ▾", izvor "USB 1 ▾", podesavanja). */
export function TitleButton({
  children,
  onClick,
  active = false,
  'aria-label': ariaLabel,
}: {
  children: ReactNode
  onClick: () => void
  active?: boolean
  'aria-label'?: string
}) {
  return (
    <OemButton size="sm" onClick={onClick} active={active} aria-label={ariaLabel} className="!h-10 !min-w-10 !px-3">
      {children}
    </OemButton>
  )
}

/** Sloj za iskacuce prozore unutar skaliranog ekrana (iznad sadrzaja, ispod tastature). */
export function OverlayPortal({ children }: { children: ReactNode }) {
  const [el, setEl] = useState<HTMLElement | null>(null)
  useEffect(() => setEl(document.getElementById('oem-layer')), [])
  if (!el) return null
  return createPortal(children, el)
}

/** Oznaka da je vrednost simulirana. */
/** Oznaka da su podaci vozila simulirani — nestaje cim se poveze bridge u autu. */
export function SimTag({ className = '' }: { className?: string }) {
  const { t } = useT()
  const bridge = useBridge()
  if (bridge.status === 'connected') return null
  return (
    <span
      className={
        'inline-flex h-6 shrink-0 items-center border border-line px-2 text-micro font-semibold tracking-[0.12em] text-text-3 uppercase ' +
        className
      }
    >
      {t.common.simulated}
    </span>
  )
}

/** Plavo dugme za informacije (ⓘ) — otvara objasnjenje ili detalje, kao na fabrickoj jedinici. */
export function InfoButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      onClick={onClick}
      whileTap={{ scale: 0.94 }}
      transition={{ duration: 0.08 }}
      className="flex size-11 shrink-0 items-center justify-center rounded-full border-2 border-accent text-accent-ink"
      style={{ background: 'var(--accent-soft)', boxShadow: 'var(--accent-glow)' }}
    >
      <span className="text-[19px] leading-none font-bold">i</span>
    </motion.button>
  )
}
