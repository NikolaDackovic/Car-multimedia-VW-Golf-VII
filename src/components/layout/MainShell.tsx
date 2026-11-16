import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, MotionConfig, motion } from 'framer-motion'
import { TitleBar } from './TitleBar'
import { Viewport } from './Viewport'
import { useNavigation } from '@/app/navigation'
import type { ScreenId } from '@/app/navigation'
import { useSettings } from '@/app/settings'
import { usePower } from '@/app/power'
import { usePrefs } from '@/hooks/usePrefs'
import { useShell } from '@/app/shell'
import { changeVolume } from '@/app/volume'
import { audioService } from '@/services/audio'
import { radioService } from '@/services/radio'
import {
  BootScreen,
  PowerOffScreen,
  ShutdownOverlay,
  StandbyOverlay,
} from '@/components/system/PowerStates'
import { Toast, VolumeOverlay } from '@/components/system/Overlays'
import { Keyboard } from '@/components/oem/Keyboard'
import { VehicleStage, preload3D } from '@/features/vehicle/VehicleView'
import { ParkingOverlay } from '@/features/parking/ParkingOverlay'
import { parkingService } from '@/services/parking'
import { bridgeService } from '@/services/bridge'
import { useParking } from '@/hooks/useParking'
import { HomeScreen } from '@/features/home/HomeScreen'
import { MenuScreen } from '@/features/menu/MenuScreen'
import { RadioScreen } from '@/features/radio/RadioScreen'
import { MediaScreen } from '@/features/media/MediaScreen'
import { PhoneScreen } from '@/features/phone/PhoneScreen'
import { AppConnectScreen } from '@/features/appconnect/AppConnectScreen'
import { VehicleScreen } from '@/features/vehicle/VehicleScreen'
import { AssistScreen } from '@/features/assist/AssistScreen'
import { SoundScreen } from '@/features/sound/SoundScreen'
import { SettingsScreen } from '@/features/settings/SettingsScreen'
import { NavigationScreen } from '@/features/navigation/NavigationScreen'
import { PicturesScreen } from '@/features/pictures/PicturesScreen'
import { ClimateScreen } from '@/features/climate/ClimateScreen'
import { InstrumentsScreen } from '@/features/instruments/InstrumentsScreen'

const SCREEN_COMPONENTS: Record<ScreenId, () => React.JSX.Element> = {
  home: HomeScreen,
  menu: MenuScreen,
  radio: RadioScreen,
  media: MediaScreen,
  phone: PhoneScreen,
  appconnect: AppConnectScreen,
  vehicle: VehicleScreen,
  assist: AssistScreen,
  sound: SoundScreen,
  settings: SettingsScreen,
  navigation: NavigationScreen,
  pictures: PicturesScreen,
  climate: ClimateScreen,
  instruments: InstrumentsScreen,
}

const AUTO_OFF_MS = 10_000
const PROXIMITY_MS = 8_000

/** Kratak "klik" pri dodiru (Podesavanja → Ekran → Ton potvrde). */
let audioCtx: AudioContext | null = null
function playTick() {
  try {
    audioCtx ??= new AudioContext()
    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    osc.frequency.value = 1850
    gain.gain.setValueAtTime(0.06, audioCtx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.05)
    osc.connect(gain).connect(audioCtx.destination)
    osc.start()
    osc.stop(audioCtx.currentTime + 0.05)
  } catch {
    /* bez audio konteksta nema tona — nije greska */
  }
}

/**
 * Ekran: naslovna traka i aktivni meni. Ostaje montiran i tokom mirovanja,
 * pa je budjenje trenutno.
 */
function Screen() {
  const { screen } = useNavigation()
  const Component = SCREEN_COMPONENTS[screen]
  return (
    <>
      <TitleBar />
      <main className="relative min-h-0 flex-1 overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={screen}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
            className="absolute inset-0"
          >
            <Component />
          </motion.div>
        </AnimatePresence>
      </main>
    </>
  )
}

export function MainShell() {
  const { settings } = useSettings()
  const prefs = usePrefs()
  const power = usePower()
  const { state, shellMounted } = power
  const { go } = useNavigation()
  const { showVolume, keyboard } = useShell()
  const [screenOff, setScreenOff] = useState(false)
  const idleTimer = useRef<number | null>(null)
  const proxTimer = useRef<number | null>(null)

  const autoOff = prefs['display.autoOff'] && state === 'ready'
  const proximity = prefs['display.proximity'] && state === 'ready'

  // Neaktivnost: iskljucivanje ekrana posle 10 s i "rezim prikaza" senzora priblizavanja
  useEffect(() => {
    const root = document.documentElement
    const arm = () => {
      if (idleTimer.current !== null) window.clearTimeout(idleTimer.current)
      if (proxTimer.current !== null) window.clearTimeout(proxTimer.current)
      root.dataset.proximity = 'near'
      if (autoOff) idleTimer.current = window.setTimeout(() => setScreenOff(true), AUTO_OFF_MS)
      if (proximity) proxTimer.current = window.setTimeout(() => (root.dataset.proximity = 'far'), PROXIMITY_MS)
    }
    arm()
    const events = ['pointerdown', 'pointermove', 'keydown', 'wheel'] as const
    for (const e of events) window.addEventListener(e, arm, { passive: true })
    return () => {
      for (const e of events) window.removeEventListener(e, arm)
      if (idleTimer.current !== null) window.clearTimeout(idleTimer.current)
      if (proxTimer.current !== null) window.clearTimeout(proxTimer.current)
      root.dataset.proximity = 'near'
    }
  }, [autoOff, proximity])

  // Fizicki tasteri multimedije (MENU, HOME, napajanje, glasnoca) stizu kao
  // dogadjaji tastature/HID-a — ovde se mapiraju na funkcije sistema.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (keyboard) return
      switch (e.key) {
        case 'AudioVolumeUp':
        case 'F8':
          changeVolume(1)
          showVolume()
          break
        case 'AudioVolumeDown':
        case 'F7':
          changeVolume(-1)
          showVolume()
          break
        case 'AudioVolumeMute':
        case 'F6':
          audioService.setMuted(!audioService.getState().muted)
          showVolume()
          break
        case 'Home':
        case 'F2':
          go('home')
          break
        case 'ContextMenu':
        case 'F1':
          go('menu')
          break
        // Taster P (ParkPilot) na konzoli
        case 'F3':
          parkingService.pressKey()
          break
        // Rikverc za probu bez vozila (u autu stize od bridge-a)
        case 'F4':
          parkingService.setReverse(!parkingService.getState().reverse)
          break
        case 'PowerOff':
        case 'F12':
          if (power.state === 'ready') power.enterStandby()
          else if (power.state === 'standby') power.wake()
          else if (power.state === 'off') power.powerOn()
          break
        default:
          return
      }
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [keyboard, go, showVolume, power])

  // 3D model vozila se ucitava odmah pri pokretanju (dok traje uvodni ekran),
  // pa je ekran Vozilo spreman bez cekanja
  useEffect(() => {
    preload3D()
    bridgeService.start()
  }, [])

  // Tasteri sa volana (MFL) i kontakt brava stizu od bridge-a iz vozila
  useEffect(() => {
    const offKey = bridgeService.on('key', (msg) => {
      const key = (msg as { key?: string }).key
      const radio = settings.audioSource !== 'media'
      switch (key) {
        case 'volUp':
          changeVolume(1)
          showVolume()
          break
        case 'volDown':
          changeVolume(-1)
          showVolume()
          break
        case 'mute':
          audioService.setMuted(!audioService.getState().muted)
          showVolume()
          break
        case 'next':
          if (radio) radioService.arrow(1, prefs['radio.arrows'])
          else audioService.next()
          break
        case 'prev':
          if (radio) radioService.arrow(-1, prefs['radio.arrows'])
          else audioService.previous()
          break
        case 'menu':
          go('menu')
          break
        case 'home':
          go('home')
          break
      }
    })
    // Kontakt: iskljucen → mirovanje (ekran sa satom), ukljucen → budjenje
    const offPower = bridgeService.on('vehicle', (msg) => {
      const ignition = (msg as { data?: { ignition?: boolean } }).data?.ignition
      if (ignition === false && power.state === 'ready') power.enterStandby()
      if (ignition === true && power.state === 'standby') power.wake()
    })
    return () => {
      offKey()
      offPower()
    }
  }, [settings.audioSource, prefs, go, showVolume, power])

  // Rikverc / ParkPilot pali ugaseni ekran
  const park = useParking()
  useEffect(() => {
    if (park.visible) setScreenOff(false)
  }, [park.visible])

  // Ton potvrde pri dodiru interaktivnih elemenata
  useEffect(() => {
    if (!settings.touchSounds) return
    const onDown = (e: PointerEvent) => {
      const el = e.target as HTMLElement | null
      if (el?.closest('button:not(:disabled), [role="button"], [role="slider"], [role="checkbox"]')) playTick()
    }
    window.addEventListener('pointerdown', onDown)
    return () => window.removeEventListener('pointerdown', onDown)
  }, [settings.touchSounds])

  return (
    // Animacije postuju sistemsko podesavanje 'smanji pokrete'
    <MotionConfig reducedMotion="user">
      <Viewport>
        <div className="flex h-full bg-bg">
          {/* Fizicki tasteri (MENU, HOME, ⏻, + / −) su na samoj multimediji — ekran zauzima celu povrsinu */}
          <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
            {/* Stalna 3D scena vozila — priprema se odmah, ekrani je samo pozajmljuju */}
            <VehicleStage />
            {shellMounted && <Screen />}

            <VolumeOverlay />
            <Toast />
            <div id="oem-layer" className="pointer-events-none absolute inset-0 z-30" />
            <Keyboard />
            {(state === 'ready' || state === 'standby') && <ParkingOverlay />}

            <AnimatePresence>
              {state === 'off' && <PowerOffScreen />}
              {/* Isti ekran ostaje i dok se interfejs priprema — bez ponovnog pojavljivanja znaka */}
              {(state === 'booting' || state === 'initializing') && <BootScreen key="boot" />}
              {state === 'standby' && <StandbyOverlay />}
              {state === 'shutting-down' && <ShutdownOverlay />}
            </AnimatePresence>

            {/* Ekran iskljucen posle 10 s — prvi dodir ga samo pali, ne aktivira dugme ispod */}
            {screenOff && (
              <div
                className="absolute inset-0 z-50 bg-black"
                onPointerDown={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setScreenOff(false)
                }}
              />
            )}
          </div>
        </div>

        {/* Softversko zatamnjenje kada platforma ne podrzava hardversku osvetljenost */}
        {settings.brightness < 1 && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-[60] bg-black"
            style={{ opacity: 1 - settings.brightness }}
          />
        )}
      </Viewport>
    </MotionConfig>
  )
}
