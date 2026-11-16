import { useEffect, useRef } from 'react'
import type { KeyboardEvent, PointerEvent } from 'react'

/**
 * Kratak dodir i dugi pritisak na istom dugmetu, kao na fabrickom uredjaju
 * (memorije radija, premotavanje, favoriti telefona).
 *
 * - `onClick` se zove na kratak dodir.
 * - `onHold` se zove kada se drzi `holdMs`; posle toga kratak dodir se ne zove.
 * - `repeatMs` (opciono) ponavlja `onHold` dok se drzi — za premotavanje.
 */
export function useLongPress({
  onClick,
  onHold,
  holdMs = 650,
  repeatMs,
}: {
  onClick?: () => void
  onHold?: () => void
  holdMs?: number
  repeatMs?: number
}) {
  const timer = useRef<number | null>(null)
  const repeat = useRef<number | null>(null)
  const held = useRef(false)
  const active = useRef(false)

  function clear() {
    if (timer.current !== null) window.clearTimeout(timer.current)
    if (repeat.current !== null) window.clearInterval(repeat.current)
    timer.current = null
    repeat.current = null
  }

  useEffect(() => clear, [])

  return {
    onPointerDown(e: PointerEvent) {
      if (e.button !== 0) return
      active.current = true
      held.current = false
      clear()
      if (!onHold) return
      timer.current = window.setTimeout(() => {
        held.current = true
        onHold()
        if (repeatMs) repeat.current = window.setInterval(onHold, repeatMs)
      }, holdMs)
    },
    onPointerUp() {
      if (!active.current) return
      active.current = false
      clear()
      if (!held.current) onClick?.()
    },
    onPointerLeave() {
      active.current = false
      clear()
    },
    onPointerCancel() {
      active.current = false
      clear()
    },
    onContextMenu(e: { preventDefault: () => void }) {
      e.preventDefault()
    },
    onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onClick?.()
      }
    },
  }
}
