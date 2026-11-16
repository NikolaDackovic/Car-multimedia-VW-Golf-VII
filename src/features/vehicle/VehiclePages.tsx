import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Icon } from '@/components/ui/Icon'
import type { IconName } from '@/components/ui/Icon'
import { InfoButton, OemButton, SimTag } from '@/components/oem/controls'
import { ConfirmDialog, Dialog } from '@/components/oem/Dialog'
import { ListNote, RowCheck, RowInfo, RowLink, ScrollList } from '@/components/oem/List'
import { useNavigation } from '@/app/navigation'
import { useShell } from '@/app/shell'
import { formatDateShort, formatDriveTime } from '@/hooks/useClock'
import { useMaintenance } from '@/hooks/useMaintenance'
import { usePrefs } from '@/hooks/usePrefs'
import { useT } from '@/hooks/useT'
import { useUnits } from '@/hooks/useUnits'
import { useVehicle } from '@/hooks/useVehicle'
import { fill } from '@/i18n'
import { nextInspectionEstimate, nextServiceEstimate } from '@/services/maintenance'
import type { ServiceEstimate } from '@/services/maintenance'
import { convenienceConsumers, vehicleService } from '@/services/vehicle'
import type { DoorId, MemoryId } from '@/services/vehicle'
import { VehicleView } from './VehicleView'
import type { CarPart } from './VehicleRender'
import { viewForPart } from './Car3D'
import type { CarMarker, CarView, WheelId, WheelLabels } from './Car3D'

/* ------------------------------ Podaci o voznji ------------------------------ */

const MEMORIES: MemoryId[] = ['sinceStart', 'sinceRefuel', 'longTerm']

/** Prosecna potrosnja po minutu, poslednjih 30 min — jedna serija, vrednost na dodir. */
function ConsumptionChart({ values }: { values: number[] }) {
  const { t } = useT()
  const units = useUnits()
  const [picked, setPicked] = useState<number | null>(null)
  const max = Math.max(8, ...values)
  const W = 470
  const H = 170
  const gap = 2
  const bw = (W - gap * (values.length - 1)) / values.length

  return (
    <figure className="m-0">
      <figcaption className="mb-2 flex items-baseline justify-between text-small text-text-3">
        <span>{t.vehicle.chart}</span>
        <span className="text-text-1 tabular-nums">
          {picked !== null
            ? `−${values.length - picked} min · ${units.consumption(values[picked]).value} ${units.consumption(values[picked]).unit}`
            : ''}
        </span>
      </figcaption>
      <svg width={W} height={H + 20} role="img" aria-label={t.vehicle.chart}>
        {[0.5, 1].map((f) => (
          <g key={f}>
            <line x1="0" x2={W} y1={H - H * f} y2={H - H * f} stroke="var(--line-soft)" strokeWidth="1" />
            <text x={W} y={H - H * f - 4} textAnchor="end" fontSize="12" fill="var(--text-3)">
              {units.consumption(max * f).value}
            </text>
          </g>
        ))}
        <line x1="0" x2={W} y1={H} y2={H} stroke="var(--line)" strokeWidth="1" />
        {values.map((v, i) => {
          const h = Math.max(2, (v / max) * H)
          const x = i * (bw + gap)
          return (
            <g key={i}>
              <rect
                x={x}
                y={H - h}
                width={bw}
                height={h}
                rx="2"
                fill="var(--accent)"
                opacity={picked === null || picked === i ? 1 : 0.45}
              />
              {/* Zona dodira veca od stubica */}
              <rect
                x={x - gap / 2}
                y="0"
                width={bw + gap}
                height={H}
                fill="transparent"
                onPointerDown={() => setPicked(picked === i ? null : i)}
              />
            </g>
          )
        })}
        <text x="0" y={H + 16} fontSize="12" fill="var(--text-3)">
          −30 min
        </text>
        <text x={W} y={H + 16} textAnchor="end" fontSize="12" fill="var(--text-3)">
          0
        </text>
      </svg>
    </figure>
  )
}

export function DrivingData() {
  const v = useVehicle()
  const { t } = useT()
  const units = useUnits()
  const [memory, setMemory] = useState<MemoryId>('sinceStart')
  const [confirm, setConfirm] = useState(false)
  const trip = v.memories[memory]
  const avg = units.consumption(trip.avgConsumption)
  const cur = units.consumption(v.currentConsumption)
  const dist = units.distance(trip.km, 1)
  const speed = units.speed(trip.avgSpeedKmh)
  const range = units.distance(v.rangeKm)

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 gap-2 border-b border-line px-5 py-3">
        {MEMORIES.map((m) => (
          <OemButton key={m} size="sm" active={memory === m} onClick={() => setMemory(m)} className="flex-1">
            {t.vehicle[m]}
          </OemButton>
        ))}
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={memory}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.15 }}
          className="flex min-h-0 flex-1 gap-8 px-7 py-6"
        >
          <div className="flex w-[300px] shrink-0 flex-col">
            <p className="text-small text-text-3">{t.vehicle.avgConsumption}</p>
            <p className="mt-1 text-[64px] leading-none font-light tabular-nums">
              {avg.value}
              <span className="ml-2 text-title font-normal text-text-3">{avg.unit}</span>
            </p>
            <div className="mt-7 grid grid-cols-2 gap-x-6 gap-y-5">
              {[
                [t.vehicle.distance, dist.value, dist.unit],
                [t.vehicle.driveTime, formatDriveTime(trip.minutes), ''],
                [t.vehicle.avgSpeed, speed.value, speed.unit],
                [t.vehicle.range, range.value, range.unit],
              ].map(([label, value, unit]) => (
                <div key={label}>
                  <p className="text-small text-text-3">{label}</p>
                  <p className="mt-0.5 text-[26px] leading-tight tabular-nums">
                    {value}
                    {unit && <span className="ml-1.5 text-body text-text-3">{unit}</span>}
                  </p>
                </div>
              ))}
            </div>
            <OemButton size="sm" className="mt-auto" onClick={() => setConfirm(true)}>
              <Icon name="refresh" size={18} /> {t.vehicle.resetMemory}
            </OemButton>
          </div>
          <div className="flex min-w-0 flex-1 flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <p className="text-small text-text-3">{t.vehicle.currentConsumption}</p>
                <SimTag />
              </div>
              <div className="mt-2 flex items-center gap-4">
                <div className="h-3 flex-1 bg-surface-3">
                  <div
                    className="h-full bg-accent transition-[width] duration-500"
                    style={{ width: Math.min(100, (v.currentConsumption / 15) * 100) + '%' }}
                  />
                </div>
                <span className="w-36 text-right text-title tabular-nums">
                  {cur.value} <span className="text-small text-text-3">{cur.unit}</span>
                </span>
              </div>
            </div>
            <ConsumptionChart values={v.consumptionHistory} />
          </div>
        </motion.div>
      </AnimatePresence>
      <ConfirmDialog
        open={confirm}
        title={t.vehicle.resetMemory}
        message={fill(t.vehicle.resetConfirm, { name: t.vehicle[memory] })}
        confirmLabel={t.common.reset}
        onConfirm={() => vehicleService.resetMemory(memory)}
        onClose={() => setConfirm(false)}
      />
    </div>
  )
}

/* ------------------------------ Status vozila ------------------------------ */

const FAULT_PARTS: Record<string, CarPart> = {
  front: 'frontLight',
  rear: 'rearLight',
  wheels: 'frontWheel',
  cabin: 'cabin',
  engine: 'bonnet',
}

const WHEEL_IDS: WheelId[] = ['fl', 'fr', 'rl', 'rr']

/** Poruka o statusu: tacka na vozilu + red u listi (greske iz vozila se mogu obrisati). */
interface StatusMessage extends CarMarker {
  faultId?: string
}

/**
 * Sve sto nije u redu, kao fabricke poruke o statusu: kratko, samo sta je
 * poruka. Svaka poruka ima svoje mesto na vozilu (sijalice, tockovi, vrata...).
 * Na vozilu se prikazuju samo upozorenja.
 */
export function useStatusMessages(): { onCar: StatusMessage[]; all: StatusMessage[] } {
  const v = useVehicle()
  const { t } = useT()
  const warn = 'warn' as const
  const list: StatusMessage[] = []

  for (const f of v.faults)
    list.push({
      part: f.bulb ?? FAULT_PARTS[f.area],
      tone: f.level === 'error' ? 'danger' : f.level === 'warn' ? 'warn' : 'ok',
      title: f.code === 'bulb' && f.bulb ? fill(t.faults.bulb, { name: t.bulbs[f.bulb] }) : t.faults[f.code],
      faultId: f.id,
    })
  for (const d of Object.keys(v.doors) as DoorId[])
    if (v.doors[d])
      list.push({
        part: d === 'trunk' ? 'brakeThird' : d === 'bonnet' ? 'bonnet' : d === 'passenger' ? 'mirrorRight' : 'door',
        tone: warn,
        title: fill(t.vehicle.doorOpenTitle, { door: t.vehicle.doors[d] }),
      })
  if (!v.windowsClosed) list.push({ part: 'door', tone: warn, title: t.vehicle.windowsOpenTitle })
  if (!v.oilLevelOk) list.push({ part: 'bonnet', tone: 'danger', title: t.vehicle.oilLowTitle })
  if (!v.washerFluidOk && !v.faults.some((f) => f.code === 'washerFluid')) list.push({ part: 'bonnet', tone: warn, title: t.vehicle.washerLowTitle })
  v.tyreBar.forEach((bar, i) => {
    if (bar < 2) list.push({ part: WHEEL_IDS[i], tone: warn, title: fill(t.vehicle.tyreLowTitle, { wheel: t.vehicle.wheels[WHEEL_IDS[i]] }) })
  })
  if (v.batteryV < 11.8) list.push({ part: 'bonnet', tone: warn, title: t.vehicle.batteryLowTitle })
  if (v.fuelPercent < 10) list.push({ part: 'rearWheel', tone: warn, title: t.vehicle.fuelLowTitle })
  return { onCar: list.filter((m) => m.tone !== 'ok'), all: list }
}

type StatusMode = 'overview' | 'profile' | 'drive'

/** Svaki prikaz ima svoj kadar; kamera ih obilazi po luku oko vozila. */
const MODE_VIEW: Record<StatusMode, CarView> = { overview: 'front', profile: 'side', drive: 'rear' }

/** Samo u razvoju: `&mode=drive` otvara prikaz direktno (za snimke ekrana). */
const DEV_MODE = (import.meta.env.DEV ? new URLSearchParams(window.location.search).get('mode') : null) as StatusMode | null

/** Brza kartica preko scene (Servis, Pritisak u gumama) — kao na fabrickom statusu vozila. */
function StatusPill({ icon, tone, label, value, onClick }: { icon: IconName; tone: 'ok' | 'warn'; label: string; value?: string; onClick: () => void }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.08 }}
      className="overlay-panel flex h-14 w-[236px] items-center gap-3 px-4 text-left"
      style={{ borderColor: tone === 'warn' ? 'var(--warn)' : undefined }}
    >
      <Icon name={icon} size={20} className={tone === 'warn' ? 'text-warn' : 'text-ok'} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-body">{label}</span>
        {value && <span className="block truncate text-caption text-text-3">{value}</span>}
      </span>
      <Icon name="chevron-right" size={18} className="text-text-3" />
    </motion.button>
  )
}

/** Podatak u panelu prikaza (Profil / Voznja). */
function StageValue({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="min-w-0">
      <p className="truncate text-caption text-text-3">{label}</p>
      <p className="truncate text-title leading-tight tabular-nums">
        {value}
        {unit && <span className="ml-1 text-small text-text-3">{unit}</span>}
      </p>
    </div>
  )
}

export function VehicleStatus() {
  const v = useVehicle()
  const m = useMaintenance()
  const { t } = useT()
  const units = useUnits()
  const { replace } = useNavigation()
  const { onCar, all } = useStatusMessages()
  const [mode, setModeRaw] = useState<StatusMode>(DEV_MODE && DEV_MODE in MODE_VIEW ? DEV_MODE : 'overview')
  const [info, setInfo] = useState(false)
  // Poruka koju kamera trenutno prikazuje — pri otvaranju prva, pa strelicama redom
  const [focus, setFocus] = useState<number | null>(() => (onCar.length ? 0 : null))
  const focused = focus !== null && focus < onCar.length ? onCar[focus] : null
  const setMode = (m: StatusMode) => {
    setModeRaw(m)
    setFocus(null)
  }
  const step = (d: 1 | -1) => {
    if (!onCar.length) return
    if (mode === 'drive') setModeRaw('overview')
    setFocus((f) => (f === null ? (d === 1 ? 0 : onCar.length - 1) : (f + d + onCar.length) % onCar.length))
  }
  const view = focused && mode !== 'drive' ? viewForPart(focused.part) : MODE_VIEW[mode]

  const fuel = units.volume(v.fuelLiters, 0)
  const range = units.distance(v.rangeKm)
  const odo = units.distance(v.odometerKm)
  const lowTyres = v.tyreBar.some((b) => b < 2)
  const service = nextServiceEstimate(m, v.odometerKm)
  const serviceDays = service.remainingDays
  const serviceDue = serviceDays !== null && serviceDays <= 0
  const current = units.consumption(v.currentConsumption)
  const avg = units.consumption(v.memories.sinceStart.avgConsumption)
  const avgSpeed = units.speed(v.memories.sinceStart.avgSpeedKmh)

  return (
    <div className="relative h-full">
      {/* Vozilo zauzima ceo panel; sve sto nije u redu je zuta tacka na vozilu */}
      <VehicleView
        view={view}
        driving={mode === 'drive'}
        className="absolute inset-x-0 top-14 bottom-[88px]"
        markers={mode === 'drive' ? [] : onCar}
        focusPart={focused?.part ?? null}
      />

      {/* Gore: poruke — strelicama kamera obilazi vozilo od jedne do druge */}
      <div className="absolute inset-x-0 top-0 flex h-14 items-center gap-3 px-5">
        <Icon name={onCar.length ? 'warning' : 'check'} size={22} className={'shrink-0 ' + (onCar.length ? 'text-warn' : 'text-ok')} />
        {onCar.length > 1 && (
          <OemButton size="sm" aria-label={t.radio.prev} onClick={() => step(-1)} className="!h-10 !w-12 !px-0">
            <Icon name="chevron-left" size={20} />
          </OemButton>
        )}
        <button type="button" disabled={!onCar.length} onClick={() => step(1)} className="min-w-0 flex-1 truncate text-left text-body-lg">
          {focused ? (
            <>
              {onCar.length > 1 && <span className="mr-2 text-text-3 tabular-nums">{(focus ?? 0) + 1}/{onCar.length}</span>}
              {focused.title}
            </>
          ) : onCar.length ? (
            fill(t.vehicle.messagesCount, { n: onCar.length })
          ) : (
            t.vehicle.allOk
          )}
        </button>
        {onCar.length > 1 && (
          <OemButton size="sm" aria-label={t.radio.next} onClick={() => step(1)} className="!h-10 !w-12 !px-0">
            <Icon name="chevron-right" size={20} />
          </OemButton>
        )}
        <SimTag />
        <InfoButton label={t.vehicle.info} onClick={() => setInfo(true)} />
      </div>

      {/* Brze kartice: servis i gume */}
      <div className="absolute top-[72px] right-5 flex flex-col gap-2">
        <StatusPill
          icon={serviceDue ? 'warning' : 'check'}
          tone={serviceDue ? 'warn' : 'ok'}
          label={serviceDue ? t.vehicle.serviceDue : t.vehicle.serviceOk}
          value={serviceDays !== null && !serviceDue ? fill(t.vehicle.serviceIn, { days: serviceDays }) : undefined}
          onClick={() => replace(['service'])}
        />
        <StatusPill
          icon={lowTyres ? 'warning' : 'check'}
          tone={lowTyres ? 'warn' : 'ok'}
          label={t.vehicle.tyresShort}
          value={lowTyres ? t.vehicle.pressureLow : t.vehicle.wheelOk}
          onClick={() => replace(['tyres'])}
        />
      </div>

      {/* Podaci uz prikaz: domet (pregled), gorivo i kilometraza (profil), potrosnja (voznja) */}
      <AnimatePresence mode="wait">
        <motion.div
          key={mode}
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="absolute top-[72px] left-5"
        >
          {mode === 'overview' && (
            <div className="overlay-panel flex h-14 items-center gap-3 px-4">
              <Icon name="fuel" size={20} className="text-text-2" />
              <span className="text-title tabular-nums">
                {range.value}
                <span className="ml-1 text-small text-text-3">{range.unit}</span>
              </span>
            </div>
          )}
          {mode === 'profile' && (
            <div className="overlay-panel w-[236px] space-y-3 px-4 py-3">
              <div>
                <div className="flex items-baseline justify-between">
                  <span className="text-caption text-text-3">{t.vehicle.fuelLevel}</span>
                  <span className="text-small tabular-nums">
                    {v.fuelPercent} % · {fuel.value} {fuel.unit}
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 bg-surface-3">
                  <motion.div
                    className="h-full"
                    initial={{ width: 0 }}
                    animate={{ width: v.fuelPercent + '%' }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    style={{ background: v.fuelPercent < 10 ? 'var(--warn)' : 'var(--accent)', boxShadow: 'var(--accent-glow)' }}
                  />
                </div>
              </div>
              <StageValue label={t.vehicle.range} value={range.value} unit={range.unit} />
              <StageValue label={t.vehicle.odometer} value={odo.value} unit={odo.unit} />
            </div>
          )}
          {mode === 'drive' && (
            <div className="overlay-panel grid w-[236px] grid-cols-1 gap-3 px-4 py-3">
              <StageValue label={t.vehicle.currentConsumption} value={current.value} unit={current.unit} />
              <StageValue label={`${t.vehicle.avgConsumption} · ${t.vehicle.sinceStart}`} value={avg.value} unit={avg.unit} />
              <StageValue label={t.vehicle.avgSpeed} value={avgSpeed.value} unit={avgSpeed.unit} />
              <StageValue label={t.vehicle.driveTime} value={formatDriveTime(v.memories.sinceStart.minutes)} />
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Dole: prikazi vozila, Start-Stop i poruke */}
      <div className="absolute inset-x-0 bottom-0 flex items-center gap-3 px-4 pb-4">
        <div className="flex gap-2">
          {(['overview', 'profile', 'drive'] as const).map((id) => (
            <OemButton key={id} size="lg" active={mode === id} pressed={mode === id} onClick={() => setMode(id)} className="min-w-[124px]">
              {t.vehicle.modes[id]}
            </OemButton>
          ))}
        </div>
        <span className="flex-1" />
        <OemButton size="lg" active={v.startStop !== 'off'} pressed={v.startStop !== 'off'} onClick={() => vehicleService.setStartStop(v.startStop === 'off')}>
          <Icon name="auto" size={20} /> {t.vehicle.startStop}
        </OemButton>
        <OemButton size="lg" onClick={() => setInfo(true)}>
          {all.length ? fill(t.vehicle.reports, { n: all.length }) : t.vehicle.noReports}
          <Icon name="chevron-right" size={18} />
        </OemButton>
      </div>

      {/* ⓘ: poruke o statusu — dodir na poruku vodi kameru do tog mesta na vozilu */}
      <Dialog open={info} title={t.vehicle.messages} onClose={() => setInfo(false)} width={640}>
        {all.length === 0 && <ListNote>{t.vehicle.noMessages}</ListNote>}
        {all.map((msg, i) => {
          const idx = onCar.indexOf(msg)
          return (
            <div key={i} className="flex min-h-16 items-center gap-4 border-b border-line-soft px-5">
              <button
                type="button"
                disabled={idx < 0}
                onClick={() => {
                  if (mode === 'drive') setModeRaw('overview')
                  setFocus(idx)
                  setInfo(false)
                }}
                className="flex min-h-16 min-w-0 flex-1 items-center gap-4 text-left"
              >
                <Icon
                  name={msg.tone === 'ok' ? 'info' : 'warning'}
                  size={22}
                  className="shrink-0"
                  style={{ color: msg.tone === 'danger' ? 'var(--danger)' : msg.tone === 'warn' ? 'var(--warn)' : 'var(--text-2)' }}
                />
                <span className="min-w-0 flex-1 text-body">{msg.title}</span>
                {idx >= 0 && <Icon name="chevron-right" size={18} className="shrink-0 text-text-3" />}
              </button>
              {msg.faultId && (
                <OemButton size="sm" aria-label={t.common.delete} onClick={() => vehicleService.dismissFault(msg.faultId!)} className="!w-12 shrink-0 !px-0">
                  <Icon name="close" size={18} />
                </OemButton>
              )}
            </div>
          )
        })}
      </Dialog>

    </div>
  )
}

/* ------------------------------ Potrosaci komfora ------------------------------ */

export function Consumers() {
  const v = useVehicle()
  const { t } = useT()
  const { go } = useNavigation()
  const units = useUnits()
  const list = convenienceConsumers(v.climate)
  const total = list.reduce((s, c) => s + c.lph, 0)
  const icons = { ac: 'snowflake', rearHeat: 'rear-defrost', seatHeat: 'seat' } as const

  return (
    <ScrollList>
      {list.length === 0 && <ListNote>{t.vehicle.consumersNone}</ListNote>}
      {list.map((c) => {
        const f = units.flow(c.lph)
        return (
          <div key={c.id} className="flex min-h-[72px] items-center gap-4 border-b border-line-soft px-5">
            <Icon name={icons[c.id]} size={26} className="text-text-2" />
            <span className="flex-1 text-body-lg">{t.vehicle.consumer[c.id]}</span>
            <div className="h-2.5 w-48 bg-surface-3">
              <div className="h-full bg-accent" style={{ width: Math.min(100, (c.lph / 0.5) * 100) + '%' }} />
            </div>
            <span className="w-28 text-right text-body-lg tabular-nums">
              {f.value} <span className="text-small text-text-3">{f.unit}</span>
            </span>
          </div>
        )
      })}
      {list.length > 0 && (
        <RowInfo label={t.vehicle.consumersTotal} value={`${units.flow(total).value} ${units.flow(total).unit}`} />
      )}
      <RowLink label={t.vehicle.climate} icon="fan" onClick={() => go('climate')} />
      <ListNote>
        {t.vehicle.consumersNote} {t.common.simulated}.
      </ListNote>
    </ScrollList>
  )
}

/* ------------------------------ Gume ------------------------------ */

/** Trajanje provere po tocku (ms) — tockovi se proveravaju redom, kao na fabrickom prikazu. */
const TYRE_CHECK_MS = 900

export function Tyres() {
  const v = useVehicle()
  const prefs = usePrefs()
  const { replace } = useNavigation()
  const { t } = useT()
  const { notify } = useShell()
  const units = useUnits()
  const [confirm, setConfirm] = useState(false)
  const [info, setInfo] = useState(false)
  // Provera: indeks tocka koji se trenutno meri (0–3), 4 = gotovo, null = ne radi
  const [checking, setChecking] = useState<number | null>(null)

  useEffect(() => {
    if (checking === null) return
    const id = window.setTimeout(() => {
      const next = checking + 1
      if (next < WHEEL_IDS.length) return setChecking(next)
      setChecking(null)
      notify(t.vehicle.tyreTestDone)
    }, TYRE_CHECK_MS)
    return () => window.clearTimeout(id)
  }, [checking, notify, t])

  // Granica: ispod 2,0 bara zuto, inace zeleno
  const labels = Object.fromEntries(
    WHEEL_IDS.map((id, i) => {
      const bar = v.tyreBar[i]
      const p = units.pressure(bar)
      const pending = checking !== null && i >= checking
      return [
        id,
        pending
          ? { name: t.vehicle.wheels[id], value: i === checking ? t.vehicle.tyreChecking : '—', unit: '', tone: 'idle' }
          : { name: t.vehicle.wheels[id], value: p.value, unit: p.unit, tone: bar < 2 ? 'warn' : 'ok' },
      ]
    }),
  ) as WheelLabels
  const low = v.tyreBar.some((b) => b < 2)
  const stored = v.tpms.storedAt ? formatDateShort(new Date(v.tpms.storedAt), prefs['time.dateFormat']) : '—'

  return (
    <div className="relative h-full">
      <VehicleView view="top" className="absolute inset-x-0 top-14 bottom-[96px]" wheelLabels={labels} />

      <div className="absolute inset-x-0 top-0 flex h-14 items-center gap-3 px-5">
        {checking !== null ? (
          <Icon name="refresh" size={22} className="animate-spin text-accent-ink" />
        ) : (
          <Icon name={low ? 'warning' : 'check'} size={22} className={low ? 'text-warn' : 'text-ok'} />
        )}
        <p className="min-w-0 flex-1 truncate text-body-lg">
          {checking !== null ? t.vehicle.tyreTesting : low ? t.vehicle.pressureLow : t.vehicle.tpmsOk}
        </p>
        <SimTag />
        <InfoButton label={t.vehicle.info} onClick={() => setInfo(true)} />
      </div>

      <div className="absolute inset-x-0 bottom-0 flex items-center gap-3 px-4 pb-4">
        <OemButton
          size="lg"
          disabled={checking !== null}
          onClick={() => {
            vehicleService.checkTyres()
            setChecking(0)
          }}
        >
          <Icon name="refresh" size={20} /> {t.vehicle.tyreTest}
        </OemButton>
        <OemButton size="lg" active className="min-w-0 flex-1" disabled={checking !== null} onClick={() => setConfirm(true)}>
          <span className="truncate">{t.vehicle.tpmsSet}</span>
        </OemButton>
        <OemButton size="lg" onClick={() => replace(['setup', 'tyres'])}>
          <Icon name="snowflake" size={20} /> {t.carSetup.winterTyres}
        </OemButton>
      </div>

      <Dialog open={info} title={t.vehicle.tyres} onClose={() => setInfo(false)} width={640}>
        <RowInfo label={t.vehicle.recommended} value={t.vehicle.recommendedValue} />
        <RowInfo label={t.vehicle.tpmsStored} value={stored} />
        <ListNote>{t.vehicle.pressureNote}</ListNote>
        <ListNote>{t.vehicle.tpmsNote}</ListNote>
      </Dialog>
      <ConfirmDialog
        open={confirm}
        title={t.vehicle.tpmsSet}
        message={t.vehicle.tpmsConfirm}
        onConfirm={() => {
          vehicleService.storeTyrePressures()
          notify(t.vehicle.tpmsOk)
        }}
        onClose={() => setConfirm(false)}
      />
    </div>
  )
}

/* ------------------------------ Servis ------------------------------ */

function DueRow({ label, est }: { label: string; est: ServiceEstimate }) {
  const { t } = useT()
  const units = useUnits()
  if (est.dueKm === null) return <RowInfo label={label} value={t.vehicle.noRecordFor} />
  const km = est.remainingKm ?? 0
  const days = est.remainingDays ?? 0
  const overdue = km <= 0 || days <= 0
  const d = units.distance(Math.max(0, km))
  return (
    <div className="flex min-h-[76px] items-center gap-4 border-b border-line-soft px-5">
      <Icon name="wrench" size={24} className={overdue ? 'text-warn' : 'text-text-2'} />
      <span className="flex-1 text-body-lg">{label}</span>
      <span className={'text-title tabular-nums ' + (overdue ? 'text-warn' : '')}>
        {overdue ? t.vehicle.overdue : fill(t.vehicle.dueIn, { days, km: `${d.value} ${d.unit}` })}
      </span>
    </div>
  )
}

export function Service() {
  const v = useVehicle()
  const m = useMaintenance()
  const { push } = useNavigation()
  const { t } = useT()
  const units = useUnits()
  const odo = units.distance(v.odometerKm)

  // Kao na fabrickom ekranu Servis: podaci levo, vozilo desno
  return (
    <div className="flex h-full">
      <div className="relative min-w-0 flex-1">
        <ScrollList>
          <DueRow label={t.vehicle.oilChange} est={nextServiceEstimate(m, v.odometerKm)} />
          <DueRow label={t.vehicle.inspection} est={nextInspectionEstimate(m, v.odometerKm)} />
          <RowCheck
            label={t.vehicle.wiperService}
            hint={t.vehicle.wiperServiceNote}
            checked={v.wiperService}
            onChange={(on) => vehicleService.setWiperService(on)}
          />
          <RowInfo label={t.vehicle.odometer} value={`${odo.value} ${odo.unit}`} />
          <RowInfo label={t.vehicle.vin} value={t.vehicle.vinMissing} />
          <RowLink label={t.vehicle.serviceBook} icon="wrench" value={`${m.records.length} ${t.service.recordsCount}`} onClick={() => push('book')} />
          <ListNote>{t.service.realDataNote}</ListNote>
        </ScrollList>
      </div>
      <VehicleView view="front" className="w-[40%] shrink-0 border-l border-line-soft" />
    </div>
  )
}
