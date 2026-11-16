import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'

/**
 * Stanje "skoljke" fabrickog ekrana koje dele svi ekrani:
 * naslov u naslovnoj traci, mesto za funkcijska dugmad u naslovnoj traci,
 * iskacuci prikaz glasnoce, kratka obavestenja i tastatura na ekranu.
 */
export interface KeyboardRequest {
  title: string
  value: string
  /** 'text' = slova, 'phone' = cifre i + * #, 'number' = samo cifre */
  mode?: 'text' | 'phone' | 'number'
  maxLength?: number
  onDone: (value: string) => void
}

interface ShellContextValue {
  /** Naslov podmenija; null = naziv glavnog ekrana. */
  title: string | null
  setTitle: (title: string | null) => void
  actionsEl: HTMLElement | null
  setActionsEl: (el: HTMLElement | null) => void
  volumeShownAt: number
  showVolume: () => void
  toast: { id: number; text: string } | null
  notify: (text: string) => void
  keyboard: KeyboardRequest | null
  openKeyboard: (req: KeyboardRequest) => void
  closeKeyboard: () => void
}

const ShellContext = createContext<ShellContextValue | null>(null)

export function ShellProvider({ children }: { children: ReactNode }) {
  const [title, setTitle] = useState<string | null>(null)
  const [actionsEl, setActionsEl] = useState<HTMLElement | null>(null)
  const [volumeShownAt, setVolumeShownAt] = useState(0)
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null)
  const [keyboard, setKeyboard] = useState<KeyboardRequest | null>(null)
  const toastTimer = useRef<number | null>(null)

  const showVolume = useCallback(() => setVolumeShownAt(Date.now()), [])

  const notify = useCallback((text: string) => {
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current)
    setToast({ id: Date.now(), text })
    toastTimer.current = window.setTimeout(() => setToast(null), 2600)
  }, [])

  useEffect(
    () => () => {
      if (toastTimer.current !== null) window.clearTimeout(toastTimer.current)
    },
    [],
  )

  const openKeyboard = useCallback((req: KeyboardRequest) => setKeyboard(req), [])
  const closeKeyboard = useCallback(() => setKeyboard(null), [])

  const value = useMemo(
    () => ({
      title,
      setTitle,
      actionsEl,
      setActionsEl,
      volumeShownAt,
      showVolume,
      toast,
      notify,
      keyboard,
      openKeyboard,
      closeKeyboard,
    }),
    [title, actionsEl, volumeShownAt, showVolume, toast, notify, keyboard, openKeyboard, closeKeyboard],
  )
  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>
}

export function useShell(): ShellContextValue {
  const ctx = useContext(ShellContext)
  if (!ctx) throw new Error('useShell mora biti unutar ShellProvider')
  return ctx
}

/** Postavlja naslov podmenija u naslovnoj traci dok je komponenta prikazana. */
export function useScreenTitle(title: string | null) {
  const { setTitle } = useShell()
  useEffect(() => {
    setTitle(title)
    return () => setTitle(null)
  }, [title, setTitle])
}
