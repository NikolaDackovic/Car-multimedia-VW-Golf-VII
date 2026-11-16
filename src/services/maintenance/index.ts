import { storage } from '@/services/storage'

/**
 * Servisna evidencija — jedino mesto u ekranu vozila gde podaci NISU simulirani:
 * ja ih unosim rucno i cuvaju se na uredjaju.
 *
 * Procena sledeceg servisa racuna se iz poslednjeg zapisa i izabranog intervala.
 * To je moja racunica, a ne fabricki servisni interval iz vozila.
 */
export type ServiceKind = 'ulje' | 'inspekcija' | 'filteri' | 'kocnice' | 'gume' | 'tehnicki' | 'ostalo'

export interface ServiceRecord {
  id: string
  kind: ServiceKind
  note: string
  /** ISO datum (yyyy-mm-dd) */
  date: string
  odometerKm: number
}

export interface MaintenanceState {
  records: ServiceRecord[]
  /** Interval do sledeceg servisa u kilometrima. */
  intervalKm: number
  /** Interval u mesecima. */
  intervalMonths: number
}

/** Vrste zapisa, redosledom kojim se nude u formi. Nazivi su u prevodima (t.service.kinds). */
export const SERVICE_KINDS: ServiceKind[] = ['ulje', 'inspekcija', 'filteri', 'kocnice', 'gume', 'tehnicki', 'ostalo']

/** VW fiksni servis za Golf VII: inspekcija na 2 godine ili 30.000 km. */
export const INSPECTION_KM = 30000
export const INSPECTION_MONTHS = 24

const SEED: ServiceRecord[] = [
  { id: 'r1', kind: 'ulje', note: 'Zamena ulja i filtera', date: '2026-04-12', odometerKm: 178400 },
  { id: 'r2', kind: 'filteri', note: 'Filter kabine', date: '2026-04-12', odometerKm: 178400 },
  { id: 'r3', kind: 'inspekcija', note: 'Redovna inspekcija', date: '2025-05-20', odometerKm: 163900 },
]

function uid(): string {
  return 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5)
}

export interface MaintenanceService {
  getState(): MaintenanceState
  subscribe(listener: (s: MaintenanceState) => void): () => void
  addRecord(record: Omit<ServiceRecord, 'id'>): void
  removeRecord(id: string): void
  setInterval(km: number, months: number): void
}

export function createMaintenanceService(): MaintenanceService {
  let state: MaintenanceState = {
    records: storage.read<ServiceRecord[]>('serviceRecords', SEED),
    intervalKm: storage.read<number>('serviceIntervalKm', 15000),
    intervalMonths: storage.read<number>('serviceIntervalMonths', 12),
  }
  const listeners = new Set<(s: MaintenanceState) => void>()

  function commit(next: MaintenanceState) {
    state = next
    storage.write('serviceRecords', state.records)
    storage.write('serviceIntervalKm', state.intervalKm)
    storage.write('serviceIntervalMonths', state.intervalMonths)
    for (const l of listeners) l(state)
  }

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener)
      listener(state)
      return () => listeners.delete(listener)
    },
    addRecord(record) {
      const next = [{ ...record, id: uid() }, ...state.records].sort((a, b) =>
        b.date.localeCompare(a.date),
      )
      commit({ ...state, records: next })
    },
    removeRecord(id) {
      commit({ ...state, records: state.records.filter((r) => r.id !== id) })
    },
    setInterval(km, months) {
      commit({ ...state, intervalKm: km, intervalMonths: months })
    },
  }
}

export const maintenanceService = createMaintenanceService()

export interface ServiceEstimate {
  dueKm: number | null
  remainingKm: number | null
  dueDate: string | null
  /** Preostalo dana do roka (negativno = prekoraceno). */
  remainingDays: number | null
}

function estimateFrom(
  state: MaintenanceState,
  kind: ServiceKind,
  intervalKm: number,
  intervalMonths: number,
  odometerKm: number,
): ServiceEstimate {
  const last = state.records
    .filter((r) => r.kind === kind)
    .sort((a, b) => b.odometerKm - a.odometerKm)[0]
  if (!last) return { dueKm: null, remainingKm: null, dueDate: null, remainingDays: null }
  const dueKm = last.odometerKm + intervalKm
  const date = new Date(last.date)
  date.setMonth(date.getMonth() + intervalMonths)
  const remainingDays = Math.round((date.getTime() - Date.now()) / 86_400_000)
  return {
    dueKm,
    remainingKm: dueKm - odometerKm,
    dueDate: date.toISOString().slice(0, 10),
    remainingDays,
  }
}

/** Zamena ulja: poslednja zamena + izabrani interval (fleksibilni ili fiksni servis). */
export function nextServiceEstimate(state: MaintenanceState, odometerKm: number): ServiceEstimate {
  return estimateFrom(state, 'ulje', state.intervalKm, state.intervalMonths, odometerKm)
}

/** Inspekcija: poslednja inspekcija + 30.000 km / 24 meseca. */
export function nextInspectionEstimate(state: MaintenanceState, odometerKm: number): ServiceEstimate {
  return estimateFrom(state, 'inspekcija', INSPECTION_KM, INSPECTION_MONTHS, odometerKm)
}
