import { bridgeService, isLive } from '@/services/bridge'
import { prefsService } from '@/services/prefs'
import { vehicleService } from '@/services/vehicle'
import { audioService } from '@/services/audio'

/**
 * ParkPilot (OPS) i kamera za voznju unazad.
 *
 * Isti prikaz radi za svaku opremu (Podesavanja vozila → Parkiranje →
 * Oprema): samo senzori, samo kamera ili kamera i senzori.
 *
 * U vozilu stanje stize od bridge-a: { type: "park", data: { reverse,
 * front, rear } } — rastojanja u cm po sektoru, null = nema prepreke.
 * Taster P salje { type: "key", key: "park" }. Bez veze sa vozilom
 * prepreke se simuliraju, a rikverc se pali tasterom F4 (taster P = F3).
 */

/** Rastojanje do prepreke u cm; null = slobodno. Redosled: levi ugao, levo, desno, desni ugao. */
export type Sectors = [number | null, number | null, number | null, number | null]
export type ParkView = 'sensors' | 'camera'

export interface ParkState {
  visible: boolean
  view: ParkView
  reverse: boolean
  front: Sectors
  rear: Sectors
  muted: boolean
  /** Senzori ne rade (prljavi, kvar) — prikaz to javlja kao fabricki sistem. */
  fault: boolean
}

/** Granice zona u cm (od najblize ka najdaljoj). Ugaoni senzori imaju kraci domet. */
const ZONES = {
  rearCenter: [30, 60, 100, 150],
  frontCenter: [30, 50, 80, 120],
  corner: [30, 40, 50, 60],
} as const
export const ZONE_COUNT = 4

/** Zona (0 = najbliza, crvena) za rastojanje; null ako je prepreka van dometa. */
export function zoneOf(cm: number | null, front: boolean, corner: boolean): number | null {
  if (cm === null) return null
  const z = corner ? ZONES.corner : front ? ZONES.frontCenter : ZONES.rearCenter
  const i = z.findIndex((limit) => cm < limit)
  return i === -1 ? null : i
}

const FREE: Sectors = [null, null, null, null]
/** Iznad ove brzine (km/h) prikaz se sam zatvara, kao u Golfu. */
const AUTO_OFF_KMH = 15

export interface ParkingService {
  getState(): ParkState
  subscribe(listener: (s: ParkState) => void): () => void
  open(view?: ParkView): void
  close(): void
  setView(view: ParkView): void
  toggleMute(): void
  /** Taster P na konzoli. */
  pressKey(): void
  /** Rikverc (iz vozila ili simulacija). */
  setReverse(on: boolean): void
}

function equipment() {
  const hw = prefsService.getState()['hw.park']
  return { sensors: hw === 'sensors' || hw === 'both', camera: hw === 'camera' || hw === 'both', none: hw === 'none' }
}

function createParkingService(): ParkingService {
  let state: ParkState = { visible: false, view: 'sensors', reverse: false, front: FREE, rear: FREE, muted: false, fault: false }
  const listeners = new Set<(s: ParkState) => void>()
  let closeTimer: number | null = null

  function set(patch: Partial<ParkState>) {
    const wasVisible = state.visible
    state = { ...state, ...patch }
    if (state.visible !== wasVisible) onVisibility()
    for (const l of listeners) l(state)
  }

  function defaultView(): ParkView {
    const eq = equipment()
    return eq.camera && state.reverse ? 'camera' : eq.sensors ? 'sensors' : 'camera'
  }

  function open(view?: ParkView) {
    if (equipment().none) return
    cancelClose()
    set({ visible: true, view: view ?? defaultView() })
  }

  function cancelClose() {
    if (closeTimer !== null) window.clearTimeout(closeTimer)
    closeTimer = null
  }

  function setReverse(on: boolean) {
    if (on === state.reverse) return
    const eq = equipment()
    state = { ...state, reverse: on }
    if (on) {
      if (!eq.none) open(eq.camera ? 'camera' : 'sensors')
      else set({})
      return
    }
    // Iz rikverca: sa senzorima ostaje OPS (kao u Golfu), samo kamera se gasi posle par sekundi
    if (state.visible && eq.sensors) set({ view: 'sensors' })
    else if (state.visible) {
      set({})
      cancelClose()
      closeTimer = window.setTimeout(() => set({ visible: false }), 4000)
    } else set({})
  }

  // ---- Zvucni signal (jacina i visina tona iz podesavanja ParkPilot-a)
  let ctx: AudioContext | null = null
  let beepTimer: number | null = null

  function beep(freq: number, gain: number, ms: number) {
    try {
      ctx ??= new AudioContext()
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      const t = ctx.currentTime
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(gain, t + 0.008)
      g.gain.setValueAtTime(gain, t + ms / 1000 - 0.01)
      g.gain.linearRampToValueAtTime(0, t + ms / 1000)
      osc.connect(g).connect(ctx.destination)
      osc.start(t)
      osc.stop(t + ms / 1000 + 0.02)
    } catch {
      /* bez zvuka — prikaz i dalje radi */
    }
  }

  function nearest(): { cm: number; front: boolean } | null {
    let best: { cm: number; front: boolean } | null = null
    const check = (list: Sectors, front: boolean) =>
      list.forEach((cm, i) => {
        if (zoneOf(cm, front, i === 0 || i === 3) === null || cm === null) return
        if (!best || cm < best.cm) best = { cm, front }
      })
    if (prefsService.getState()['hw.parkFront']) check(state.front, true)
    check(state.rear, false)
    return best
  }

  function scheduleBeep() {
    if (beepTimer !== null) window.clearTimeout(beepTimer)
    beepTimer = null
    if (!state.visible || state.muted || !equipment().sensors) return
    const n = nearest()
    if (!n) {
      beepTimer = window.setTimeout(scheduleBeep, 200)
      return
    }
    const p = prefsService.getState()
    const vol = n.front ? p['park.frontVolume'] : p['park.rearVolume']
    const tone = n.front ? p['park.frontTone'] : p['park.rearTone']
    const freq = 600 + tone * 90
    const gain = 0.02 + vol * 0.018
    // Ispod 30 cm neprekidan ton, inace sve cesci signal kako se prepreka priblizava
    if (n.cm < 30) {
      beep(freq, gain, 210)
      beepTimer = window.setTimeout(scheduleBeep, 200)
      return
    }
    const max = n.front ? 120 : 150
    const gap = 90 + Math.min(1, (n.cm - 30) / (max - 30)) * 560
    beep(freq, gain, 80)
    beepTimer = window.setTimeout(scheduleBeep, 80 + gap)
  }

  // ---- Simulacija prepreka (samo bez veze sa vozilom)
  let simTimer: number | null = null
  let simT = 0
  function simulate() {
    if (simTimer !== null) return
    simT = 0
    simTimer = window.setInterval(() => {
      if (isLive()) return
      simT += 0.1
      const d = 95 + Math.sin(simT / 2.2) * 75 // 20–170 cm
      const r = (x: number) => Math.round(Math.max(18, x))
      set({
        rear: [d < 90 ? r(d + 18) : null, r(d), r(d + 10), d < 70 ? r(d + 30) : null],
        front: [null, null, r(70 + Math.cos(simT / 3) * 30), r(46 + Math.cos(simT / 3) * 14)],
      })
    }, 100)
  }
  function stopSimulation() {
    if (simTimer !== null) window.clearInterval(simTimer)
    simTimer = null
  }

  function onVisibility() {
    const p = prefsService.getState()
    audioService.setDuck(state.visible && p['park.audioReduction'] ? 0.3 : 1)
    if (state.visible) {
      if (!isLive()) simulate()
      window.setTimeout(scheduleBeep, 0)
    } else {
      stopSimulation()
      if (beepTimer !== null) window.clearTimeout(beepTimer)
      beepTimer = null
      cancelClose()
      if (!isLive()) state = { ...state, front: FREE, rear: FREE }
    }
  }

  // ---- Podaci iz vozila
  bridgeService.on('park', (msg) => {
    const d = (msg as { data?: Partial<ParkState> }).data
    if (!d) return
    stopSimulation()
    const patch: Partial<ParkState> = {}
    if (Array.isArray(d.front)) patch.front = d.front as Sectors
    if (Array.isArray(d.rear)) patch.rear = d.rear as Sectors
    if (typeof d.fault === 'boolean') patch.fault = d.fault
    set(patch)
    if (typeof d.reverse === 'boolean') setReverse(d.reverse)
    // Automatska aktivacija: prepreka ispred pri maloj brzini otvara OPS
    const front = patch.front ?? state.front
    if (
      !state.visible &&
      prefsService.getState()['park.autoActivate'] &&
      prefsService.getState()['hw.parkFront'] &&
      vehicleService.getState().speedKmh < 10 &&
      front.some((cm, i) => zoneOf(cm, true, i === 0 || i === 3) !== null && (cm ?? 999) < 50)
    )
      open('sensors')
  })
  bridgeService.on('key', (msg) => {
    if ((msg as { key?: string }).key === 'park') service.pressKey()
  })

  // Iznad 15 km/h prikaz se zatvara
  vehicleService.subscribe((v) => {
    if (state.visible && !state.reverse && v.speedKmh > AUTO_OFF_KMH) set({ visible: false })
  })

  const service: ParkingService = {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener)
      listener(state)
      return () => listeners.delete(listener)
    },
    open,
    close() {
      set({ visible: false })
    },
    setView(view) {
      set({ view })
      scheduleBeep()
    },
    toggleMute() {
      set({ muted: !state.muted })
      scheduleBeep()
    },
    pressKey() {
      if (state.visible) set({ visible: false })
      else open('sensors')
    },
    setReverse,
  }
  return service
}

export const parkingService = createParkingService()

/** Samo u razvoju: `&hw=both` bira opremu, `&park=sensors|camera` otvara prikaz (za snimke ekrana). */
if (import.meta.env.DEV) {
  const q = new URLSearchParams(window.location.search)
  const hw = q.get('hw')
  if (hw === 'sensors' || hw === 'camera' || hw === 'both' || hw === 'none') prefsService.set('hw.park', hw)
  const view = q.get('park')
  if (view === 'sensors' || view === 'camera') window.setTimeout(() => parkingService.open(view), 1500)
}
