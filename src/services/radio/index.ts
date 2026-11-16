import { storage } from '@/services/storage'

/**
 * Radio, po fabrickom MIB2 radiju (Composition Media).
 *
 * VAZNO: u uredjaju nema tjunera. Ovo je simulirani tjuner — opsezi,
 * frekvencije, memorije, lista stanica, Scan i radiotekst rade kao na
 * fabrickom uredjaju, ali se signal ne prima i zvuk ne izlazi. Lista
 * stanica je unapred uneta (demo), nije rezultat stvarnog skeniranja.
 *
 * Kada se doda pravi tjuner (USB RTL-SDR ili automobilski modul), menja se
 * samo implementacija ovog servisa.
 */
export type Band = 'fm' | 'am' | 'dab'

export interface Station {
  id: string
  band: Band
  name: string
  /** FM: MHz (98.6), AM: kHz (684), DAB: redni broj u ansamblu. */
  freq: number
  /** DAB: kanal i naziv ansambla. */
  ensemble?: string
  channel?: string
  /** Program type (zanr) za sortiranje liste. */
  genre: string
  /** Stanica emituje saobracajne informacije (TP). */
  tp: boolean
  /** Simulirani radiotekst koji stanica "salje". */
  radiotext: string[]
}

export type AudioSourceId = 'radio' | 'media' | 'bluetooth'

export interface RadioState {
  band: Band
  stations: Station[]
  /** Trenutna frekvencija po opsegu (DAB: id stanice). */
  freq: { fm: number; am: number; dab: string }
  /** Memorije: po opsegu 15 mesta, vrednost je id stanice ili null. */
  presets: Record<Band, (string | null)[]>
  /** Trenutno podesena stanica (ako frekvencija odgovara stanici). */
  current?: Station
  /** Scan (automatsko prelistavanje stanica po ~5 s) je aktivan. */
  scanning: boolean
  /** Indeks radioteksta koji se trenutno prikazuje. */
  rtIndex: number
}

export const FM_MIN = 87.5
export const FM_MAX = 108
export const FM_STEP = 0.1
export const AM_MIN = 531
export const AM_MAX = 1602
export const AM_STEP = 9
export const PRESET_COUNT = 15
export const PRESETS_PER_PAGE = 5
const SCAN_MS = 5000

const SEED: Station[] = [
  { id: 'fm1', band: 'fm', name: 'Radio Beograd 1', freq: 94.5, genre: 'Informativni', tp: true, radiotext: ['Radio Beograd 1 — Vesti', 'Saobracaj: prohodno na svim gradskim saobracajnicama'] },
  { id: 'fm2', band: 'fm', name: 'Radio S', freq: 95.7, genre: 'Pop', tp: false, radiotext: ['Radio S — Najbolja domaca muzika'] },
  { id: 'fm3', band: 'fm', name: 'Naxi', freq: 96.3, genre: 'Pop', tp: false, radiotext: ['Naxi Radio — Live'] },
  { id: 'fm4', band: 'fm', name: 'Play Radio', freq: 98.6, genre: 'Pop', tp: false, radiotext: ['Play Radio — Hit lista', 'Sada: Kavinsky — Nightcall'] },
  { id: 'fm5', band: 'fm', name: 'Hit FM', freq: 93.1, genre: 'Pop', tp: false, radiotext: ['Hit FM — Samo hitovi'] },
  { id: 'fm6', band: 'fm', name: 'TDI Radio', freq: 100.0, genre: 'Dance', tp: false, radiotext: ['TDI Radio — Dance'] },
  { id: 'fm7', band: 'fm', name: 'Radio Beograd 202', freq: 104.0, genre: 'Rock', tp: true, radiotext: ['Radio Beograd 202 — Muzika i vesti'] },
  { id: 'fm8', band: 'fm', name: 'B92', freq: 92.5, genre: 'Rock', tp: false, radiotext: ['B92 — Muzika'] },
  { id: 'fm9', band: 'fm', name: 'Radio Beograd 2', freq: 104.7, genre: 'Klasicna', tp: false, radiotext: ['Radio Beograd 2 — Kultura'] },
  { id: 'fm10', band: 'fm', name: 'Radio Novosti', freq: 100.8, genre: 'Informativni', tp: true, radiotext: ['Radio Novosti — Informacije'] },
  { id: 'am1', band: 'am', name: 'Radio Beograd 1', freq: 684, genre: 'Informativni', tp: false, radiotext: [] },
  { id: 'am2', band: 'am', name: 'AM 1008', freq: 1008, genre: 'Ostalo', tp: false, radiotext: [] },
  { id: 'dab1', band: 'dab', name: 'RB1 DAB+', freq: 1, ensemble: 'DAB+ Beograd', channel: '12C', genre: 'Informativni', tp: true, radiotext: ['Radio Beograd 1 — DAB+'] },
  { id: 'dab2', band: 'dab', name: 'RB2 DAB+', freq: 2, ensemble: 'DAB+ Beograd', channel: '12C', genre: 'Klasicna', tp: false, radiotext: ['Radio Beograd 2 — DAB+'] },
  { id: 'dab3', band: 'dab', name: 'RB3 DAB+', freq: 3, ensemble: 'DAB+ Beograd', channel: '12C', genre: 'Kultura', tp: false, radiotext: ['Radio Beograd 3 — DAB+'] },
  { id: 'dab4', band: 'dab', name: 'RB 202 DAB+', freq: 4, ensemble: 'DAB+ Beograd', channel: '12C', genre: 'Rock', tp: true, radiotext: ['Radio Beograd 202 — DAB+'] },
]

function emptyPresets(): (string | null)[] {
  return Array.from({ length: PRESET_COUNT }, () => null)
}

const SEED_PRESETS: Record<Band, (string | null)[]> = {
  fm: ['fm1', 'fm2', 'fm3', 'fm4', 'fm5', 'fm6', 'fm7', 'fm8', null, null, null, null, null, null, null],
  am: ['am1', null, null, null, null, null, null, null, null, null, null, null, null, null, null],
  dab: ['dab1', 'dab2', 'dab3', 'dab4', null, null, null, null, null, null, null, null, null, null, null],
}

function uid(): string {
  return 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5)
}

export function formatFreq(band: Band, freq: number): string {
  if (band === 'am') return freq + ' kHz'
  if (band === 'fm') return freq.toFixed(1) + ' MHz'
  return ''
}

export interface RadioService {
  getState(): RadioState
  subscribe(listener: (s: RadioState) => void): () => void
  setBand(band: Band): void
  /** Rucno podesavanje frekvencije (FM/AM). */
  setFreq(freq: number): void
  step(direction: 1 | -1): void
  /** Strelice < >: kroz memorije ili kroz listu stanica (Podesavanja → Tasteri sa strelicama). */
  arrow(direction: 1 | -1, mode: 'presets' | 'stations'): void
  selectStation(id: string): void
  selectPreset(slot: number): void
  /** Dugi pritisak na memoriju: upisuje trenutnu stanicu. */
  savePreset(slot: number): void
  clearPreset(slot: number): void
  clearAllPresets(): void
  startScan(): void
  stopScan(): void
  nextRadiotext(): void
  renameStation(id: string, name: string): void
}

export function createSimulatedRadioService(): RadioService {
  let stations = storage.read<Station[]>('radio.stations.v2', SEED)
  let band = storage.read<Band>('radio.band', 'fm')
  let freq = storage.read<RadioState['freq']>('radio.freq', { fm: 98.6, am: 684, dab: 'dab1' })
  let presets = storage.read<Record<Band, (string | null)[]>>('radio.presets', SEED_PRESETS)
  let scanning = false
  let rtIndex = 0
  let scanTimer: number | null = null
  let rtTimer: number | null = null
  const listeners = new Set<(s: RadioState) => void>()

  function current(): Station | undefined {
    if (band === 'dab') return stations.find((s) => s.id === freq.dab)
    const f = band === 'fm' ? freq.fm : freq.am
    return stations.find((s) => s.band === band && Math.abs(s.freq - f) < (band === 'fm' ? 0.05 : 1))
  }

  function snapshot(): RadioState {
    return { band, stations, freq, presets, current: current(), scanning, rtIndex }
  }

  function emit() {
    const state = snapshot()
    for (const l of listeners) l(state)
  }

  function commit() {
    storage.write('radio.stations.v2', stations)
    storage.write('radio.band', band)
    storage.write('radio.freq', freq)
    storage.write('radio.presets', presets)
    rtIndex = 0
    emit()
  }

  function bandStations(): Station[] {
    return stations.filter((s) => s.band === band).sort((a, b) => a.freq - b.freq)
  }

  function tuneTo(station: Station) {
    if (station.band !== band) band = station.band
    if (station.band === 'dab') freq = { ...freq, dab: station.id }
    else freq = { ...freq, [station.band]: station.freq }
  }

  function stopScanTimer() {
    if (scanTimer !== null) {
      window.clearInterval(scanTimer)
      scanTimer = null
    }
  }

  // Radiotekst se smenjuje kao na pravom RDS-u
  function ensureRtTimer() {
    if (rtTimer !== null) return
    rtTimer = window.setInterval(() => {
      const c = current()
      if (c && c.radiotext.length > 1) {
        rtIndex = (rtIndex + 1) % c.radiotext.length
        emit()
      }
    }, 6000)
  }

  const service: RadioService = {
    getState: snapshot,
    subscribe(listener) {
      listeners.add(listener)
      listener(snapshot())
      ensureRtTimer()
      return () => listeners.delete(listener)
    },
    setBand(next) {
      service.stopScan()
      band = next
      commit()
    },
    setFreq(next) {
      if (band === 'fm') freq = { ...freq, fm: Math.min(FM_MAX, Math.max(FM_MIN, +next.toFixed(1))) }
      else if (band === 'am') {
        const snapped = AM_MIN + Math.round((next - AM_MIN) / AM_STEP) * AM_STEP
        freq = { ...freq, am: Math.min(AM_MAX, Math.max(AM_MIN, snapped)) }
      }
      commit()
    },
    step(direction) {
      if (band === 'fm') service.setFreq(freq.fm + direction * FM_STEP)
      else if (band === 'am') service.setFreq(freq.am + direction * AM_STEP)
      else service.arrow(direction, 'stations')
    },
    arrow(direction, mode) {
      service.stopScan()
      if (mode === 'presets') {
        const list = presets[band]
          .map((id) => stations.find((s) => s.id === id))
          .filter((s): s is Station => Boolean(s))
        if (list.length === 0) return service.arrow(direction, 'stations')
        const cur = current()
        const i = cur ? list.findIndex((s) => s.id === cur.id) : -1
        tuneTo(list[(i + direction + list.length) % list.length])
      } else {
        const list = bandStations()
        if (list.length === 0) return
        const cur = current()
        let next: Station
        if (cur) {
          const i = list.findIndex((s) => s.id === cur.id)
          next = list[(i + direction + list.length) % list.length]
        } else {
          const f = band === 'fm' ? freq.fm : freq.am
          next =
            direction === 1
              ? (list.find((s) => s.freq > f) ?? list[0])
              : ([...list].reverse().find((s) => s.freq < f) ?? list[list.length - 1])
        }
        tuneTo(next)
      }
      commit()
    },
    selectStation(id) {
      const station = stations.find((s) => s.id === id)
      if (!station) return
      service.stopScan()
      tuneTo(station)
      commit()
    },
    selectPreset(slot) {
      const id = presets[band][slot]
      if (id) service.selectStation(id)
    },
    savePreset(slot) {
      let station = current()
      if (!station) {
        if (band === 'dab') return
        // Rucno podesena frekvencija bez stanice u listi — pravi se nova stavka
        const f = band === 'fm' ? freq.fm : freq.am
        station = {
          id: uid(),
          band,
          name: band === 'fm' ? 'FM ' + f.toFixed(1) : 'AM ' + f,
          freq: f,
          genre: 'Ostalo',
          tp: false,
          radiotext: [],
        }
        stations = [...stations, station]
      }
      const list = [...presets[band]]
      list[slot] = station.id
      presets = { ...presets, [band]: list }
      commit()
    },
    clearPreset(slot) {
      const list = [...presets[band]]
      list[slot] = null
      presets = { ...presets, [band]: list }
      commit()
    },
    clearAllPresets() {
      presets = { ...presets, [band]: emptyPresets() }
      commit()
    },
    startScan() {
      stopScanTimer()
      scanning = true
      service.arrow(1, 'stations')
      scanning = true
      emit()
      scanTimer = window.setInterval(() => {
        const list = bandStations()
        const cur = current()
        if (list.length === 0) return
        const i = cur ? list.findIndex((s) => s.id === cur.id) : -1
        tuneTo(list[(i + 1) % list.length])
        commit()
      }, SCAN_MS)
    },
    stopScan() {
      if (!scanning) return
      stopScanTimer()
      scanning = false
      emit()
    },
    nextRadiotext() {
      const c = current()
      if (c && c.radiotext.length > 1) {
        rtIndex = (rtIndex + 1) % c.radiotext.length
        emit()
      }
    },
    renameStation(id, name) {
      stations = stations.map((s) => (s.id === id ? { ...s, name: name.trim() || s.name } : s))
      commit()
    },
  }
  return service
}

export const radioService: RadioService = createSimulatedRadioService()
