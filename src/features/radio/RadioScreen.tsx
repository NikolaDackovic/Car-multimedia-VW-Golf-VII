import { useEffect, useMemo, useRef, useState } from 'react'
import { Icon } from '@/components/ui/Icon'
import {
  BarButton,
  FunctionBar,
  OemButton,
  PageDots,
  TitleActions,
  TitleButton,
} from '@/components/oem/controls'
import { ConfirmDialog, OptionsDialog } from '@/components/oem/Dialog'
import { ListNote, RowCheck, RowHeader, RowLink, RowSelect, ScrollList } from '@/components/oem/List'
import { useNavigation } from '@/app/navigation'
import { useSettings } from '@/app/settings'
import { useScreenTitle, useShell } from '@/app/shell'
import { useLongPress } from '@/hooks/useLongPress'
import { usePrefs } from '@/hooks/usePrefs'
import { useRadio } from '@/hooks/useRadio'
import { useT } from '@/hooks/useT'
import { fill } from '@/i18n'
import { prefsService } from '@/services/prefs'
import { audioService } from '@/services/audio'
import {
  AM_MAX,
  AM_MIN,
  FM_MAX,
  FM_MIN,
  PRESET_COUNT,
  PRESETS_PER_PAGE,
  formatFreq,
  radioService,
} from '@/services/radio'
import type { Band, Station } from '@/services/radio'

const HOLD_MS = 700

/** Memorija: kratak dodir bira stanicu, drzanje upisuje trenutnu (uz traku koja se puni). */
function PresetKey({ slot, station, active }: { slot: number; station?: Station; active: boolean }) {
  const { t } = useT()
  const { notify } = useShell()
  const [holding, setHolding] = useState(false)
  const press = useLongPress({
    holdMs: HOLD_MS,
    onClick: () => {
      setHolding(false)
      if (station) radioService.selectPreset(slot)
      else radioService.savePreset(slot)
    },
    onHold: () => {
      setHolding(false)
      radioService.savePreset(slot)
      notify(fill(t.radio.saved, { n: slot + 1 }))
    },
  })

  return (
    <button
      type="button"
      aria-label={(station ? station.name + ', ' : '') + t.radio.presets + ' ' + (slot + 1)}
      aria-pressed={active}
      {...press}
      onPointerDown={(e) => {
        setHolding(true)
        press.onPointerDown(e)
      }}
      onPointerUp={() => {
        setHolding(false)
        press.onPointerUp()
      }}
      onPointerLeave={() => {
        setHolding(false)
        press.onPointerLeave()
      }}
      className={[
        'relative flex h-[84px] flex-1 flex-col justify-center overflow-hidden px-3 text-left',
        active ? 'oem-frame' : 'border border-line',
      ].join(' ')}
      style={{ background: 'var(--key-bg)', borderRadius: 'var(--radius-btn)' }}
    >
      <span className="absolute top-1.5 left-2.5 text-caption text-text-3 tabular-nums">{slot + 1}</span>
      {station ? (
        <span className="mt-2 block truncate text-center">
          <span className={'block truncate text-body font-medium ' + (active ? 'text-accent-ink' : '')}>
            {station.name}
          </span>
          <span className="block text-caption text-text-3 tabular-nums">
            {station.band === 'dab' ? station.channel : formatFreq(station.band, station.freq)}
          </span>
        </span>
      ) : (
        <span className="mt-2 block text-center text-body text-text-disabled">—</span>
      )}
      {holding && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[3px] origin-left bg-accent"
          style={{ animation: `hold-fill ${HOLD_MS}ms linear forwards` }}
        />
      )}
    </button>
  )
}

/** Skala frekvencija za rucno trazenje (fabricki: prikazuje se umesto memorija). */
function TuningScale({ band, freq }: { band: Band; freq: number }) {
  const { t } = useT()
  const min = band === 'fm' ? FM_MIN : AM_MIN
  const max = band === 'fm' ? FM_MAX : AM_MAX
  const ratio = (freq - min) / (max - min)
  const ticks = band === 'fm' ? [88, 90, 92, 94, 96, 98, 100, 102, 104, 106, 108] : [600, 800, 1000, 1200, 1400, 1600]
  const dragging = useRef(false)

  const setFromX = (el: HTMLElement, clientX: number) => {
    const rect = el.getBoundingClientRect()
    const r = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    radioService.setFreq(min + r * (max - min))
  }

  return (
    <div className="flex items-center gap-3">
      <OemButton size="lg" aria-label={t.radio.stepDown} onHold={() => radioService.step(-1)} repeatMs={120} onClick={() => radioService.step(-1)} className="!w-16 !px-0">
        <Icon name="minus" size={26} />
      </OemButton>
      <div
        role="slider"
        tabIndex={0}
        aria-label={t.radio.manual}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={freq}
        className="relative h-[84px] flex-1 cursor-pointer touch-none border border-line"
        style={{ background: 'var(--surface-1)' }}
        onPointerDown={(e) => {
          dragging.current = true
          e.currentTarget.setPointerCapture(e.pointerId)
          setFromX(e.currentTarget, e.clientX)
        }}
        onPointerMove={(e) => dragging.current && setFromX(e.currentTarget, e.clientX)}
        onPointerUp={() => (dragging.current = false)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') radioService.step(1)
          if (e.key === 'ArrowLeft') radioService.step(-1)
        }}
      >
        {Array.from({ length: 81 }, (_, i) => (
          <span
            key={i}
            className="absolute bottom-6 w-px bg-line-strong"
            style={{ left: `${(i / 80) * 100}%`, height: i % 4 === 0 ? 22 : 11 }}
          />
        ))}
        {ticks.map((tick) => (
          <span
            key={tick}
            className="absolute bottom-1 -translate-x-1/2 text-caption text-text-3 tabular-nums"
            style={{ left: `${((tick - min) / (max - min)) * 100}%` }}
          >
            {tick}
          </span>
        ))}
        <span
          className="absolute top-1 bottom-5 w-[3px] -translate-x-1/2 bg-accent"
          style={{ left: `${ratio * 100}%`, boxShadow: 'var(--accent-glow)' }}
        />
      </div>
      <OemButton size="lg" aria-label={t.radio.stepUp} onHold={() => radioService.step(1)} repeatMs={120} onClick={() => radioService.step(1)} className="!w-16 !px-0">
        <Icon name="plus" size={26} />
      </OemButton>
    </div>
  )
}

function RadioMain() {
  const radio = useRadio()
  const prefs = usePrefs()
  const { push, go } = useNavigation()
  const { t } = useT()
  const [page, setPage] = useState(0)
  const [manual, setManual] = useState(false)

  const station = radio.current
  const presets = radio.presets[radio.band]
  const freq = radio.band === 'fm' ? radio.freq.fm : radio.freq.am
  const rds = prefs['radio.rds'] && radio.band === 'fm'
  const showName = radio.band !== 'fm' || rds
  const rt =
    prefs['radio.radiotext'] && (rds || radio.band === 'dab') && station?.radiotext.length
      ? station.radiotext[radio.rtIndex % station.radiotext.length]
      : null

  // Strana memorija prati izabranu stanicu
  useEffect(() => {
    if (!station) return
    const slot = presets.indexOf(station.id)
    if (slot >= 0) setPage(Math.floor(slot / PRESETS_PER_PAGE))
  }, [station, presets])

  useEffect(() => {
    if (radio.band === 'dab') setManual(false)
  }, [radio.band])

  const pageSlots = Array.from({ length: PRESETS_PER_PAGE }, (_, i) => page * PRESETS_PER_PAGE + i)

  return (
    <div className="flex h-full flex-col">
      {/* Prikaz stanice */}
      <div className="flex min-h-0 flex-1 items-center gap-6 px-6">
        <OemButton
          size="lg"
          aria-label={t.radio.prev}
          onClick={() => radioService.arrow(-1, prefs['radio.arrows'])}
          className="!h-[92px] !w-[92px] !px-0"
        >
          <Icon name="chevron-left" size={40} strokeWidth={1.8} />
        </OemButton>

        <div className="min-w-0 flex-1 text-center">
          {radio.scanning && (
            <span className="mb-3 inline-flex h-7 items-center border border-accent px-3 text-small font-semibold tracking-[0.12em] text-accent-ink uppercase">
              {t.radio.scan}
            </span>
          )}
          <p className="truncate text-[46px] leading-tight font-light">
            {showName && station ? station.name : radio.band === 'dab' ? t.radio.noStation : formatFreq(radio.band, freq)}
          </p>
          <p className="mt-2 text-body-lg text-text-2 tabular-nums">
            {radio.band === 'dab'
              ? station
                ? `${station.ensemble} · ${t.radio.channel} ${station.channel}`
                : '—'
              : showName && station
                ? formatFreq(radio.band, freq)
                : station?.name ?? t.radio.noStation}
          </p>
          <p className="mt-3 h-6 truncate text-body text-text-3">{rt ?? ''}</p>
        </div>

        <OemButton
          size="lg"
          aria-label={t.radio.next}
          onClick={() => radioService.arrow(1, prefs['radio.arrows'])}
          className="!h-[92px] !w-[92px] !px-0"
        >
          <Icon name="chevron-right" size={40} strokeWidth={1.8} />
        </OemButton>
      </div>

      {/* Memorije ili skala za rucno trazenje */}
      <div className="px-6 pb-2">
        {manual && radio.band !== 'dab' ? (
          <TuningScale band={radio.band} freq={freq} />
        ) : (
          <>
            <div className="flex gap-2.5">
              {pageSlots.map((slot) => {
                const st = radio.stations.find((s) => s.id === presets[slot])
                return <PresetKey key={slot} slot={slot} station={st} active={Boolean(st && st.id === station?.id)} />
              })}
            </div>
            <PageDots
              count={PRESET_COUNT / PRESETS_PER_PAGE}
              index={page}
              onSelect={setPage}
              label={t.radio.page}
            />
          </>
        )}
      </div>

      <FunctionBar>
        <BarButton icon="list" label={t.radio.stationList} onClick={() => push('list')} />
        <BarButton
          icon="equalizer"
          label={t.radio.manual}
          active={manual}
          disabled={radio.band === 'dab'}
          onClick={() => setManual((m) => !m)}
        />
        <BarButton
          icon="scan"
          label={radio.scanning ? t.radio.stopScan : t.radio.scan}
          active={radio.scanning}
          onClick={() => (radio.scanning ? radioService.stopScan() : radioService.startScan())}
        />
        <BarButton icon="volume" label={t.radio.set.sound} onClick={() => go('sound')} />
      </FunctionBar>
    </div>
  )
}

type Sort = 'freq' | 'alpha' | 'genre'

function StationList() {
  const radio = useRadio()
  const { back } = useNavigation()
  const { notify } = useShell()
  const { t } = useT()
  const [sort, setSort] = useState<Sort>('freq')
  const [sortOpen, setSortOpen] = useState(false)
  useScreenTitle(t.radio.stationList + ' ' + t.radio[radio.band])

  const list = useMemo(() => {
    const items = radio.stations.filter((s) => s.band === radio.band)
    if (sort === 'alpha') return [...items].sort((a, b) => a.name.localeCompare(b.name))
    if (sort === 'genre') return [...items].sort((a, b) => a.genre.localeCompare(b.genre) || a.name.localeCompare(b.name))
    return [...items].sort((a, b) => a.freq - b.freq)
  }, [radio.stations, radio.band, sort])

  const sortLabels: Record<Sort, string> = { freq: t.radio.sortFreq, alpha: t.radio.sortAlpha, genre: t.radio.sortGenre }

  return (
    <div className="flex h-full flex-col">
      <TitleActions>
        {radio.band !== 'fm' && (
          <TitleButton onClick={() => notify(t.radio.updated)} aria-label={t.radio.update}>
            <Icon name="refresh" size={18} />
          </TitleButton>
        )}
        <TitleButton onClick={() => setSortOpen(true)}>
          {sortLabels[sort]} <Icon name="chevron-down" size={16} />
        </TitleButton>
      </TitleActions>
      <ScrollList>
        {list.length === 0 && <ListNote>{t.radio.listEmpty}</ListNote>}
        {list.map((s, i) => {
          const active = s.id === radio.current?.id
          const slot = radio.presets[radio.band].indexOf(s.id)
          const prevGenre = i > 0 ? list[i - 1].genre : null
          return (
            <div key={s.id}>
              {sort === 'genre' && s.genre !== prevGenre && <RowHeader>{s.genre}</RowHeader>}
              <button
                type="button"
                onClick={() => {
                  radioService.selectStation(s.id)
                  back()
                }}
                className={[
                  'relative flex min-h-16 w-full items-center gap-4 border-b border-line-soft px-5 text-left',
                  active ? 'bg-accent-soft' : '',
                ].join(' ')}
              >
                {active && <span className="absolute inset-y-0 left-0 w-[3px] bg-accent" />}
                <Icon name={active ? 'volume' : 'radio'} size={20} className={active ? 'text-accent-ink' : 'text-text-3'} />
                <span className={'min-w-0 flex-1 truncate text-body ' + (active ? 'text-accent-ink' : '')}>{s.name}</span>
                {s.tp && <span className="border border-line px-1.5 text-micro font-semibold text-text-3">TP</span>}
                {slot >= 0 && (
                  <span className="text-small text-text-3">{fill(t.radio.inPreset, { n: slot + 1 })}</span>
                )}
                <span className="w-28 text-right text-small text-text-2 tabular-nums">
                  {s.band === 'dab' ? s.channel : formatFreq(s.band, s.freq)}
                </span>
              </button>
            </div>
          )
        })}
      </ScrollList>
      <OptionsDialog
        open={sortOpen}
        title={t.radio.stationList}
        value={sort}
        options={(['freq', 'alpha', 'genre'] as Sort[]).map((v) => ({ value: v, label: sortLabels[v] }))}
        onSelect={setSort}
        onClose={() => setSortOpen(false)}
      />
    </div>
  )
}

function RadioSettings() {
  const prefs = usePrefs()
  const radio = useRadio()
  const { go } = useNavigation()
  const { t } = useT()
  const [confirmClear, setConfirmClear] = useState(false)
  useScreenTitle(t.radio.settingsTitle)
  const set = prefsService.set

  return (
    <>
      <ScrollList>
        <RowLink label={t.radio.set.sound} icon="volume" onClick={() => go('sound')} />
        <RowSelect
          label={t.radio.set.arrows}
          value={prefs['radio.arrows']}
          options={[
            { value: 'presets', label: t.radio.set.arrowsPresets },
            { value: 'stations', label: t.radio.set.arrowsStations },
          ]}
          onSelect={(v) => set('radio.arrows', v)}
        />
        <RowCheck label={t.radio.set.tp} checked={prefs['radio.tp']} onChange={(v) => set('radio.tp', v)} />
        <RowLink label={t.radio.set.clearPresets} icon="trash" onClick={() => setConfirmClear(true)} />
        <RowCheck label={t.radio.set.radiotext} checked={prefs['radio.radiotext']} onChange={(v) => set('radio.radiotext', v)} />
        <RowCheck label={t.radio.set.af} checked={prefs['radio.af']} onChange={(v) => set('radio.af', v)} />
        <RowCheck label={t.radio.set.rds} checked={prefs['radio.rds']} onChange={(v) => set('radio.rds', v)} />
        <RowSelect
          label={t.radio.set.regional}
          value={prefs['radio.regional']}
          options={[
            { value: 'fixed', label: t.radio.set.regionalFixed },
            { value: 'auto', label: t.radio.set.regionalAuto },
          ]}
          onSelect={(v) => set('radio.regional', v)}
          disabled={!prefs['radio.rds']}
        />
        <RowHeader>{t.radio.set.advanced}</RowHeader>
        <RowCheck label={t.radio.set.logoAuto} checked={prefs['radio.logoAuto']} onChange={(v) => set('radio.logoAuto', v)} />
        <RowHeader>{t.radio.set.dabSection}</RowHeader>
        <RowCheck label={t.radio.set.dabTraffic} checked={prefs['radio.dabTraffic']} onChange={(v) => set('radio.dabTraffic', v)} />
        <RowCheck label={t.radio.set.dabOther} checked={prefs['radio.dabOther']} onChange={(v) => set('radio.dabOther', v)} />
        <RowCheck label={t.radio.set.dabFollow} checked={prefs['radio.dabFollow']} onChange={(v) => set('radio.dabFollow', v)} />
        <RowCheck label={t.radio.set.dabToFm} checked={prefs['radio.dabToFm']} onChange={(v) => set('radio.dabToFm', v)} />
        <ListNote>{t.radio.simulated}</ListNote>
      </ScrollList>
      <ConfirmDialog
        open={confirmClear}
        title={t.radio.set.clearPresets}
        message={fill(t.radio.set.clearPresetsConfirm, { band: t.radio[radio.band] })}
        confirmLabel={t.common.delete}
        onConfirm={() => radioService.clearAllPresets()}
        onClose={() => setConfirmClear(false)}
      />
    </>
  )
}

/**
 * Radio, po fabrickom MIB2. Ukljucivanjem radija on postaje aktivni izvor
 * zvuka (medija se pauzira), kao na pravom uredjaju.
 */
export function RadioScreen() {
  const { path, push } = useNavigation()
  const { update } = useSettings()
  const prefs = usePrefs()
  const radio = useRadio()
  const { t } = useT()
  const [bandOpen, setBandOpen] = useState(false)
  const sub = path[0]

  // Radio postaje aktivni izvor: medija se pauzira, kao na fabrickom uredjaju
  useEffect(() => {
    update('audioSource', 'radio')
    audioService.pause()
  }, [update])

  const tpLabel = !prefs['radio.rds'] && radio.band === 'fm'
    ? t.radio.rdsOff
    : prefs['radio.tp']
      ? radio.current?.tp
        ? 'TP'
        : t.radio.noTp
      : null

  return (
    <div className="flex h-full flex-col">
      {!sub && (
        <TitleActions>
          {tpLabel && (
            <span
              className={[
                'flex h-10 items-center border px-3 text-small font-semibold',
                tpLabel === 'TP' ? 'border-accent text-accent-ink' : 'border-line text-text-3',
              ].join(' ')}
            >
              {tpLabel}
            </span>
          )}
          <TitleButton onClick={() => setBandOpen(true)} aria-label={t.radio.band}>
            {t.radio[radio.band]} <Icon name="chevron-down" size={16} />
          </TitleButton>
          <TitleButton onClick={() => push('settings')} aria-label={t.common.settings}>
            <Icon name="settings" size={20} />
          </TitleButton>
        </TitleActions>
      )}

      {sub === 'list' ? <StationList /> : sub === 'settings' ? <RadioSettings /> : <RadioMain />}

      <OptionsDialog
        open={bandOpen}
        title={t.radio.band}
        value={radio.band}
        options={(['fm', 'am', 'dab'] as Band[]).map((b) => ({ value: b, label: t.radio[b] }))}
        onSelect={(b) => radioService.setBand(b)}
        onClose={() => setBandOpen(false)}
      />
    </div>
  )
}
