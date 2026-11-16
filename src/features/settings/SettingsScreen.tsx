import { useState } from 'react'
import { Icon } from '@/components/ui/Icon'
import { OemButton } from '@/components/oem/controls'
import { ConfirmDialog } from '@/components/oem/Dialog'
import {
  ListNote,
  RowAction,
  RowCheck,
  RowHeader,
  RowInfo,
  RowLink,
  RowSelect,
  RowStep,
  ScrollList,
} from '@/components/oem/List'
import { BOOT_LOGOS } from '@/components/system/VwBootLogo'
import { STARTUP_SCREENS, useNavigation } from '@/app/navigation'
import type { ScreenId } from '@/app/navigation'
import { usePower } from '@/app/power'
import { ACCENTS, DEFAULT_VOLUME, useSettings } from '@/app/settings'
import type { BootLogoId, ThemeId } from '@/app/settings'
import { useScreenTitle, useShell } from '@/app/shell'
import { useAudio } from '@/hooks/useAudio'
import { formatDateShort, formatTime, useClock } from '@/hooks/useClock'
import { usePrefs } from '@/hooks/usePrefs'
import { useT } from '@/hooks/useT'
import { fill, LANGS } from '@/i18n'
import type { Lang } from '@/i18n'
import { audioService } from '@/services/audio'
import { platform } from '@/services/platform'
import { prefsService } from '@/services/prefs'
import type { PrefGroup } from '@/services/prefs'
import { soundService } from '@/services/sound'
import { BluetoothSettings } from '@/features/phone/PhoneScreen'

const set = prefsService.set
const VERSION = '1.0.0'

function Page({ title, children }: { title: string; children: React.ReactNode }) {
  useScreenTitle(title)
  return <>{children}</>
}

/* ------------------------------ Ekran ------------------------------ */

function DisplayPage() {
  const p = usePrefs()
  const { settings, update } = useSettings()
  const { t } = useT()
  return (
    <Page title={t.setup.display}>
      <ScrollList>
        <RowCheck label={t.setup.autoOff} checked={p['display.autoOff']} onChange={(v) => set('display.autoOff', v)} />
        <RowStep
          label={t.setup.brightness}
          value={Math.round(settings.brightness * 10)}
          min={3}
          max={10}
          onChange={(v) => update('brightness', v / 10)}
          format={(v) => v * 10 + '%'}
        />
        <RowSelect
          label={t.setup.dayNight}
          value={settings.theme}
          options={(['day', 'night', 'auto'] as ThemeId[]).map((v) => ({ value: v, label: t.setup[v] }))}
          onSelect={(v) => update('theme', v)}
        />
        <RowCheck label={t.setup.touchTone} checked={settings.touchSounds} onChange={(v) => update('touchSounds', v)} />
        <RowCheck label={t.setup.proximity} checked={p['display.proximity']} onChange={(v) => set('display.proximity', v)} />
        <RowCheck label={t.setup.clockStandby} checked={p['display.clockStandby']} onChange={(v) => set('display.clockStandby', v)} />
        <div className="flex min-h-[84px] items-center gap-4 border-b border-line-soft px-5">
          <span className="flex-1 text-body">{t.setup.accent}</span>
          <div role="radiogroup" aria-label={t.setup.accent} className="flex gap-3">
            {ACCENTS.map((a) => {
              const active = settings.accent === a.value
              return (
                <button
                  key={a.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  aria-label={t.setup.accents[a.labelKey]}
                  onClick={() => update('accent', a.value)}
                  className="flex size-12 items-center justify-center text-black"
                  style={{
                    background: a.value,
                    boxShadow: active ? '0 0 0 3px var(--bg), 0 0 0 5px var(--text-1)' : 'inset 0 0 0 1px #00000040',
                  }}
                >
                  {active && <Icon name="check" size={22} strokeWidth={2.6} />}
                </button>
              )
            })}
          </div>
        </div>
        <RowCheck label={t.setup.hideCursor} checked={settings.hideCursor} onChange={(v) => update('hideCursor', v)} />
      </ScrollList>
    </Page>
  )
}

/* ------------------------------ Vreme i datum ------------------------------ */

function SetTimePage() {
  const p = usePrefs()
  const { settings } = useSettings()
  const { t, locale } = useT()
  const now = useClock()
  const shift = (min: number) => set('time.offsetMin', p['time.offsetMin'] + min)

  const col = (label: string, value: string, delta: number) => (
    <div className="flex flex-col items-center gap-3">
      <span className="text-small text-text-3">{label}</span>
      <OemButton size="lg" aria-label={label + ' +'} onClick={() => shift(delta)} onHold={() => shift(delta)} repeatMs={180} className="!w-24">
        <Icon name="chevron-up" size={28} />
      </OemButton>
      <span className="text-[52px] font-light tabular-nums">{value}</span>
      <OemButton size="lg" aria-label={label + ' −'} onClick={() => shift(-delta)} onHold={() => shift(-delta)} repeatMs={180} className="!w-24">
        <Icon name="chevron-down" size={28} />
      </OemButton>
    </div>
  )

  return (
    <Page title={t.setup.setTime}>
      <div className="flex h-full items-center justify-center gap-16">
        {col(t.setup.hours, String(now.getHours()).padStart(2, '0'), 60)}
        <span className="text-[52px] font-light">:</span>
        {col(t.setup.minutes, String(now.getMinutes()).padStart(2, '0'), 1)}
        <span className="w-10" />
        {col(t.setup.dayLabel, formatDateShort(now, p['time.dateFormat']), 1440)}
      </div>
      <p className="pb-6 text-center text-body text-text-2">
        {formatTime(now, settings.use24h, locale)} · {now.toLocaleDateString(locale, { weekday: 'long' })}
      </p>
    </Page>
  )
}

function TimePage() {
  const p = usePrefs()
  const { settings, update } = useSettings()
  const { path, push } = useNavigation()
  const { t, locale } = useT()
  const now = useClock()
  if (path[1] === 'set') return <SetTimePage />
  const manual = p['time.source'] === 'manual'

  return (
    <Page title={t.setup.time}>
      <ScrollList>
        <RowInfo
          label={t.setup.clock}
          value={`${formatTime(now, settings.use24h, locale)} · ${formatDateShort(now, p['time.dateFormat'])}`}
        />
        <RowSelect
          label={t.setup.source}
          value={p['time.source']}
          options={[
            { value: 'gps', label: t.setup.gps },
            { value: 'manual', label: t.setup.manual },
          ]}
          onSelect={(v) => {
            set('time.source', v)
            if (v === 'gps') set('time.offsetMin', 0)
          }}
        />
        <RowLink label={t.setup.setTime} icon="clock" disabled={!manual} onClick={() => push('set')} />
        <RowSelect
          label={t.setup.format}
          value={settings.use24h ? '24' : '12'}
          options={[
            { value: '24', label: t.setup.format24 },
            { value: '12', label: t.setup.format12 },
          ]}
          onSelect={(v) => update('use24h', v === '24')}
        />
        <RowInfo label={t.setup.zone} value={p['time.zone']} />
        <RowCheck label={t.setup.summer} checked={p['time.summer']} onChange={(v) => set('time.summer', v)} />
        <RowSelect
          label={t.setup.dateFormat}
          value={p['time.dateFormat']}
          options={[
            { value: 'dmy', label: 'DD.MM.GGGG' },
            { value: 'ymd', label: 'GGGG-MM-DD' },
            { value: 'mdy', label: 'MM-DD-GGGG' },
          ]}
          onSelect={(v) => set('time.dateFormat', v)}
        />
        {!manual && <ListNote>{t.setup.manualOnly}</ListNote>}
      </ScrollList>
    </Page>
  )
}

/* ------------------------------ Jezik, tastatura, jedinice ------------------------------ */

function LanguagePage() {
  const { settings, update } = useSettings()
  const { t } = useT()
  return (
    <Page title={t.setup.language}>
      <ScrollList>
        {LANGS.map((l) => (
          <RowCheck
            key={l.id}
            label={l.label}
            checked={settings.language === l.id}
            onChange={() => update('language', l.id as Lang)}
          />
        ))}
      </ScrollList>
    </Page>
  )
}

function KeyboardPage() {
  const p = usePrefs()
  const { t } = useT()
  return (
    <Page title={t.setup.keyboard}>
      <ScrollList>
        <RowSelect
          label={t.setup.layout}
          value={p['kbd.layout']}
          options={[
            { value: 'qwertz', label: t.setup.qwertz },
            { value: 'abc', label: t.setup.abc },
          ]}
          onSelect={(v) => set('kbd.layout', v)}
        />
        <RowCheck label={t.setup.serbianKeys} checked={p['kbd.serbian']} onChange={(v) => set('kbd.serbian', v)} />
      </ScrollList>
    </Page>
  )
}

function UnitsPage() {
  const p = usePrefs()
  const { t } = useT()
  const u = t.units
  return (
    <Page title={t.setup.units}>
      <ScrollList>
        <RowSelect label={t.setup.distance} value={p['units.distance']} options={[{ value: 'km', label: u.km }, { value: 'mi', label: u.mi }]} onSelect={(v) => set('units.distance', v)} />
        <RowSelect label={t.setup.speed} value={p['units.speed']} options={[{ value: 'kmh', label: u.kmh }, { value: 'mph', label: u.mph }]} onSelect={(v) => set('units.speed', v)} />
        <RowSelect label={t.setup.temperature} value={p['units.temp']} options={[{ value: 'c', label: u.c }, { value: 'f', label: u.f }]} onSelect={(v) => set('units.temp', v)} />
        <RowSelect label={t.setup.volume} value={p['units.volume']} options={[{ value: 'l', label: u.l }, { value: 'gal', label: u.gal }]} onSelect={(v) => set('units.volume', v)} />
        <RowSelect
          label={t.setup.consumption}
          value={p['units.consumption']}
          options={[
            { value: 'l100', label: u.l100 },
            { value: 'kml', label: u.kml },
            { value: 'mpg', label: u.mpg },
          ]}
          onSelect={(v) => set('units.consumption', v)}
        />
        <RowSelect
          label={t.setup.pressure}
          value={p['units.pressure']}
          options={[
            { value: 'bar', label: u.bar },
            { value: 'psi', label: u.psi },
            { value: 'kpa', label: u.kpa },
          ]}
          onSelect={(v) => set('units.pressure', v)}
        />
      </ScrollList>
    </Page>
  )
}

/* ------------------------------ Bezbedno uklanjanje, fabricka ------------------------------ */

function SafeRemovePage() {
  const audio = useAudio()
  const { notify } = useShell()
  const { t } = useT()
  const [confirm, setConfirm] = useState(false)
  const hasLocal = audio.queue.some((tr) => tr.src)
  return (
    <Page title={t.setup.safeRemove}>
      <ScrollList>
        <RowAction label={t.setup.safeRemoveUsb} icon="eject" disabled={!hasLocal} onClick={() => setConfirm(true)} />
        <RowAction label={t.media.usb2} icon="eject" disabled onClick={() => undefined} />
        <RowAction label={t.media.sd1} icon="eject" disabled onClick={() => undefined} />
        <RowAction label={t.media.sd2} icon="eject" disabled onClick={() => undefined} />
      </ScrollList>
      <ConfirmDialog
        open={confirm}
        title={t.setup.safeRemove}
        message={t.setup.safeRemoveConfirm}
        onConfirm={() => {
          audioService.setQueue(audio.queue.filter((tr) => !tr.src))
          notify(t.setup.safeRemoveDone)
        }}
        onClose={() => setConfirm(false)}
      />
    </Page>
  )
}

type FactoryGroup = 'all' | 'sound' | 'display' | 'radio' | 'media' | 'phone' | 'vehicle' | 'system'

function FactoryPage() {
  const { reset, update } = useSettings()
  const { notify } = useShell()
  const { t } = useT()
  const [group, setGroup] = useState<FactoryGroup | null>(null)
  const groups: FactoryGroup[] = ['all', 'sound', 'display', 'radio', 'media', 'phone', 'vehicle', 'system']

  function restore(g: FactoryGroup) {
    prefsService.resetGroup(g as PrefGroup)
    if (g === 'all') {
      reset()
      soundService.reset()
      audioService.setMuted(false)
      audioService.setVolume(DEFAULT_VOLUME)
    }
    if (g === 'sound') {
      soundService.reset()
      update('touchSounds', false)
    }
    if (g === 'display') {
      update('theme', 'day')
      update('brightness', 1)
      update('accent', ACCENTS[0].value)
    }
    notify(t.setup.factoryDone)
  }

  return (
    <Page title={t.setup.factory}>
      <ScrollList>
        {groups.map((g) => (
          <RowAction key={g} label={t.setup.factoryGroups[g]} icon="refresh" onClick={() => setGroup(g)} />
        ))}
      </ScrollList>
      <ConfirmDialog
        open={group !== null}
        title={t.setup.factory}
        message={fill(t.setup.factoryConfirm, { group: group ? t.setup.factoryGroups[group] : '' })}
        confirmLabel={t.common.reset}
        onConfirm={() => group && restore(group)}
        onClose={() => setGroup(null)}
      />
    </Page>
  )
}

/* ------------------------------ Informacije ------------------------------ */

function SystemInfoPage() {
  const { t } = useT()
  return (
    <Page title={t.setup.systemInfo}>
      <ScrollList>
        <RowInfo label={t.setup.device} value="Car OS · Golf VII" />
        <RowInfo label={t.setup.softwareVersion} value={VERSION} />
        <RowInfo label={t.setup.platform} value={platform.name} />
        <RowInfo label={t.setup.storage} value={t.setup.storageActive} />
        <RowInfo label={t.setup.vehicleData} value={t.setup.vehicleDataNone} />
      </ScrollList>
    </Page>
  )
}

function UpdatePage() {
  const { notify } = useShell()
  const { t } = useT()
  return (
    <Page title={t.setup.update}>
      <ScrollList>
        <RowInfo label={t.setup.softwareVersion} value={VERSION} />
        <RowAction label={t.setup.checkUpdate} icon="refresh" onClick={() => notify(t.setup.noUpdate)} />
      </ScrollList>
    </Page>
  )
}

function CopyrightPage() {
  const { t } = useT()
  const licenses = [
    ['React', 'MIT'],
    ['Framer Motion', 'MIT'],
    ['Tailwind CSS', 'MIT'],
    ['Vite', 'MIT'],
    ['Barlow (font)', 'SIL Open Font License 1.1'],
    ['three.js', 'MIT'],
    ['React Three Fiber / drei', 'MIT'],
  ]
  return (
    <Page title={t.setup.copyright}>
      <ScrollList>
        <RowHeader>{t.setup.licenses}</RowHeader>
        {licenses.map(([name, lic]) => (
          <RowInfo key={name} label={name} value={lic} />
        ))}
        <RowHeader>3D</RowHeader>
        <ListNote>{t.setup.model3d}</ListNote>
        <ListNote>{t.setup.trademark}</ListNote>
      </ScrollList>
    </Page>
  )
}

/* ------------------------------ Simulacija i razvoj ------------------------------ */

function DeveloperPage() {
  const { settings, update } = useSettings()
  const power = usePower()
  const { t } = useT()
  const startOptions: { value: ScreenId | 'last'; label: string }[] = [
    { value: 'last', label: t.setup.lastOpened },
    ...STARTUP_SCREENS.map((id) => ({ value: id, label: t.nav[id] })),
  ]
  return (
    <Page title={t.setup.developer}>
      <ScrollList>
        <RowHeader>{t.setup.powerSim}</RowHeader>
        <RowInfo label={t.setup.currentState} value={t.power.states[power.state]} />
        <div className="flex gap-2 border-b border-line-soft px-5 py-3">
          <OemButton size="sm" onClick={power.enterStandby} className="flex-1">
            <Icon name="moon" size={18} /> {t.setup.standby}
          </OemButton>
          <OemButton size="sm" onClick={power.restart} className="flex-1">
            <Icon name="refresh" size={18} /> {t.setup.restart}
          </OemButton>
          <OemButton size="sm" onClick={power.shutdown} className="flex-1">
            <Icon name="power" size={18} /> {t.setup.shutdown}
          </OemButton>
        </div>
        <ListNote>{t.setup.powerSimNote}</ListNote>
        <RowCheck label={t.setup.bootAnimation} checked={settings.bootAnimation} onChange={(v) => update('bootAnimation', v)} />
        <RowSelect
          label={t.setup.bootLogo}
          value={settings.bootLogo}
          options={(Object.keys(BOOT_LOGOS) as BootLogoId[]).map((id) => ({
            value: id,
            label: id === '2012' ? `${t.setup.logo2012} — ${t.setup.logo2012Hint}` : `${t.setup.logo2019} — ${t.setup.logo2019Hint}`,
          }))}
          onSelect={(v) => update('bootLogo', v)}
        />
        <RowSelect
          label={t.setup.startupScreen}
          value={settings.startupScreen}
          options={startOptions}
          onSelect={(v) => update('startupScreen', v)}
        />
        <RowInfo label={t.setup.version} value={VERSION} />
      </ScrollList>
    </Page>
  )
}

function BluetoothPage() {
  const { t } = useT()
  return (
    <Page title={t.setup.bluetooth}>
      <BluetoothSettings />
    </Page>
  )
}

/** Podesavanja sistema (fabricki taster SETUP). */
export function SettingsScreen() {
  const { path, push } = useNavigation()
  const { settings } = useSettings()
  const { t } = useT()

  const pages: Record<string, () => React.JSX.Element> = {
    display: DisplayPage,
    time: TimePage,
    language: LanguagePage,
    keyboard: KeyboardPage,
    units: UnitsPage,
    safe: SafeRemovePage,
    factory: FactoryPage,
    bluetooth: BluetoothPage,
    info: SystemInfoPage,
    update: UpdatePage,
    copyright: CopyrightPage,
    developer: DeveloperPage,
  }
  const PageComponent = path[0] ? pages[path[0]] : null

  return (
    <div className="flex h-full flex-col">
      {PageComponent ? (
        <PageComponent />
      ) : (
        <ScrollList>
          <RowLink label={t.setup.display} icon="sun" onClick={() => push('display')} />
          <RowLink label={t.setup.time} icon="clock" onClick={() => push('time')} />
          <RowLink
            label={t.setup.language}
            icon="list"
            value={LANGS.find((l) => l.id === settings.language)?.label}
            onClick={() => push('language')}
          />
          <RowLink label={t.setup.keyboard} icon="keypad" onClick={() => push('keyboard')} />
          <RowLink label={t.setup.units} icon="gauge" onClick={() => push('units')} />
          <RowLink label={t.setup.safeRemove} icon="eject" onClick={() => push('safe')} />
          <RowLink label={t.setup.factory} icon="refresh" onClick={() => push('factory')} />
          <RowLink label={t.setup.bluetooth} icon="bluetooth" onClick={() => push('bluetooth')} />
          <RowLink label={t.setup.voice} icon="message" disabled onClick={() => undefined} />
          <RowLink label={t.setup.systemInfo} icon="info" onClick={() => push('info')} />
          <RowLink label={t.setup.update} icon="refresh" onClick={() => push('update')} />
          <RowLink label={t.setup.copyright} icon="info" onClick={() => push('copyright')} />
          <RowLink label={t.setup.developer} icon="wrench" onClick={() => push('developer')} />
        </ScrollList>
      )}
    </div>
  )
}
