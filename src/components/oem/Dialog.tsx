import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Icon } from '@/components/ui/Icon'
import { useT } from '@/hooks/useT'
import { OemButton, OverlayPortal } from './controls'

/**
 * Iskacuci prozor (fabricki "prozor opcija"): naslov, sadrzaj, X za
 * zatvaranje i dugmad. Prikazuje se preko sadrzaja, unutar skaliranog ekrana.
 */
export function Dialog({
  open,
  title,
  onClose,
  children,
  actions,
  width = 560,
}: {
  open: boolean
  title: string
  onClose: () => void
  children?: ReactNode
  actions?: ReactNode
  width?: number
}) {
  const { t } = useT()
  return (
    <OverlayPortal>
      <AnimatePresence>
        {open && (
          <motion.div
            key="dialog"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.14 }}
            className="pointer-events-auto absolute inset-0 flex items-center justify-center"
            style={{ background: 'var(--scrim)' }}
            onPointerDown={(e) => {
              if (e.target === e.currentTarget) onClose()
            }}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label={title}
              initial={{ scale: 0.97, y: 6 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.97, y: 6 }}
              transition={{ duration: 0.14 }}
              className="flex max-h-[600px] flex-col overflow-hidden rounded-[18px] border border-line-strong"
              style={{ width, background: 'var(--surface-1)', boxShadow: 'var(--shadow-3)' }}
            >
              <div className="flex h-14 shrink-0 items-center justify-between border-b border-line pl-5">
                <p className="text-body-lg font-medium">{title}</p>
                <button
                  type="button"
                  aria-label={t.common.close}
                  onClick={onClose}
                  className="flex size-14 items-center justify-center border-l border-line text-text-2"
                >
                  <Icon name="close" size={22} />
                </button>
              </div>
              {children && <div className="touch-scroll min-h-0 flex-1">{children}</div>}
              {actions && <div className="flex shrink-0 gap-2 border-t border-line p-3">{actions}</div>}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </OverlayPortal>
  )
}

/** Izbor jedne vrednosti iz liste (fabricki: popup sa kruzicima). */
export function OptionsDialog<T extends string | number>({
  open,
  title,
  options,
  value,
  onSelect,
  onClose,
}: {
  open: boolean
  title: string
  options: { value: T; label: string; disabled?: boolean }[]
  value: T
  onSelect: (value: T) => void
  onClose: () => void
}) {
  return (
    <Dialog open={open} title={title} onClose={onClose}>
      <div role="radiogroup" aria-label={title}>
        {options.map((o) => {
          const selected = o.value === value
          return (
            <button
              key={String(o.value)}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={o.disabled}
              onClick={() => {
                onSelect(o.value)
                onClose()
              }}
              className="flex min-h-16 w-full items-center gap-4 border-b border-line-soft px-5 text-left last:border-0 disabled:text-text-disabled"
            >
              <span
                className="flex size-7 shrink-0 items-center justify-center rounded-full border-2"
                style={{ borderColor: selected ? 'var(--accent)' : 'var(--line-strong)' }}
              >
                {selected && (
                  <span
                    className="size-3.5 rounded-full bg-accent"
                    style={{ boxShadow: 'var(--accent-glow)' }}
                  />
                )}
              </span>
              <span className={'text-body ' + (selected ? 'text-accent-ink' : '')}>{o.label}</span>
            </button>
          )
        })}
      </div>
    </Dialog>
  )
}

/** Potvrda nepovratne radnje (brisanje, fabricka podesavanja): Otkazi / OK. */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  onConfirm,
  onClose,
}: {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  onConfirm: () => void
  onClose: () => void
}) {
  const { t } = useT()
  return (
    <Dialog
      open={open}
      title={title}
      onClose={onClose}
      actions={
        <>
          <OemButton className="flex-1" onClick={onClose}>
            {t.common.cancel}
          </OemButton>
          <OemButton
            className="flex-1"
            active
            onClick={() => {
              onConfirm()
              onClose()
            }}
          >
            {confirmLabel ?? t.common.ok}
          </OemButton>
        </>
      }
    >
      <p className="px-5 py-6 text-body leading-relaxed text-text-1">{message}</p>
    </Dialog>
  )
}
