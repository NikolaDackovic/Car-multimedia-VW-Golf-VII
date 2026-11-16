import { storage } from '@/services/storage'

/**
 * Podesavanja infotainment sistema i vozila, po fabrickom meniju MIB2
 * (VW Golf VII, Composition Media / Discover Media).
 *
 * VAZNO: podesavanja vozila (svetla, ogledala, sistemi za pomoc...) se
 * cuvaju i prikazuju kao na fabrickom uredjaju, ali se NE salju automobilu —
 * sistem nema vezu sa CAN magistralom. Kada se doda hardver, servis koji
 * razgovara sa vozilom cita ove vrednosti.
 *
 * Kljucevi su grupisani prefiksom (npr. `light.`), pa "Fabricka podesavanja"
 * mogu da vrate samo jednu grupu, kao na pravom uredjaju.
 */
export interface Prefs {
  // ---- Vozilo: ESC i gume
  'esc.mode': 'on' | 'sport' | 'off'
  'tyres.winterWarn': boolean
  'tyres.winterSpeed': number

  // ---- Sistemi za pomoc vozacu
  'assist.acc.lastDistance': boolean
  'assist.acc.program': 'eco' | 'normal' | 'sport'
  'assist.acc.distance': number
  'assist.front.active': boolean
  'assist.front.warning': boolean
  'assist.front.distanceWarning': boolean
  'assist.front.cityBrake': boolean
  'assist.lane.active': boolean
  'assist.lane.adaptive': boolean
  'assist.sign.mfd': boolean
  'assist.sign.trailer': boolean
  'assist.driverAlert': boolean
  'assist.proactive': boolean

  // ---- Parkiranje i manevrisanje (ParkPilot)
  'park.autoActivate': boolean
  'park.frontVolume': number
  'park.frontTone': number
  'park.rearVolume': number
  'park.rearTone': number
  'park.audioReduction': boolean
  /** Pomocne linije na slici kamere za voznju unazad. */
  'park.guidelines': boolean

  // ---- Oprema i veza sa vozilom (podesava se jednom, pri ugradnji)
  /** Sta je ugradjeno: samo senzori, samo kamera ili oboje. */
  'hw.park': 'sensors' | 'camera' | 'both' | 'none'
  /** Senzori i napred (8 senzora) ili samo pozadi (4 senzora). */
  'hw.parkFront': boolean
  /** ID video uredjaja (USB kamera / video grabber); prazno = prvi pronadjen. */
  'hw.cameraId': string
  /** Ogledalska slika (vecina naknadnih kamera vec salje ogledalsku sliku). */
  'hw.cameraMirror': boolean
  /** Veza sa programom koji cita vozilo (CAN, ulazi) na Linux racunaru. */
  'hw.bridge': boolean
  'hw.bridgeUrl': string

  // ---- Svetla
  'light.assist': boolean
  'light.dynamicBend': boolean
  'light.rainAuto': boolean
  'light.laneFlash': boolean
  'light.switchOn': 'early' | 'medium' | 'late'
  'light.travelMode': boolean
  'light.courtesy': boolean
  'light.doorAmbient': number
  'light.footwell': number
  'light.comingHome': number
  'light.leavingHome': number

  // ---- Ogledala i brisaci
  'mirrors.sync': boolean
  'mirrors.lowerReverse': boolean
  'mirrors.foldParked': boolean
  'wipers.autoRain': boolean
  'wipers.rearReverse': boolean

  // ---- Otvaranje i zatvaranje
  'open.convenience': boolean
  'open.rainClose': boolean
  'open.unlock': 'all' | 'single' | 'side'
  'open.autoLock': boolean

  // ---- Sedista
  'seat.memoryKey': boolean
  'seat.beltLeft': boolean
  'seat.beltRight': boolean

  // ---- Multifunkcionalni displej (MFD)
  'mfd.currentConsumption': boolean
  'mfd.avgConsumption': boolean
  'mfd.refuelVolume': boolean
  'mfd.ecoTips': boolean
  'mfd.travelTime': boolean
  'mfd.distance': boolean
  'mfd.avgSpeed': boolean
  'mfd.digitalSpeed': boolean
  'mfd.speedWarning': boolean
  'mfd.speedWarningValue': number
  'mfd.oilTemp': boolean

  // ---- Jedinice
  'units.distance': 'km' | 'mi'
  'units.speed': 'kmh' | 'mph'
  'units.temp': 'c' | 'f'
  'units.volume': 'l' | 'gal'
  'units.consumption': 'l100' | 'kml' | 'mpg'
  'units.pressure': 'bar' | 'psi' | 'kpa'

  // ---- Vreme i datum
  'time.source': 'gps' | 'manual'
  'time.summer': boolean
  'time.zone': string
  'time.dateFormat': 'dmy' | 'ymd' | 'mdy'
  /** Rucna korekcija sata u minutima (kada je izvor vremena "rucno"). */
  'time.offsetMin': number

  // ---- Ekran
  'display.autoOff': boolean
  'display.proximity': boolean
  'display.clockStandby': boolean

  // ---- Tastatura
  'kbd.layout': 'qwertz' | 'abc'
  'kbd.serbian': boolean

  // ---- Zvuk (glasnoce)
  'sound.announce': number
  'sound.maxOn': number
  'sound.gala': number
  'sound.aux': 'low' | 'medium' | 'high'
  'sound.bt': 'low' | 'medium' | 'high'

  // ---- Radio
  'radio.arrows': 'presets' | 'stations'
  'radio.tp': boolean
  'radio.radiotext': boolean
  'radio.af': boolean
  'radio.rds': boolean
  'radio.regional': 'fixed' | 'auto'
  'radio.logoAuto': boolean
  'radio.dabTraffic': boolean
  'radio.dabOther': boolean
  'radio.dabFollow': boolean
  'radio.dabToFm': boolean

  // ---- Medija
  'media.subfolders': boolean
  'media.slideshowSec': number

  // ---- Telefon / Bluetooth
  'phone.bt': boolean
  'phone.visible': boolean
  'phone.name': string
  'phone.btAudio': boolean
  'phone.sort': 'last' | 'first'
  'phone.ringtone': number
  'phone.reminder': boolean
  'phone.pictures': boolean
  'phone.voicemail': string

  // ---- App-Connect
  'app.vwData': boolean
  'app.mirrorlinkHints': boolean
}

export type PrefKey = keyof Prefs

export const PREF_DEFAULTS: Prefs = {
  'esc.mode': 'on',
  'tyres.winterWarn': false,
  'tyres.winterSpeed': 160,

  'assist.acc.lastDistance': true,
  'assist.acc.program': 'normal',
  'assist.acc.distance': 3,
  'assist.front.active': true,
  'assist.front.warning': true,
  'assist.front.distanceWarning': true,
  'assist.front.cityBrake': true,
  'assist.lane.active': true,
  'assist.lane.adaptive': false,
  'assist.sign.mfd': true,
  'assist.sign.trailer': false,
  'assist.driverAlert': true,
  'assist.proactive': true,

  'park.autoActivate': true,
  'park.frontVolume': 5,
  'park.frontTone': 5,
  'park.rearVolume': 5,
  'park.rearTone': 5,
  'park.audioReduction': true,
  'park.guidelines': true,

  'hw.park': 'sensors',
  'hw.parkFront': true,
  'hw.cameraId': '',
  'hw.cameraMirror': false,
  'hw.bridge': true,
  'hw.bridgeUrl': 'ws://127.0.0.1:8765',

  'light.assist': false,
  'light.dynamicBend': true,
  'light.rainAuto': true,
  'light.laneFlash': true,
  'light.switchOn': 'medium',
  'light.travelMode': false,
  'light.courtesy': true,
  'light.doorAmbient': 60,
  'light.footwell': 60,
  'light.comingHome': 30,
  'light.leavingHome': 10,

  'mirrors.sync': true,
  'mirrors.lowerReverse': false,
  'mirrors.foldParked': true,
  'wipers.autoRain': true,
  'wipers.rearReverse': true,

  'open.convenience': true,
  'open.rainClose': false,
  'open.unlock': 'all',
  'open.autoLock': true,

  'seat.memoryKey': false,
  'seat.beltLeft': true,
  'seat.beltRight': true,

  'mfd.currentConsumption': true,
  'mfd.avgConsumption': true,
  'mfd.refuelVolume': true,
  'mfd.ecoTips': true,
  'mfd.travelTime': true,
  'mfd.distance': true,
  'mfd.avgSpeed': true,
  'mfd.digitalSpeed': false,
  'mfd.speedWarning': false,
  'mfd.speedWarningValue': 130,
  'mfd.oilTemp': true,

  'units.distance': 'km',
  'units.speed': 'kmh',
  'units.temp': 'c',
  'units.volume': 'l',
  'units.consumption': 'l100',
  'units.pressure': 'bar',

  'time.source': 'gps',
  'time.summer': true,
  'time.zone': 'UTC+01:00 Beograd',
  'time.dateFormat': 'dmy',
  'time.offsetMin': 0,

  'display.autoOff': false,
  'display.proximity': true,
  'display.clockStandby': true,

  'kbd.layout': 'qwertz',
  'kbd.serbian': true,

  'sound.announce': 18,
  'sound.maxOn': 20,
  'sound.gala': 2,
  'sound.aux': 'medium',
  'sound.bt': 'medium',

  'radio.arrows': 'presets',
  'radio.tp': true,
  'radio.radiotext': true,
  'radio.af': true,
  'radio.rds': true,
  'radio.regional': 'auto',
  'radio.logoAuto': true,
  'radio.dabTraffic': true,
  'radio.dabOther': false,
  'radio.dabFollow': true,
  'radio.dabToFm': true,

  'media.subfolders': true,
  'media.slideshowSec': 5,

  'phone.bt': true,
  'phone.visible': true,
  'phone.name': 'Golf VII',
  'phone.btAudio': true,
  'phone.sort': 'first',
  'phone.ringtone': 1,
  'phone.reminder': true,
  'phone.pictures': true,
  'phone.voicemail': '',

  'app.vwData': true,
  'app.mirrorlinkHints': true,
}

/** Grupe za "Fabricka podesavanja" — svaka vraca kljuceve sa ovim prefiksima. */
export const PREF_GROUPS = {
  assist: ['assist.'],
  park: ['park.'],
  light: ['light.'],
  mirrors: ['mirrors.', 'wipers.'],
  open: ['open.'],
  seat: ['seat.'],
  mfd: ['mfd.'],
  vehicle: ['esc.', 'tyres.', 'assist.', 'park.', 'light.', 'mirrors.', 'wipers.', 'open.', 'seat.', 'mfd.', 'units.'],
  sound: ['sound.'],
  display: ['display.'],
  radio: ['radio.'],
  media: ['media.'],
  phone: ['phone.'],
  system: ['time.', 'kbd.', 'units.', 'display.', 'app.'],
  all: [''],
} as const

export type PrefGroup = keyof typeof PREF_GROUPS

export interface PrefsService {
  getState(): Prefs
  subscribe(listener: (s: Prefs) => void): () => void
  set<K extends PrefKey>(key: K, value: Prefs[K]): void
  resetGroup(group: PrefGroup): void
}

export function createPrefsService(): PrefsService {
  let state: Prefs = { ...PREF_DEFAULTS, ...storage.read<Partial<Prefs>>('prefs', {}) }
  const listeners = new Set<(s: Prefs) => void>()

  function commit(next: Prefs) {
    state = next
    storage.write('prefs', state)
    for (const l of listeners) l(state)
  }

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener)
      listener(state)
      return () => listeners.delete(listener)
    },
    set(key, value) {
      if (state[key] === value) return
      commit({ ...state, [key]: value })
    },
    resetGroup(group) {
      const prefixes: readonly string[] = PREF_GROUPS[group]
      const next = { ...state }
      for (const key of Object.keys(PREF_DEFAULTS) as PrefKey[]) {
        if (prefixes.some((p) => key.startsWith(p))) {
          ;(next as Record<string, unknown>)[key] = PREF_DEFAULTS[key]
        }
      }
      commit(next)
    },
  }
}

export const prefsService: PrefsService = createPrefsService()
