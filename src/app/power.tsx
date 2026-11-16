import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { stage } from '@/features/vehicle/stage'
import { hasWebGL } from '@/features/vehicle/VehicleView'

/**
 * Stanja uredjaja.
 *
 * VAZNO: nijedno od ovih stanja ne dolazi iz automobila. Sistem trenutno NE
 * moze da detektuje kontakt, ACC ni gasenje motora — to zahteva hardversku
 * integraciju koja jos ne postoji. Sva stanja se ovde pokrecu rucno
 * (iz Podesavanja) i predstavljaju simulaciju ponasanja uredjaja.
 */
export type PowerState =
  | 'off' // ekran ugasen
  | 'booting' // uvodna animacija
  | 'initializing' // priprema interfejsa
  | 'ready' // normalan rad
  | 'standby' // mirovanje, aplikacija ostaje u memoriji
  | 'shutting-down' // kontrolisano gasenje

export const BOOT_MS = 2900
/** Auto na ekranu pokretanja: najranije posle pojave znaka, voznja preko linije. */
export const BOOT_CAR_DELAY_MS = 1100
export const BOOT_DRIVE_MS = 1700
/** Ako se 3D ne ucita, sistem se svakako otvara posle ovoliko. */
const BOOT_MAX_MS = 6000
/** Samo u razvoju: `?holdboot` zadrzava ekran pokretanja (za snimke). */
const DEV_HOLD_BOOT = import.meta.env.DEV && new URLSearchParams(window.location.search).has('holdboot')
export const INIT_MS = 800
export const SHUTDOWN_MS = 1100

interface PowerContextValue {
  state: PowerState
  /** true dok je interfejs montiran (ready, standby ili gasenje u toku) */
  shellMounted: boolean
  powerOn: () => void
  shutdown: () => void
  enterStandby: () => void
  wake: () => void
  restart: () => void
}

const PowerContext = createContext<PowerContextValue | null>(null)

export function PowerProvider({
  children,
  skipBoot,
}: {
  children: ReactNode
  /** Kada je uvodna animacija iskljucena u Podesavanjima, krece se odmah u rad. */
  skipBoot: boolean
}) {
  const [state, setState] = useState<PowerState>(skipBoot ? 'ready' : 'booting')
  const timers = useRef<number[]>([])

  const clearTimers = useCallback(() => {
    for (const id of timers.current) window.clearTimeout(id)
    timers.current = []
  }, [])

  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms))
  }, [])

  const runBootSequence = useCallback(() => {
    clearTimers()
    setState('booting')
    const start = performance.now()
    // Auto na ekranu pokretanja krece cim se 3D model ucita (ne pre pojave znaka)
    // i vozi BOOT_DRIVE_MS; sistem se otvara kada stigne do kraja linije.
    const check = () => {
      if (DEV_HOLD_BOOT) return
      const now = performance.now()
      const st = stage.get()
      if (!hasWebGL() || !st.mounted || now - start > BOOT_MAX_MS) return setState('ready')
      if (st.ready && st.readyAt !== null) {
        const carEnd = Math.max(st.readyAt, start + BOOT_CAR_DELAY_MS) + BOOT_DRIVE_MS
        return later(() => setState('ready'), Math.max(INIT_MS, carEnd - now + 150))
      }
      later(check, 100)
    }
    later(() => {
      setState('initializing')
      check()
    }, BOOT_MS)
  }, [clearTimers, later])

  // Uvodna sekvenca mora da se zakaze i pri samom pokretanju aplikacije,
  // ne samo kada se sistem rucno upali — inace ostaje zaglavljen na znaku.
  useEffect(() => {
    if (!skipBoot) runBootSequence()
    return clearTimers
    // namerno samo pri montiranju
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const powerOn = useCallback(() => {
    if (skipBoot) {
      clearTimers()
      setState('ready')
      return
    }
    runBootSequence()
  }, [skipBoot, runBootSequence, clearTimers])

  const shutdown = useCallback(() => {
    clearTimers()
    setState('shutting-down')
    later(() => setState('off'), SHUTDOWN_MS)
  }, [clearTimers, later])

  // Standby ne demontira interfejs — budjenje je trenutno, bez ponovnog ucitavanja.
  const enterStandby = useCallback(() => {
    clearTimers()
    setState('standby')
  }, [clearTimers])

  const wake = useCallback(() => {
    clearTimers()
    setState('ready')
  }, [clearTimers])

  const restart = useCallback(() => {
    clearTimers()
    setState('shutting-down')
    later(() => runBootSequence(), SHUTDOWN_MS)
  }, [clearTimers, later, runBootSequence])

  const value = useMemo<PowerContextValue>(
    () => ({
      state,
      shellMounted: state === 'ready' || state === 'standby' || state === 'shutting-down',
      powerOn,
      shutdown,
      enterStandby,
      wake,
      restart,
    }),
    [state, powerOn, shutdown, enterStandby, wake, restart],
  )

  return <PowerContext.Provider value={value}>{children}</PowerContext.Provider>
}

export function usePower(): PowerContextValue {
  const ctx = useContext(PowerContext)
  if (!ctx) throw new Error('usePower mora biti unutar PowerProvider')
  return ctx
}
