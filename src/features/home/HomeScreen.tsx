import { useState } from 'react'
import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { AlbumArt } from '@/components/ui/AlbumArt'
import { Icon } from '@/components/ui/Icon'
import type { IconName } from '@/components/ui/Icon'
import { MenuIcon } from '@/components/oem/MenuIcon'
import type { MenuIconName } from '@/components/oem/MenuIcon'
import { Dialog } from '@/components/oem/Dialog'
import { OemButton } from '@/components/oem/controls'
import { useNavigation } from '@/app/navigation'
import type { ScreenId } from '@/app/navigation'
import { useSettings } from '@/app/settings'
import { useAudio } from '@/hooks/useAudio'
import { formatDuration } from '@/hooks/useClock'
import { usePhone } from '@/hooks/usePhone'
import { usePrefs } from '@/hooks/usePrefs'
import { useRadio } from '@/hooks/useRadio'
import { useT } from '@/hooks/useT'
import { audioService } from '@/services/audio'
import { FAVORITE_SLOTS, phoneService } from '@/services/phone'
import type { Contact } from '@/services/phone'
import { PRESETS_PER_PAGE, formatFreq, radioService } from '@/services/radio'
import { MiniMap } from '@/features/navigation/MiniMap'

/** Plocica pocetnog ekrana: tanak sivi okvir, naslov gore, dodir na naslov otvara meni. */
function Tile({
  title,
  icon,
  screen,
  className = '',
  children,
}: {
  title: string
  icon: MenuIconName
  screen: ScreenId
  className?: string
  children: ReactNode
}) {
  const { go } = useNavigation()
  return (
    <section className={'card relative flex min-h-0 flex-col overflow-hidden ' + className}>
      <button
        type="button"
        onClick={() => go(screen)}
        className="relative z-10 flex h-12 shrink-0 items-center gap-2.5 border-b border-line-soft bg-black/40 px-4 text-left active:bg-surface-2"
      >
        <MenuIcon name={icon} size={26} />
        <span className="text-body text-text-2">{title}</span>
        <Icon name="chevron-right" size={18} className="ml-auto text-text-3" />
      </button>
      {children}
    </section>
  )
}

function Control({ icon, label, onClick, primary = false }: { icon: IconName; label: string; onClick: () => void; primary?: boolean }) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      data-active={primary}
      whileTap={{ scale: 0.95 }}
      transition={{ duration: 0.08 }}
      onClick={onClick}
      className="oem-btn flex h-14 flex-1 items-center justify-center"
    >
      <Icon name={icon} size={primary ? 28 : 24} strokeWidth={primary ? 2.2 : 1.8} />
    </motion.button>
  )
}

/* ------------------------------ Navigacija (levo) ------------------------------ */

function NavigationTile() {
  const { go } = useNavigation()
  const { t } = useT()
  return (
    <Tile title={t.nav.navigation} icon="navigation" screen="navigation" className="row-span-2">
      <button type="button" aria-label={t.nav.navigation} onClick={() => go('navigation')} className="relative flex-1">
        <MiniMap className="absolute inset-0" />
        <span className="overlay-panel absolute top-4 left-4 flex items-center gap-3.5 py-2.5 pr-5 pl-2.5">
          <span className="flex size-12 items-center justify-center rounded-[10px] bg-accent text-on-accent">
            <Icon name="chevron-right" size={28} strokeWidth={2.4} />
          </span>
          <span className="text-left">
            <span className="block text-[26px] leading-none font-semibold tabular-nums">400 m</span>
            <span className="mt-1 block text-small text-text-2">{t.navigation.turnRight}</span>
          </span>
        </span>
        <span className="overlay-panel absolute top-4 right-4 flex h-8 items-center px-3 text-micro font-semibold tracking-[0.12em] text-text-2 uppercase">
          {t.navigation.demoBadge}
        </span>
        <span className="overlay-panel absolute inset-x-4 bottom-4 flex items-center py-3 text-left tabular-nums">
          <span className="flex flex-1 items-center gap-3 px-4">
            <Icon name="home" size={22} className="text-accent-ink" />
            <span>
              <span className="block text-caption text-text-3">{t.navigation.destination}</span>
              <span className="block text-body-lg font-medium">{t.navigation.places.home}</span>
            </span>
          </span>
          {[
            [t.navigation.remaining, '12,4 km'],
            [t.navigation.time, '17 min'],
            [t.navigation.arrival, '18:42'],
          ].map(([label, value]) => (
            <span key={label} className="border-l border-line px-5 text-right">
              <span className="block text-caption text-text-3">{label}</span>
              <span className="block text-body-lg font-medium">{value}</span>
            </span>
          ))}
        </span>
      </button>
    </Tile>
  )
}

/* ------------------------------ Radio / Medija (gore desno) ------------------------------ */

function AudioTile() {
  const { settings } = useSettings()
  const audio = useAudio()
  const radio = useRadio()
  const prefs = usePrefs()
  const { t } = useT()
  const isRadio = settings.audioSource !== 'media'
  const track = audio.queue[audio.index]
  const station = radio.current
  const freq = radio.band === 'fm' ? radio.freq.fm : radio.freq.am
  const presets = radio.presets[radio.band].slice(0, PRESETS_PER_PAGE)
  const progress = audio.durationSec > 0 ? Math.min(100, (audio.positionSec / audio.durationSec) * 100) : 0

  if (!isRadio) {
    return (
      <Tile title={`${t.nav.media} · ${t.media.usb1}`} icon="media" screen="media">
        <div className="flex min-h-0 flex-1 items-center gap-5 px-5">
          <AlbumArt track={track} size={120} rounded={2} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[26px] leading-tight font-light">{track?.title ?? t.home.noTrack}</p>
            <p className="mt-1 truncate text-body text-text-2">{track?.artist ?? '—'}</p>
            <div className="mt-4 h-[5px] w-full bg-surface-3">
              <div className="h-full bg-accent" style={{ width: progress + '%' }} />
            </div>
            <div className="mt-1 flex justify-between text-caption text-text-3 tabular-nums">
              <span>{formatDuration(audio.positionSec)}</span>
              <span>-{formatDuration(Math.max(0, audio.durationSec - audio.positionSec))}</span>
            </div>
          </div>
        </div>
        <div className="prox flex gap-2 border-t border-line-soft p-3">
          <Control icon="prev" label={t.media.prevTrack} onClick={() => audioService.previous()} />
          <Control icon={audio.playing ? 'pause' : 'play'} label={audio.playing ? t.media.pause : t.media.play} onClick={() => audioService.toggle()} primary />
          <Control icon="next" label={t.media.nextTrack} onClick={() => audioService.next()} />
        </div>
      </Tile>
    )
  }

  return (
    <Tile title={`${t.nav.radio} · ${t.radio[radio.band]}`} icon="radio" screen="radio">
      <div className="flex min-h-0 flex-1 items-center gap-3 px-3">
        <OemButton size="lg" aria-label={t.radio.prev} onClick={() => radioService.arrow(-1, prefs['radio.arrows'])} className="!h-16 !w-16 !px-0">
          <Icon name="chevron-left" size={30} />
        </OemButton>
        <div className="min-w-0 flex-1 text-center">
          <p className="truncate text-[30px] leading-tight font-light">{station?.name ?? t.home.noStation}</p>
          <p className="mt-1 text-body text-text-2 tabular-nums">
            {radio.band === 'dab' ? (station?.ensemble ?? '—') : formatFreq(radio.band, freq)}
          </p>
          <p className="mt-1 h-5 truncate text-small text-text-3">
            {prefs['radio.radiotext'] && station?.radiotext.length ? station.radiotext[radio.rtIndex % station.radiotext.length] : ''}
          </p>
        </div>
        <OemButton size="lg" aria-label={t.radio.next} onClick={() => radioService.arrow(1, prefs['radio.arrows'])} className="!h-16 !w-16 !px-0">
          <Icon name="chevron-right" size={30} />
        </OemButton>
      </div>
      <div className="prox flex gap-1.5 border-t border-line-soft p-2.5">
        {presets.map((id, slot) => {
          const st = radio.stations.find((s) => s.id === id)
          const active = Boolean(st && st.id === station?.id)
          return (
            <button
              key={slot}
              type="button"
              disabled={!st}
              onClick={() => radioService.selectPreset(slot)}
              className={'flex h-14 min-w-0 flex-1 flex-col items-center justify-center rounded-[10px] px-1 ' + (active ? 'oem-frame' : 'border border-line')}
              style={{ background: 'var(--key-bg)', borderRadius: 'var(--radius-btn)' }}
            >
              <span className="text-micro text-text-3">{slot + 1}</span>
              <span className={'w-full truncate text-center text-caption ' + (active ? 'text-accent-ink' : st ? 'text-text-1' : 'text-text-disabled')}>
                {st?.name ?? '—'}
              </span>
            </button>
          )
        })}
      </div>
    </Tile>
  )
}

/* ------------------------------ Favoriti (dole desno) ------------------------------ */

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

function FavoritesTile() {
  const phone = usePhone()
  const { go } = useNavigation()
  const { t } = useT()
  const [calling, setCalling] = useState<Contact | null>(null)
  const slots = Array.from({ length: FAVORITE_SLOTS }, (_, i) => phone.contacts.find((c) => c.id === phone.favorites[i]))

  return (
    <Tile title={`${t.nav.phone} · ${t.home.favorites}`} icon="phone" screen="phone">
      <p className="flex items-center gap-2 px-4 pt-3 text-caption text-text-3">
        <Icon name="bluetooth" size={14} /> {t.home.noPhone}
      </p>
      <div className="grid min-h-0 flex-1 grid-cols-2 gap-2 p-3">
        {slots.map((c, i) =>
          c ? (
            <button
              key={i}
              type="button"
              onClick={() => {
                phoneService.logDialAttempt(c.name, c.number, c.id)
                setCalling(c)
              }}
              className="oem-btn flex min-w-0 items-center gap-3 px-3"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-line-strong bg-surface-3 text-small font-semibold">
                {initials(c.name)}
              </span>
              <span className="min-w-0 text-left">
                <span className="block truncate text-body">{c.name}</span>
                <span className="block truncate text-caption text-text-3 tabular-nums">{c.number}</span>
              </span>
            </button>
          ) : (
            <button
              key={i}
              type="button"
              onClick={() => go('phone')}
              className="flex items-center justify-center gap-2 rounded-[10px] border border-dashed border-line text-small text-text-3"
            >
              <Icon name="plus" size={18} /> {t.home.assign}
            </button>
          ),
        )}
      </div>
      <Dialog
        open={calling !== null}
        title={t.phone.callNotPossible}
        onClose={() => setCalling(null)}
        actions={
          <OemButton className="flex-1" active onClick={() => setCalling(null)}>
            {t.common.ok}
          </OemButton>
        }
      >
        <p className="px-5 py-6 text-body leading-relaxed">{t.phone.callNotPossibleText}</p>
      </Dialog>
    </Tile>
  )
}

/** Pocetni ekran: levo navigacija, gore desno radio (aktivni izvor), dole desno favoriti. */
export function HomeScreen() {
  return (
    <div className="grid h-full grid-cols-[1fr_500px] grid-rows-[1.1fr_1fr] gap-3 p-4">
      <NavigationTile />
      <AudioTile />
      <FavoritesTile />
    </div>
  )
}
