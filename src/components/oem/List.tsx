import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Icon } from '@/components/ui/Icon'
import type { IconName } from '@/components/ui/Icon'
import { Checkbox, StepBar } from './controls'
import { OptionsDialog } from './Dialog'

/* --------------------------------------------------------------------------
   Liste fabrickih menija podesavanja (MIB2)

   Redovi su visoki 64 px, odvojeni tankom sivom linijom. Duge liste imaju
   indikator polozaja uz desnu ivicu ("marka za pomeranje" iz uputstva).
-------------------------------------------------------------------------- */

/** Lista sa sopstvenim indikatorom pomeranja uz desnu ivicu. */
export function ScrollList({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [thumb, setThumb] = useState<{ top: number; height: number } | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => {
      const { scrollTop, scrollHeight, clientHeight } = el
      if (scrollHeight <= clientHeight + 2) {
        setThumb(null)
        return
      }
      const height = Math.max(36, (clientHeight / scrollHeight) * clientHeight)
      const top = (scrollTop / (scrollHeight - clientHeight)) * (clientHeight - height)
      setThumb({ top, height })
    }
    update()
    el.addEventListener('scroll', update, { passive: true })
    const ro = new ResizeObserver(update)
    ro.observe(el)
    for (const child of Array.from(el.children)) ro.observe(child)
    return () => {
      el.removeEventListener('scroll', update)
      ro.disconnect()
    }
  }, [])

  return (
    <div className={'relative min-h-0 flex-1 ' + className}>
      <div ref={ref} className="touch-scroll h-full pr-4">
        {children}
      </div>
      {thumb && (
        <div aria-hidden="true" className="pointer-events-none absolute top-2 right-1.5 bottom-2 w-[3px] bg-line-soft">
          <div
            className="absolute inset-x-0 bg-text-2"
            style={{ top: thumb.top, height: thumb.height - 16 }}
          />
        </div>
      )}
    </div>
  )
}

const ROW = 'flex min-h-16 w-full items-center gap-4 border-b border-line-soft px-5 text-left'

/** Naslov grupe unutar liste. */
export function RowHeader({ children }: { children: ReactNode }) {
  return (
    <p className="border-b border-line-soft px-5 pt-5 pb-2 text-small font-medium text-text-3">{children}</p>
  )
}

/** Stavka koja otvara podmeni. */
export function RowLink({
  label,
  value,
  icon,
  onClick,
  disabled = false,
}: {
  label: string
  value?: string
  icon?: IconName
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={ROW + ' disabled:text-text-disabled'}>
      {icon && <Icon name={icon} size={22} className={disabled ? '' : 'text-text-2'} />}
      <span className="min-w-0 flex-1 text-body">{label}</span>
      {value && <span className="max-w-[45%] truncate text-small text-text-2">{value}</span>}
      <Icon name="chevron-right" size={20} className="shrink-0 text-text-3" />
    </button>
  )
}

/** Stavka sa poljem za potvrdu (ukljuceno/iskljuceno). */
export function RowCheck({
  label,
  hint,
  checked,
  onChange,
  disabled = false,
}: {
  label: string
  hint?: string
  checked: boolean
  onChange: (value: boolean) => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={ROW + ' disabled:opacity-40'}
    >
      <Checkbox checked={checked} />
      <span className="min-w-0 flex-1">
        <span className="block text-body">{label}</span>
        {hint && <span className="mt-0.5 block text-small text-text-3">{hint}</span>}
      </span>
    </button>
  )
}

/** Stavka sa izborom vrednosti — otvara prozor opcija. */
export function RowSelect<T extends string | number>({
  label,
  value,
  options,
  onSelect,
  disabled = false,
}: {
  label: string
  value: T
  options: { value: T; label: string; disabled?: boolean }[]
  onSelect: (value: T) => void
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const current = options.find((o) => o.value === value)
  return (
    <>
      <button type="button" disabled={disabled} onClick={() => setOpen(true)} className={ROW + ' disabled:opacity-40'}>
        <span className="min-w-0 flex-1 text-body">{label}</span>
        <span className="max-w-[45%] truncate text-small text-accent-ink">{current?.label}</span>
        <Icon name="more" size={20} className="shrink-0 text-text-3" />
      </button>
      <OptionsDialog
        open={open}
        title={label}
        options={options}
        value={value}
        onSelect={onSelect}
        onClose={() => setOpen(false)}
      />
    </>
  )
}

/** Stavka sa trakom − / + (jacina, osvetljenost, vreme...). */
export function RowStep({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  format,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (value: number) => void
  format?: (value: number) => string
}) {
  return (
    <div className={ROW + ' justify-between py-2'}>
      <span className="min-w-[96px] flex-1 truncate text-body">{label}</span>
      <StepBar label={label} value={value} min={min} max={max} step={step} onChange={onChange} format={format} width={220} />
    </div>
  )
}

/** Samo prikaz: naziv i vrednost. */
export function RowInfo({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className={ROW + ' justify-between'}>
      <span className="min-w-0 flex-1">
        <span className="block text-body">{label}</span>
        {hint && <span className="mt-0.5 block text-small text-text-3">{hint}</span>}
      </span>
      <span className="max-w-[60%] text-right text-body break-words text-text-2 tabular-nums">{value}</span>
    </div>
  )
}

/** Radnja u listi (npr. "Fabricka podesavanja", "Trazi telefon"). */
export function RowAction({
  label,
  icon,
  onClick,
  disabled = false,
  danger = false,
}: {
  label: string
  icon?: IconName
  onClick: () => void
  disabled?: boolean
  danger?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={ROW + ' disabled:text-text-disabled ' + (danger ? 'text-danger' : 'text-accent-ink')}
    >
      {icon && <Icon name={icon} size={22} />}
      <span className="flex-1 text-body font-medium">{label}</span>
    </button>
  )
}

/** Napomena na dnu liste. */
export function ListNote({ children }: { children: ReactNode }) {
  return <p className="px-5 py-4 text-small leading-relaxed text-text-3">{children}</p>
}
