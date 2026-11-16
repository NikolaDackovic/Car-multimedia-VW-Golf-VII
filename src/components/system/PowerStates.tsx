import { motion } from 'framer-motion'
import { VwBootLogo } from './VwBootLogo'
import { Icon } from '@/components/ui/Icon'
import { useState, useSyncExternalStore } from 'react'
import { usePower, BOOT_CAR_DELAY_MS, BOOT_DRIVE_MS } from '@/app/power'
import { stage } from '@/features/vehicle/stage'
import { useSettings } from '@/app/settings'
import { useClock, formatDate, formatTime } from '@/hooks/useClock'
import { useT } from '@/hooks/useT'
import { usePref } from '@/hooks/usePrefs'
import { vehicleShortName } from '@/services/vehicle/profile'
import { VehicleView, hasWebGL } from '@/features/vehicle/VehicleView'

/** Potpis ispod znaka: ime marke i slogan iz perioda mog automobila. */
function Wordmark({ delay = 0.9, slogan = true }: { delay?: number; slogan?: boolean }) {
  return (
    <>
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay, duration: 0.7, ease: 'easeOut' }}
        className="mt-9 text-[23px] font-semibold tracking-[0.42em] text-white uppercase"
        style={{ textShadow: '0 0 28px #ffffff38' }}
      >
        Volkswagen
      </motion.p>

      {slogan && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: delay + 0.45, duration: 0.7 }}
          className="mt-3 text-body tracking-[0.3em] text-white/45"
        >
          Das Auto.
        </motion.p>
      )}
    </>
  )
}

const TRACK_W = 320
const CAR_W = 84
const CAR_H = 34

/**
 * Ucitavanje: moj Golf iz 3D modela (profil, tockovi se okrecu) vozi sleva
 * nadesno po tankoj liniji i iza sebe ostavlja plavi trag. Traje koliko i
 * pokretanje. Stalna 3D scena se priprema od prvog trenutka, pa se auto
 * pojavi cim se model ucita.
 */
function BootCar() {
  const st = useSyncExternalStore(stage.subscribe, stage.get)
  const [mountedAt] = useState(() => performance.now())
  const go = st.ready || !hasWebGL()
  // Ne krece pre nego sto se znak pojavi
  const delay = go ? Math.max(0, BOOT_CAR_DELAY_MS - (performance.now() - mountedAt)) / 1000 : 0
  const drive = { delay, duration: BOOT_DRIVE_MS / 1000, ease: [0.45, 0, 0.25, 1] as const }
  return (
    <div className="relative mt-12 h-[36px]" style={{ width: TRACK_W }} aria-hidden="true">
      {/* Put; dok se model ucitava, preko njega prelazi tanak odsjaj */}
      <span className="absolute inset-x-0 bottom-[3px] h-px overflow-hidden bg-white/12">
        {!go && <span className="absolute inset-y-0 left-0 w-1/4 animate-[loading-bar_1.2s_ease-in-out_infinite] bg-white/40" />}
      </span>
      {/* Plavi trag iza auta */}
      <motion.span
        initial={{ scaleX: 0 }}
        animate={{ scaleX: go ? 1 : 0 }}
        transition={drive}
        className="absolute bottom-[3px] left-0 h-[2px] origin-left"
        style={{
          width: TRACK_W - CAR_W / 2,
          background: 'linear-gradient(90deg, transparent, var(--accent))',
          boxShadow: '0 0 10px var(--accent)',
        }}
      />
      <motion.div
        initial={{ x: -CAR_W / 2, opacity: 0 }}
        animate={go ? { x: TRACK_W - CAR_W, opacity: 1 } : { x: -CAR_W / 2, opacity: 0 }}
        transition={{ x: drive, opacity: { delay, duration: 0.35 } }}
        className="absolute bottom-0 left-0"
        style={{ width: CAR_W, height: CAR_H, filter: 'drop-shadow(0 0 6px color-mix(in srgb, var(--accent) 55%, transparent))' }}
      >
        {/* Moj Golf iz 3D modela (desni profil), tockovi se okrecu dok vozi */}
        <VehicleView view="bootSide" bare driving speed={7} snap className="absolute inset-0" />
      </motion.div>
    </div>
  )
}

/**
 * Uvodna animacija.
 *
 * Dizajnirana je u duhu uredjaja iz tog perioda (mirno pojavljivanje znaka,
 * prelaz svetla, bez naglih efekata), ali NIJE potvrdjena replika fabricke
 * animacije Golfa 7 — pouzdanu referencu za nju nisam nasao.
 */
export function BootScreen() {
  const { settings } = useSettings()

  return (
    <motion.div
      key="boot"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="absolute inset-0 z-[45] flex flex-col items-center justify-center bg-black"
    >
      {/* Blago osvetljenje pozadine iza znaka */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.6 }}
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at center, color-mix(in srgb, var(--accent) 12%, transparent) 0%, transparent 60%)',
        }}
      />

      {/* Prelaz svetla ide preko cele povrsine ekrana, a ne preko okvira znaka,
          da se ne vidi kao kvadrat oko loga. */}
      <motion.div
        initial={{ x: '-100%' }}
        animate={{ x: '100%' }}
        transition={{ delay: 0.85, duration: 1.45, ease: 'easeInOut' }}
        className="pointer-events-none absolute inset-0 z-10"
        style={{
          background:
            'linear-gradient(100deg, transparent 32%, #ffffff1f 46%, #ffffff40 50%, #ffffff1f 54%, transparent 68%)',
          mixBlendMode: 'screen',
        }}
      />

      <div className="relative flex flex-col items-center">
        <VwBootLogo variant={settings.bootLogo} size={240} />
        <Wordmark slogan={settings.bootLogo === '2012'} />
        <BootCar />
      </div>
    </motion.div>
  )
}

/** Ekran kada je uredjaj ugasen. Dugme je jedini nacin da se ponovo upali. */
export function PowerOffScreen() {
  const { powerOn } = usePower()
  const { t } = useT()
  return (
    <motion.div
      key="off"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="absolute inset-0 z-[45] flex flex-col items-center justify-center bg-black"
    >
      <button
        type="button"
        onClick={powerOn}
        className="flex size-24 items-center justify-center rounded-full border border-white/25 text-white/70 transition-colors active:text-white"
        aria-label={t.power.turnOn}
      >
        <Icon name="power" size={34} strokeWidth={1.8} />
      </button>
      <p className="mt-6 text-body text-white/60">{t.power.off}</p>
      <p className="mt-1.5 text-small text-white/40">{t.power.offHint}</p>
    </motion.div>
  )
}

/**
 * Mirovanje: interfejs ostaje montiran ispod, prikazuje se samo sat.
 * Dodir bilo gde budi sistem — bez ponovnog ucitavanja aplikacije.
 */
export function StandbyOverlay() {
  const { wake } = usePower()
  const { settings } = useSettings()
  const { t, locale } = useT()
  const now = useClock(1000)
  const [clockStandby] = usePref('display.clockStandby')

  return (
    <motion.div
      key="standby"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      onClick={wake}
      className="absolute inset-0 z-[45] flex cursor-pointer flex-col items-center justify-center bg-black"
    >
      {/* Fabricki: sat u mirovanju samo ako je ukljuceno u Podesavanjima → Ekran */}
      {clockStandby && (
        <>
          <p className="text-[96px] leading-none font-extralight tabular-nums text-white/85">
            {formatTime(now, settings.use24h, locale)}
          </p>
          <p className="mt-3 text-body-lg text-white/55 first-letter:uppercase">{formatDate(now, locale)}</p>
        </>
      )}
      <p className="sr-only">{t.power.standby}</p>
    </motion.div>
  )
}

/** Kontrolisano gasenje: znak se smiruje i gasi zajedno sa ekranom. */
export function ShutdownOverlay() {
  const { settings } = useSettings()

  return (
    <motion.div
      key="shutdown"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="absolute inset-0 z-[45] flex flex-col items-center justify-center bg-black"
    >
      <motion.div
        initial={{ opacity: 1, scale: 1 }}
        animate={{ opacity: 0.08, scale: 0.94 }}
        transition={{ duration: 1, ease: 'easeIn' }}
        className="flex flex-col items-center"
      >
        <VwBootLogo variant={settings.bootLogo} size={168} glow={false} />
        <p className="mt-7 text-body-lg font-semibold tracking-[0.36em] text-white/85 uppercase">
          Volkswagen
        </p>
        <p className="mt-2 text-small tracking-[0.2em] text-white/45">{vehicleShortName}</p>
      </motion.div>
    </motion.div>
  )
}
