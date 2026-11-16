import type { Car3DProps } from './Car3D'

/**
 * Jedna stalna 3D scena za ceo sistem.
 *
 * Pravljenje WebGL platna (kontekst, sejderi, osvetljenje) traje — zato se
 * scena napravi jednom, odmah posle pokretanja, i priprema se skrivena.
 * Ekran koji prikazuje vozilo (VehicleView) je samo "pozajmi": platno se
 * premesti u njegov okvir i dobije njegove parametre, pa se vozilo pojavi
 * odmah, a izmedju ekrana kamera samo predje u novi kadar.
 *
 * Ako je scena vec zauzeta (npr. ParkPilot preko ekrana Vozilo), drugi
 * prikaz pravi svoje platno kao ranije.
 */
type StageProps = Omit<Car3DProps, 'className' | 'onReady'>

interface StageState {
  /** Element u koji se crta platno (pripada stalnoj sceni). */
  el: HTMLDivElement
  /** Okvir ekrana koji trenutno prikazuje vozilo; null = skriveno. */
  host: HTMLElement | null
  owner: symbol | null
  props: StageProps
  /** Scena je jednom prikazana (sejderi i osvetljenje su spremni). */
  ready: boolean
  /** Trenutak (performance.now) kada je scena postala spremna. */
  readyAt: number | null
  mounted: boolean
}

const listeners = new Set<() => void>()
const el = typeof document !== 'undefined' ? document.createElement('div') : (null as unknown as HTMLDivElement)
if (el) el.style.cssText = 'position:absolute;inset:0'

let state: StageState = { el, host: null, owner: null, props: { view: 'front' }, ready: false, readyAt: null, mounted: false }
/** Skriveni okvir u kome se scena priprema dok je nijedan ekran ne koristi. */
let parking: HTMLElement | null = null
/** Ekran od koga je scena privremeno preuzeta (npr. Vozilo ispod ParkPilot-a). */
let suspended: { owner: symbol; host: HTMLElement; props: StageProps } | null = null

function shallowEqual(a: object, b: object): boolean {
  const ka = Object.keys(a) as (keyof typeof a)[]
  const kb = Object.keys(b)
  return ka.length === kb.length && ka.every((k) => a[k] === b[k])
}

function emit() {
  for (const l of listeners) l()
}

export const stage = {
  get: () => state,
  subscribe(l: () => void) {
    listeners.add(l)
    return () => {
      listeners.delete(l)
    }
  },
  /** Stalna scena je montirana u ljusci sistema (MainShell). */
  setMounted(parkingEl: HTMLElement | null) {
    parking = parkingEl
    if (parkingEl && !state.host) parkingEl.appendChild(el)
    state = { ...state, mounted: !!parkingEl }
    emit()
  },
  /** Pokusaj da ekran preuzme scenu; vraca false ako je zauzeta. */
  /** `priority`: preuzima scenu i od drugog ekrana (ParkPilot pri rikvercu), pa je posle vraca. */
  claim(owner: symbol, host: HTMLElement, props: StageProps, priority = false): boolean {
    if (!state.mounted) return false
    if (state.owner && state.owner !== owner) {
      if (!priority || !state.host) return false
      suspended = { owner: state.owner, host: state.host, props: state.props }
    }
    host.appendChild(el)
    state = { ...state, owner, host, props }
    emit()
    return true
  },
  update(owner: symbol, props: StageProps) {
    if (state.owner !== owner || shallowEqual(state.props, props)) return
    state = { ...state, props }
    emit()
  },
  release(owner: symbol) {
    if (suspended?.owner === owner) suspended = null
    if (state.owner !== owner) return
    if (suspended) {
      const prev = suspended
      suspended = null
      prev.host.appendChild(el)
      state = { ...state, owner: prev.owner, host: prev.host, props: { ...prev.props, intro: false } }
      emit()
      return
    }
    if (parking) parking.appendChild(el)
    // Bez voznje i oznaka dok je skrivena — scena ne crta nista uzalud
    state = { ...state, owner: null, host: null, props: { ...state.props, driving: false, markers: [], wheelLabels: null, intro: false, snap: false } }
    emit()
  },
  setReady() {
    if (state.ready) return
    state = { ...state, ready: true, readyAt: performance.now() }
    emit()
  },
}
