import { useEffect, useRef } from 'react'
import { Icon } from '@/components/ui/Icon'
import type { IconName } from '@/components/ui/Icon'
import { useNavigation } from '@/app/navigation'
import { useSettings } from '@/app/settings'
import { useShell } from '@/app/shell'
import { useAudio } from '@/hooks/useAudio'
import { useClock, formatTime } from '@/hooks/useClock'
import { usePhone } from '@/hooks/usePhone'
import { usePrefs } from '@/hooks/usePrefs'
import { useT } from '@/hooks/useT'
import { useUnits } from '@/hooks/useUnits'
import { useVehicle } from '@/hooks/useVehicle'

/** Dugme u levom delu naslovne trake (nazad, pocetna, meni) — 96 px sirine, lako za dodir i u voznji. */
function NavButton({ icon, label, onClick }: { icon: IconName; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex h-full w-[96px] shrink-0 items-center justify-center border-r border-line-soft text-text-1 active:bg-surface-2 active:text-accent"
    >
      <Icon name={icon} size={icon === 'chevron-left' ? 30 : 24} strokeWidth={icon === 'chevron-left' ? 2 : 1.8} />
    </button>
  )
}

/**
 * Naslovna traka fabrickog ekrana: nazad i pocetna (na pocetnoj: meni),
 * naziv menija, funkcijska dugmad ekrana i statusna traka (veza telefona,
 * utisan zvuk, spoljna temperatura, sat).
 */
export function TitleBar() {
  const { screen, back, go } = useNavigation()
  const { title, setActionsEl } = useShell()
  const { settings } = useSettings()
  const { t, locale } = useT()
  const audio = useAudio()
  const vehicle = useVehicle()
  const { connected } = usePhone()
  const prefs = usePrefs()
  const units = useUnits()
  const now = useClock()
  const actionsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setActionsEl(actionsRef.current)
    return () => setActionsEl(null)
  }, [setActionsEl])

  const outside = units.temp(vehicle.outsideC)
  const muted = audio.muted || audio.volume === 0

  return (
    <header className="relative flex h-[56px] shrink-0 items-center">
      {screen === 'home' ? (
        <NavButton icon="grid" label={t.nav.menu} onClick={() => go('menu')} />
      ) : (
        <>
          <NavButton icon="chevron-left" label={t.common.back} onClick={back} />
          <NavButton icon="home" label={t.nav.home} onClick={() => go('home')} />
        </>
      )}

      <h1 className="min-w-0 truncate pl-5 text-title font-medium">{title ?? t.nav[screen]}</h1>

      <div ref={actionsRef} className="ml-auto flex items-center gap-2 pl-4" />

      <div className="flex shrink-0 items-center gap-4 pr-5 pl-5 text-text-2">
        {muted && (
          <span role="img" aria-label={t.status.muted}>
            <Icon name="volume-off" size={20} className="text-text-1" />
          </span>
        )}
        {prefs['phone.bt'] && (
          <span role="img" aria-label={connected ? 'Bluetooth' : t.status.phoneNotConnected}>
            <Icon name="bluetooth" size={19} className={connected ? 'text-text-1' : 'opacity-40'} />
          </span>
        )}
        <span className="text-body tabular-nums">
          {outside.value} {outside.unit}
        </span>
        <span className="text-title font-medium text-text-1 tabular-nums">
          {formatTime(now, settings.use24h, locale)}
        </span>
      </div>

      <span
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-px"
        style={{ background: 'linear-gradient(to right, var(--line-soft), var(--line-strong) 50%, var(--line-soft))' }}
      />
    </header>
  )
}
