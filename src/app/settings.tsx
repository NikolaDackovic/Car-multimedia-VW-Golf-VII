import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { storage } from '@/services/storage'
import { SCREENS } from './navigation'
import type { ScreenId } from './navigation'
import type { AudioSourceId } from '@/services/radio'
import type { Lang } from '@/i18n'

/** Prikaz ekrana kao na fabrickom uredjaju: Dan, Noc ili Automatski (po dobu dana). */
export type ThemeId = 'day' | 'night' | 'auto'
const THEMES: ThemeId[] = ['day', 'night', 'auto']

/** 2012 = hromirani znak iz perioda mog Golfa, 2019 = ravni znak novije generacije. */
export type BootLogoId = '2012' | '2019'

export const ACCENTS = [
  { id: 'vw-blue', labelKey: 'vwBlue', value: '#1a9ddd' },
  { id: 'night-blue', labelKey: 'nightBlue', value: '#4a74cf' },
  { id: 'ice', labelKey: 'ice', value: '#c8d6e2' },
  { id: 'amber', labelKey: 'amber', value: '#e8a33d' },
  { id: 'red', labelKey: 'red', value: '#e2554f' },
  { id: 'oem-yellow', labelKey: 'oemYellow', value: '#e6d41c' },
] as const

export interface Settings {
  theme: ThemeId
  accent: string
  /** Softversko zatamnjenje interfejsa 0.3–1 */
  brightness: number
  volume: number
  use24h: boolean
  startupScreen: ScreenId | 'last'
  lastScreen: ScreenId
  hideCursor: boolean
  touchSounds: boolean
  /** Uvodna animacija pri pokretanju aplikacije */
  bootAnimation: boolean
  /** Koji Volkswagen znak se prikazuje pri pokretanju */
  bootLogo: BootLogoId
  /** Verzija izbora znaka — pri prelasku na novi (ravni) znak menja se jednom. */
  bootLogoVersion?: number
  /** Ime lokalnog profila */
  userName: string
  /** Poslednji izabran izvor zvuka */
  audioSource: AudioSourceId
  /** Jezik interfejsa */
  language: Lang
}

/**
 * Samo u razvoju: `?screen=vehicle` otvara ekran direktno, bez uvodne
 * animacije — za brzu proveru i snimke ekrana. Ne upisuje se u sacuvana
 * podesavanja. U produkciji uvek vraca null.
 */
export function devStartScreen(): ScreenId | null {
  if (!import.meta.env.DEV) return null
  const screen = new URLSearchParams(window.location.search).get('screen')
  return screen && (SCREENS as readonly string[]).includes(screen) ? (screen as ScreenId) : null
}

/** Samo u razvoju: `&path=status` otvara podmeni ekrana (segmenti odvojeni zarezom). */
export function devStartPath(): string[] {
  if (!import.meta.env.DEV) return []
  const p = new URLSearchParams(window.location.search).get('path')
  return p ? p.split(',') : []
}

/** Samo u razvoju: `&theme=night&lang=en&source=radio` za snimke ekrana. */
function devOverrides(): Partial<Settings> {
  if (!import.meta.env.DEV) return {}
  const q = new URLSearchParams(window.location.search)
  const out: Partial<Settings> = {}
  const theme = q.get('theme')
  if (theme === 'day' || theme === 'night' || theme === 'auto') out.theme = theme
  const lang = q.get('lang')
  if (lang === 'sr' || lang === 'en') out.language = lang
  const source = q.get('source')
  if (source === 'media' || source === 'radio' || source === 'bluetooth') out.audioSource = source
  return out
}

function nightNow(): boolean {
  const h = new Date().getHours()
  return h >= 20 || h < 6
}

/** Stare vrednosti (tamna/svetla tema, uklonjeni ekrani) prevode se u nove. */
function migrate(s: Settings): Settings {
  const out = { ...s }
  if (!THEMES.includes(out.theme)) out.theme = 'day'
  // Novi (ravni) VW znak postaje podrazumevan; posle toga vazi izbor iz Podesavanja
  if (out.bootLogoVersion !== 2) {
    out.bootLogo = '2019'
    out.bootLogoVersion = 2
  }
  if (!(SCREENS as readonly string[]).includes(out.lastScreen)) out.lastScreen = 'home'
  if (out.startupScreen !== 'last' && !(SCREENS as readonly string[]).includes(out.startupScreen))
    out.startupScreen = 'home'
  return out
}

/** Pocetna glasnoca aplikacije (0–1). */
export const DEFAULT_VOLUME = 0.6

const DEFAULTS: Settings = {
  theme: 'day',
  accent: ACCENTS[0].value,
  brightness: 1,
  volume: DEFAULT_VOLUME,
  use24h: true,
  startupScreen: 'home',
  lastScreen: 'home',
  hideCursor: false,
  touchSounds: false,
  bootAnimation: true,
  bootLogo: '2019',
  bootLogoVersion: 2,
  userName: 'Vozac',
  audioSource: 'radio',
  language: 'sr',
}

interface SettingsContextValue {
  settings: Settings
  update: <K extends keyof Settings>(key: K, value: Settings[K]) => void
  reset: () => void
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() => migrate({
    ...DEFAULTS,
    ...storage.read<Partial<Settings>>('settings', {}),
    ...devOverrides(),
  }))
  const [isNight, setIsNight] = useState(nightNow)

  // Automatski prikaz: noc izmedju 20 i 6 h, proverava se svake minute
  useEffect(() => {
    if (settings.theme !== 'auto') return
    const id = window.setInterval(() => setIsNight(nightNow()), 60_000)
    return () => window.clearInterval(id)
  }, [settings.theme])

  // Jedan efekat koji primenjuje podešavanja na dokument i pamti ih.
  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme =
      settings.theme === 'auto' ? (isNight ? 'night' : 'day') : settings.theme
    // Jezik dokumenta prati izbor — citac ekrana i rastavljanje reci rade ispravno
    root.lang = settings.language
    root.style.setProperty('--accent', settings.accent)
    root.style.setProperty('--accent-soft', `${settings.accent}26`)
    root.style.setProperty('--accent-line', `${settings.accent}80`)
    document.body.dataset.hideCursor = String(settings.hideCursor)
    storage.write('settings', settings)
  }, [settings, isNight])

  const update = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((prev) => (prev[key] === value ? prev : { ...prev, [key]: value }))
  }, [])

  const reset = useCallback(() => setSettings(DEFAULTS), [])

  const value = useMemo(() => ({ settings, update, reset }), [settings, update, reset])
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings mora biti unutar SettingsProvider')
  return ctx
}
