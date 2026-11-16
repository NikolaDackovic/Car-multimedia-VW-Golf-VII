import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { SettingsProvider, devStartPath, devStartScreen, useSettings } from './settings'
import { NavigationProvider } from './navigation'
import type { ScreenId } from './navigation'
import { PowerProvider } from './power'
import { ShellProvider } from './shell'
import { audioService } from '@/services/audio'
import { prefsService } from '@/services/prefs'

/**
 * Navigacija i napajanje zavise od podesavanja (pocetni ekran, pamcenje
 * poslednjeg, uvodna animacija), pa se montiraju unutar SettingsProvider-a.
 */
function SystemProviders({ children }: { children: ReactNode }) {
  const { settings, update } = useSettings()
  const [devScreen] = useState(devStartScreen)
  const initial: ScreenId =
    devScreen ??
    (settings.startupScreen === 'last' ? settings.lastScreen : settings.startupScreen)

  // Sacuvana glasnoca se primenjuje pri pokretanju, ali najvise do
  // "Maksimalne glasnoce pri ukljucivanju" (Zvuk → Glasnoca), kao na fabrickom uredjaju.
  useEffect(() => {
    const maxOn = prefsService.getState()['sound.maxOn'] / 30
    audioService.setVolume(Math.min(settings.volume, maxOn))
    // namerno samo pri montiranju: dalje promene idu direktno kroz servis
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <PowerProvider skipBoot={!settings.bootAnimation || devScreen !== null}>
      <NavigationProvider initial={initial} initialPath={devScreen ? devStartPath() : []} onChange={(screen) => update('lastScreen', screen)}>
        <ShellProvider>{children}</ShellProvider>
      </NavigationProvider>
    </PowerProvider>
  )
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SettingsProvider>
      <SystemProviders>{children}</SystemProviders>
    </SettingsProvider>
  )
}
