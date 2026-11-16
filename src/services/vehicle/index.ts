import { storage } from '@/services/storage'
import { bridgeService } from '@/services/bridge'
import { BULBS } from '@/features/vehicle/bulbs'
import type { BulbId } from '@/features/vehicle/bulbs'

/**
 * Podaci vozila.
 *
 * Kada je povezan bridge (program koji na Linux racunaru cita CAN), sve
 * vrednosti stizu iz auta porukama { type: "vehicle", data: {...} } i
 * simulacija se gasi. Bez veze vrednosti su SIMULIRANE, da bi se ekrani
 * mogli razvijati i proveravati na racunaru.
 */
export type DoorId = 'driver' | 'passenger' | 'trunk' | 'bonnet'
export type LightsMode = 'off' | 'position' | 'low' | 'auto'
export type FaultLevel = 'info' | 'warn' | 'error'
export type MemoryId = 'sinceStart' | 'sinceRefuel' | 'longTerm'
export type AirFlow = 'auto' | 'windscreen' | 'body' | 'feet' | 'bodyFeet' | 'windscreenFeet'

export interface Fault {
  id: string
  level: FaultLevel
  /** Kljuc prevoda u t.faults */
  code: 'bulb' | 'bulbRearLeft' | 'serviceSoon' | 'washerFluid'
  /** Za code 'bulb': koja sijalica (mesto na vozilu i kadar kamere). */
  bulb?: BulbId
  /** Gde je greska uocena — koristi se za tacku na prikazu vozila. */
  area: 'front' | 'rear' | 'wheels' | 'cabin' | 'engine'
}

export interface Trip {
  km: number
  /** Prosecna potrosnja, l/100 km */
  avgConsumption: number
  avgSpeedKmh: number
  minutes: number
}

export interface Climate {
  driverC: number
  passengerC: number
  /** 0 = iskljucen ventilator, 1–7 */
  fanLevel: number
  ac: boolean
  acMax: boolean
  auto: boolean
  sync: boolean
  recirc: boolean
  defrost: boolean
  rearHeat: boolean
  seatHeatLeft: number
  seatHeatRight: number
  airFlow: AirFlow
}

export interface VehicleState {
  speedKmh: number
  rpm: number
  coolantC: number
  oilC: number
  outsideC: number
  fuelPercent: number
  rangeKm: number
  odometerKm: number
  /** Trenutna potrosnja, l/100 km (u mestu: l/h prikazuje MFD) */
  currentConsumption: number
  /** Prosecna potrosnja po minutu za poslednjih 30 minuta (grafikon). */
  consumptionHistory: number[]
  /** true = otvoreno */
  doors: Record<DoorId, boolean>
  lights: LightsMode
  drl: boolean
  rearFog: boolean
  climate: Climate
  memories: Record<MemoryId, Trip>
  /** Minuta neprekidne voznje — osnova za podsetnik za odmor. */
  driveMinutes: number
  startStop: 'ready' | 'notReady' | 'off'
  /** Indirektni sistem kontrole pritiska (Golf 7): samo status i "SET". */
  tpms: { status: 'ok' | 'warning'; storedAt: string | null }
  /** Pritisak po tockovima u barima: prednji levi, prednji desni, zadnji levi, zadnji desni. */
  tyreBar: [number, number, number, number]
  /** Napon akumulatora (V). */
  batteryV: number
  /** Kolicina goriva u litrima (rezervoar Golfa VII 1.6 TDI: 50 l). */
  fuelLiters: number
  parkingBrake: boolean
  windowsClosed: boolean
  washerFluidOk: boolean
  oilLevelOk: boolean
  /** Stepen prenosa (0 = ler, -1 = rikverc); null = nepoznat, procenjuje se iz brzine i obrtaja. */
  gear: number | null
  /** Brisaci podignuti u servisni polozaj. */
  wiperService: boolean
  faults: Fault[]
}

const BASE_MEMORIES: Record<MemoryId, Trip> = {
  sinceStart: { km: 18.4, avgConsumption: 4.9, avgSpeedKmh: 38, minutes: 29 },
  sinceRefuel: { km: 312.7, avgConsumption: 4.6, avgSpeedKmh: 52, minutes: 361 },
  longTerm: { km: 1864.2, avgConsumption: 5.1, avgSpeedKmh: 58, minutes: 1928 },
}

const SEED_FAULTS: Fault[] = devFaults() ?? [
  { id: 'f1', level: 'warn', code: 'bulb', bulb: 'tailRight', area: 'rear' },
  { id: 'f2', level: 'info', code: 'serviceSoon', area: 'engine' },
]

/** Samo u razvoju: `&faults=tailRight,plate,headLeft` — neispravne sijalice za proveru prikaza. */
function devFaults(): Fault[] | null {
  if (!import.meta.env.DEV) return null
  const q = new URLSearchParams(window.location.search).get('faults')
  if (q === null) return null
  return q
    .split(',')
    .filter((b): b is BulbId => (BULBS as readonly string[]).includes(b))
    .map((bulb, i) => ({ id: 'd' + i, level: 'warn' as const, code: 'bulb' as const, bulb, area: 'rear' as const }))
}

const HISTORY = Array.from({ length: 30 }, (_, i) =>
  +(4.6 + Math.sin(i / 3) * 0.9 + Math.cos(i / 7) * 0.5).toFixed(1),
)

const initial: VehicleState = {
  speedKmh: 0,
  rpm: 820,
  coolantC: 88,
  oilC: 92,
  outsideC: 14,
  fuelPercent: 62,
  rangeKm: 517,
  odometerKm: 184230,
  currentConsumption: 0,
  consumptionHistory: HISTORY,
  doors: devDoors(),
  lights: 'auto',
  drl: true,
  rearFog: false,
  climate: storage.read<Climate>('climate', {
    driverC: 21.5,
    passengerC: 22,
    fanLevel: 3,
    ac: true,
    acMax: false,
    auto: true,
    sync: false,
    recirc: false,
    defrost: false,
    rearHeat: false,
    seatHeatLeft: 0,
    seatHeatRight: 0,
    airFlow: 'auto',
  }),
  memories: storage.read<Record<MemoryId, Trip>>('memories', BASE_MEMORIES),
  driveMinutes: 29,
  startStop: 'ready',
  tpms: storage.read<VehicleState['tpms']>('tpms', { status: 'ok', storedAt: '2026-04-12' }),
  tyreBar: [2.4, 2.4, 2.3, 2.3],
  batteryV: 12.6,
  fuelLiters: 31,
  parkingBrake: true,
  windowsClosed: true,
  washerFluidOk: true,
  oilLevelOk: true,
  wiperService: false,
  gear: null,
  faults: SEED_FAULTS,
}

/** Samo u razvoju: `&doors=driver,trunk` otvara vrata za proveru prikaza. */
function devDoors(): Record<DoorId, boolean> {
  const open = import.meta.env.DEV ? (new URLSearchParams(window.location.search).get('doors') ?? '').split(',') : []
  return {
    driver: open.includes('driver'),
    passenger: open.includes('passenger'),
    trunk: open.includes('trunk'),
    bonnet: open.includes('bonnet'),
  }
}

/** Posle ovoliko minuta voznje sistem predlaze pauzu. */
export const REST_AFTER_MINUTES = 120
export const CLIMATE_MIN = 16
export const CLIMATE_MAX = 29.5

/** Potrosnja komfor-potrosaca u l/h (procena fabrickog sistema). */
export function convenienceConsumers(c: Climate): { id: 'ac' | 'rearHeat' | 'seatHeat'; lph: number }[] {
  const list: { id: 'ac' | 'rearHeat' | 'seatHeat'; lph: number }[] = []
  if (c.ac || c.acMax) list.push({ id: 'ac', lph: c.acMax ? 0.4 : 0.2 })
  if (c.rearHeat) list.push({ id: 'rearHeat', lph: 0.1 })
  if (c.seatHeatLeft + c.seatHeatRight > 0)
    list.push({ id: 'seatHeat', lph: +(0.05 * (c.seatHeatLeft + c.seatHeatRight)).toFixed(2) })
  return list
}

export interface VehicleService {
  getState(): VehicleState
  subscribe(listener: (s: VehicleState) => void): () => void
  toggleDoor(id: DoorId): void
  setLights(mode: LightsMode): void
  toggleRearFog(): void
  setClimate(patch: Partial<Climate>): void
  resetMemory(id: MemoryId): void
  storeTyrePressures(): void
  setStartStop(on: boolean): void
  dismissFault(id: string): void
  /** Pokrece proveru pritiska u gumama (kod vozila: komanda bridge-u). */
  checkTyres(): void
  setWiperService(on: boolean): void
}

export function createMockVehicleService(): VehicleService {
  let state = initial
  const listeners = new Set<(s: VehicleState) => void>()
  let t = 0

  function emit() {
    for (const l of listeners) l(state)
  }

  function set(patch: Partial<VehicleState>) {
    state = { ...state, ...patch }
    emit()
  }

  // Podaci iz vozila: delimicne poruke se spajaju sa postojecim stanjem
  let live = false
  bridgeService.on('vehicle', (msg) => {
    const data = (msg as { data?: Partial<VehicleState> }).data
    if (!data || typeof data !== 'object') return
    if (!live) {
      live = true
      stopSimulation()
    }
    set({
      ...data,
      doors: { ...state.doors, ...(data.doors ?? {}) },
      climate: { ...state.climate, ...(data.climate ?? {}) },
      memories: { ...state.memories, ...(data.memories ?? {}) },
    })
  })
  bridgeService.on('disconnect', () => {
    live = false
    if (listeners.size) startSimulation()
  })

  // Simulacija radi samo dok neko slusa; pali se ponovo sa prvim pretplatnikom.
  let timer: number | null = null

  function startSimulation() {
    if (timer !== null || live) return
    timer = window.setInterval(() => {
      t += 1
      const wave = Math.sin(t / 11)
      const sinceStart = state.memories.sinceStart
      set({
        coolantC: Math.round(88 + Math.sin(t / 40) * 3),
        oilC: Math.round(92 + Math.sin(t / 50) * 4),
        batteryV: +(12.6 + Math.sin(t / 30) * 0.15).toFixed(1),
        currentConsumption: +(Math.max(0, 4.4 + wave * 2.2)).toFixed(1),
        memories: {
          ...state.memories,
          sinceStart: { ...sinceStart, avgConsumption: +(4.9 + wave * 0.15).toFixed(1) },
        },
      })
    }, 2000)
  }

  function stopSimulation() {
    if (timer === null) return
    window.clearInterval(timer)
    timer = null
  }

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener)
      listener(state)
      startSimulation()
      return () => {
        listeners.delete(listener)
        if (listeners.size === 0) stopSimulation()
      }
    },
    toggleDoor(id) {
      set({ doors: { ...state.doors, [id]: !state.doors[id] } })
    },
    setLights(mode) {
      set({ lights: mode, drl: mode !== 'off' })
    },
    toggleRearFog() {
      set({ rearFog: !state.rearFog })
    },
    setClimate(patch) {
      const next = { ...state.climate, ...patch }
      next.driverC = Math.min(CLIMATE_MAX, Math.max(CLIMATE_MIN, +next.driverC.toFixed(1)))
      next.passengerC = Math.min(CLIMATE_MAX, Math.max(CLIMATE_MIN, +next.passengerC.toFixed(1)))
      // Sync: suvozac prati vozaca, kao na Climatronic-u
      if (next.sync) next.passengerC = next.driverC
      // Rucna izmena ventilatora ili raspodele gasi AUTO
      if (('fanLevel' in patch || 'airFlow' in patch) && !('auto' in patch)) next.auto = false
      if (patch.auto) next.airFlow = 'auto'
      next.fanLevel = Math.max(0, Math.min(7, Math.round(next.fanLevel)))
      storage.write('climate', next)
      set({ climate: next })
    },
    resetMemory(id) {
      const empty: Trip = { km: 0, avgConsumption: 0, avgSpeedKmh: 0, minutes: 0 }
      const memories = { ...state.memories, [id]: empty }
      storage.write('memories', memories)
      set({ memories, driveMinutes: id === 'sinceStart' ? 0 : state.driveMinutes })
    },
    storeTyrePressures() {
      bridgeService.send({ type: 'command', name: 'tpmsSet' })
      const tpms = { status: 'ok' as const, storedAt: new Date().toISOString().slice(0, 10) }
      storage.write('tpms', tpms)
      set({ tpms })
    },
    setStartStop(on) {
      bridgeService.send({ type: 'command', name: 'startStop', value: on })
      set({ startStop: on ? 'ready' : 'off' })
    },
    dismissFault(id) {
      set({ faults: state.faults.filter((f) => f.id !== id) })
    },
    setWiperService(on) {
      bridgeService.send({ type: 'command', name: 'wiperService', value: on })
      set({ wiperService: on })
    },
    checkTyres() {
      bridgeService.send({ type: 'command', name: 'tpmsCheck' })
    },
  }
}

export const vehicleService = createMockVehicleService()
