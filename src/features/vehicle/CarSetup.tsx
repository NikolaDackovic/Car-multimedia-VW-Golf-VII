import { useEffect, useState } from 'react'
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
import { useNavigation } from '@/app/navigation'
import { useScreenTitle, useShell } from '@/app/shell'
import { usePrefs } from '@/hooks/usePrefs'
import { useT } from '@/hooks/useT'
import { useUnits } from '@/hooks/useUnits'
import { fill } from '@/i18n'
import { prefsService } from '@/services/prefs'
import type { PrefGroup } from '@/services/prefs'
import { vehicleService } from '@/services/vehicle'
import { parkingService } from '@/services/parking'
import { useBridge } from '@/hooks/useBridge'

const set = prefsService.set

/* ------------------------- Sistemi za pomoc vozacu ------------------------- */

/** Fabricki meni "Sistemi za pomoc vozacu" — deli se sa ekranom Sistemi za pomoc. */
export function AssistList() {
  const p = usePrefs()
  const { t } = useT()
  return (
    <ScrollList>
      <RowHeader>{t.assist.acc}</RowHeader>
      <RowCheck label={t.assist.lastDistance} checked={p['assist.acc.lastDistance']} onChange={(v) => set('assist.acc.lastDistance', v)} />
      <RowSelect
        label={t.assist.program}
        value={p['assist.acc.program']}
        options={[
          { value: 'eco', label: t.assist.eco },
          { value: 'normal', label: t.assist.normal },
          { value: 'sport', label: t.assist.sport },
        ]}
        onSelect={(v) => set('assist.acc.program', v)}
      />
      <RowSelect
        label={t.assist.distance}
        value={p['assist.acc.distance']}
        options={t.assist.distances.map((label, i) => ({ value: i + 1, label }))}
        onSelect={(v) => set('assist.acc.distance', v)}
      />

      <RowHeader>{t.assist.front}</RowHeader>
      <RowCheck label={t.assist.active} checked={p['assist.front.active']} onChange={(v) => set('assist.front.active', v)} />
      <RowCheck
        label={t.assist.warning}
        checked={p['assist.front.warning']}
        disabled={!p['assist.front.active']}
        onChange={(v) => set('assist.front.warning', v)}
      />
      <RowCheck
        label={t.assist.distanceWarning}
        checked={p['assist.front.distanceWarning']}
        disabled={!p['assist.front.active']}
        onChange={(v) => set('assist.front.distanceWarning', v)}
      />
      <RowCheck
        label={t.assist.cityBrake}
        checked={p['assist.front.cityBrake']}
        disabled={!p['assist.front.active']}
        onChange={(v) => set('assist.front.cityBrake', v)}
      />

      <RowHeader>{t.assist.lane}</RowHeader>
      <RowCheck label={t.assist.active} checked={p['assist.lane.active']} onChange={(v) => set('assist.lane.active', v)} />
      <RowCheck
        label={t.assist.adaptive}
        checked={p['assist.lane.adaptive']}
        disabled={!p['assist.lane.active']}
        onChange={(v) => set('assist.lane.adaptive', v)}
      />

      <RowHeader>{t.assist.sign}</RowHeader>
      <RowCheck label={t.assist.signMfd} checked={p['assist.sign.mfd']} onChange={(v) => set('assist.sign.mfd', v)} />
      <RowCheck label={t.assist.signTrailer} checked={p['assist.sign.trailer']} onChange={(v) => set('assist.sign.trailer', v)} />

      <RowHeader>{t.common.settings}</RowHeader>
      <RowCheck label={t.assist.driverAlert} checked={p['assist.driverAlert']} onChange={(v) => set('assist.driverAlert', v)} />
      <RowCheck label={t.assist.proactive} checked={p['assist.proactive']} onChange={(v) => set('assist.proactive', v)} />
      <ListNote>{t.common.sendNote}</ListNote>
    </ScrollList>
  )
}

/** Video ulazi (USB kamera / video grabber). Nazivi su dostupni tek posle dozvole za kameru. */
function useVideoInputs(): MediaDeviceInfo[] {
  const [list, setList] = useState<MediaDeviceInfo[]>([])
  useEffect(() => {
    const md = navigator.mediaDevices
    if (!md?.enumerateDevices) return
    const load = () => md.enumerateDevices().then((d) => setList(d.filter((x) => x.kind === 'videoinput'))).catch(() => undefined)
    void load()
    md.addEventListener?.('devicechange', load)
    return () => md.removeEventListener?.('devicechange', load)
  }, [])
  return list
}

/** ParkPilot: oprema, kamera, aktivacija, jacina i visina tona napred/nazad, utisavanje zvuka. */
export function ParkList() {
  const p = usePrefs()
  const { t } = useT()
  const inputs = useVideoInputs()
  const hw = p['hw.park']
  const hasCamera = hw === 'camera' || hw === 'both'
  const hasSensors = hw === 'sensors' || hw === 'both'
  return (
    <ScrollList>
      <RowSelect
        label={t.carSetup.equipment}
        value={hw}
        options={[
          { value: 'sensors', label: t.carSetup.equipSensors },
          { value: 'camera', label: t.carSetup.equipCamera },
          { value: 'both', label: t.carSetup.equipBoth },
          { value: 'none', label: t.carSetup.equipNone },
        ]}
        onSelect={(v) => set('hw.park', v)}
      />
      {hasSensors && <RowCheck label={t.carSetup.frontSensors} checked={p['hw.parkFront']} onChange={(v) => set('hw.parkFront', v)} />}
      {hasCamera && (
        <>
          <RowSelect
            label={t.carSetup.cameraDevice}
            value={p['hw.cameraId']}
            options={[
              { value: '', label: t.carSetup.cameraAuto },
              ...inputs.map((d, i) => ({ value: d.deviceId, label: d.label || `${t.park.viewCamera} ${i + 1}` })),
            ]}
            onSelect={(v) => set('hw.cameraId', v)}
          />
          <RowCheck label={t.carSetup.cameraMirror} checked={p['hw.cameraMirror']} onChange={(v) => set('hw.cameraMirror', v)} />
          <RowCheck label={t.carSetup.guidelines} checked={p['park.guidelines']} onChange={(v) => set('park.guidelines', v)} />
        </>
      )}
      {hw !== 'none' && <RowAction label={t.carSetup.testPark} icon="parking" onClick={() => parkingService.open(hasCamera ? 'camera' : 'sensors')} />}
      <ListNote>{t.carSetup.equipNote}</ListNote>
      <RowHeader>{t.carSetup.parkPilot}</RowHeader>
      <RowCheck label={t.carSetup.autoActivate} checked={p['park.autoActivate']} onChange={(v) => set('park.autoActivate', v)} />
      <RowHeader>{t.carSetup.front}</RowHeader>
      <RowStep label={t.carSetup.volume} value={p['park.frontVolume']} min={1} max={9} onChange={(v) => set('park.frontVolume', v)} />
      <RowStep label={t.carSetup.tone} value={p['park.frontTone']} min={1} max={9} onChange={(v) => set('park.frontTone', v)} />
      <RowHeader>{t.carSetup.rear}</RowHeader>
      <RowStep label={t.carSetup.volume} value={p['park.rearVolume']} min={1} max={9} onChange={(v) => set('park.rearVolume', v)} />
      <RowStep label={t.carSetup.tone} value={p['park.rearTone']} min={1} max={9} onChange={(v) => set('park.rearTone', v)} />
      <RowCheck label={t.carSetup.audioReduction} checked={p['park.audioReduction']} onChange={(v) => set('park.audioReduction', v)} />
      <ListNote>{t.common.sendNote}</ListNote>
    </ScrollList>
  )
}

/* ------------------------------ grupe ------------------------------ */

function TyresSetup() {
  const p = usePrefs()
  const { replace } = useNavigation()
  const { t } = useT()
  const units = useUnits()
  useScreenTitle(t.carSetup.tyres)
  return (
    <ScrollList>
      <RowLink label={t.vehicle.tyres} icon="gauge" onClick={() => replace(['tyres'])} />
      <RowHeader>{t.carSetup.winterTyres}</RowHeader>
      <RowCheck label={t.carSetup.winterWarn} checked={p['tyres.winterWarn']} onChange={(v) => set('tyres.winterWarn', v)} />
      {p['tyres.winterWarn'] && (
        <RowStep
          label={t.carSetup.winterSpeed}
          value={p['tyres.winterSpeed']}
          min={30}
          max={240}
          step={10}
          onChange={(v) => set('tyres.winterSpeed', v)}
          format={(v) => units.speed(v).value}
        />
      )}
      <ListNote>{t.common.sendNote}</ListNote>
    </ScrollList>
  )
}

function LightSetup() {
  const p = usePrefs()
  const { path, push } = useNavigation()
  const { t } = useT()
  const interior = path[2] === 'interior'
  useScreenTitle(interior ? t.carSetup.interior : t.carSetup.light)
  const secs = (v: number) => (v === 0 ? t.common.off : v + ' ' + t.common.seconds)

  if (interior) {
    return (
      <ScrollList>
        <RowCheck label={t.carSetup.courtesy} checked={p['light.courtesy']} onChange={(v) => set('light.courtesy', v)} />
        <RowStep label={t.carSetup.doorAmbient} value={p['light.doorAmbient']} min={0} max={100} step={10} onChange={(v) => set('light.doorAmbient', v)} format={(v) => v + '%'} />
        <RowStep label={t.carSetup.footwell} value={p['light.footwell']} min={0} max={100} step={10} onChange={(v) => set('light.footwell', v)} format={(v) => v + '%'} />
        <ListNote>{t.common.sendNote}</ListNote>
      </ScrollList>
    )
  }

  return (
    <ScrollList>
      <RowCheck label={t.carSetup.lightAssist} checked={p['light.assist']} onChange={(v) => set('light.assist', v)} />
      <RowCheck label={t.carSetup.dynamicBend} checked={p['light.dynamicBend']} onChange={(v) => set('light.dynamicBend', v)} />
      <RowCheck label={t.carSetup.rainAuto} checked={p['light.rainAuto']} onChange={(v) => set('light.rainAuto', v)} />
      <RowCheck label={t.carSetup.laneFlash} checked={p['light.laneFlash']} onChange={(v) => set('light.laneFlash', v)} />
      <RowSelect
        label={t.carSetup.switchOn}
        value={p['light.switchOn']}
        options={[
          { value: 'early', label: t.carSetup.early },
          { value: 'medium', label: t.common.medium },
          { value: 'late', label: t.carSetup.late },
        ]}
        onSelect={(v) => set('light.switchOn', v)}
      />
      <RowCheck label={t.carSetup.travelMode} checked={p['light.travelMode']} onChange={(v) => set('light.travelMode', v)} />
      <RowLink label={t.carSetup.interior} onClick={() => push('interior')} />
      <RowStep label={t.carSetup.comingHome} value={p['light.comingHome']} min={0} max={90} step={5} onChange={(v) => set('light.comingHome', v)} format={secs} />
      <RowStep label={t.carSetup.leavingHome} value={p['light.leavingHome']} min={0} max={90} step={5} onChange={(v) => set('light.leavingHome', v)} format={secs} />
      <ListNote>{t.common.sendNote}</ListNote>
    </ScrollList>
  )
}

function MirrorsSetup() {
  const p = usePrefs()
  const { t } = useT()
  useScreenTitle(t.carSetup.mirrors)
  return (
    <ScrollList>
      <RowHeader>{t.carSetup.mirrorsHeader}</RowHeader>
      <RowCheck label={t.carSetup.sync} checked={p['mirrors.sync']} onChange={(v) => set('mirrors.sync', v)} />
      <RowCheck label={t.carSetup.lowerReverse} checked={p['mirrors.lowerReverse']} onChange={(v) => set('mirrors.lowerReverse', v)} />
      <RowCheck label={t.carSetup.foldParked} checked={p['mirrors.foldParked']} onChange={(v) => set('mirrors.foldParked', v)} />
      <RowHeader>{t.carSetup.wipers}</RowHeader>
      <RowCheck label={t.carSetup.autoRain} checked={p['wipers.autoRain']} onChange={(v) => set('wipers.autoRain', v)} />
      <RowCheck label={t.carSetup.rearReverse} checked={p['wipers.rearReverse']} onChange={(v) => set('wipers.rearReverse', v)} />
      <ListNote>{t.common.sendNote}</ListNote>
    </ScrollList>
  )
}

function OpenSetup() {
  const p = usePrefs()
  const { t } = useT()
  useScreenTitle(t.carSetup.open)
  return (
    <ScrollList>
      <RowHeader>{t.carSetup.windows}</RowHeader>
      <RowCheck label={t.carSetup.convenience} checked={p['open.convenience']} onChange={(v) => set('open.convenience', v)} />
      <RowCheck label={t.carSetup.rainClose} checked={p['open.rainClose']} onChange={(v) => set('open.rainClose', v)} />
      <RowHeader>{t.carSetup.locking}</RowHeader>
      <RowSelect
        label={t.carSetup.unlock}
        value={p['open.unlock']}
        options={[
          { value: 'all', label: t.carSetup.unlockAll },
          { value: 'single', label: t.carSetup.unlockSingle },
          { value: 'side', label: t.carSetup.unlockSide },
        ]}
        onSelect={(v) => set('open.unlock', v)}
      />
      <RowCheck label={t.carSetup.autoLock} checked={p['open.autoLock']} onChange={(v) => set('open.autoLock', v)} />
      <ListNote>{t.common.sendNote}</ListNote>
    </ScrollList>
  )
}

function SeatSetup() {
  const p = usePrefs()
  const { t } = useT()
  useScreenTitle(t.carSetup.seat)
  return (
    <ScrollList>
      <RowCheck label={t.carSetup.memoryKey} checked={p['seat.memoryKey']} onChange={(v) => set('seat.memoryKey', v)} />
      <RowHeader>{t.carSetup.belt}</RowHeader>
      <RowCheck label={t.common.left} checked={p['seat.beltLeft']} onChange={(v) => set('seat.beltLeft', v)} />
      <RowCheck label={t.common.right} checked={p['seat.beltRight']} onChange={(v) => set('seat.beltRight', v)} />
      <ListNote>{t.common.sendNote}</ListNote>
    </ScrollList>
  )
}

function MfdSetup() {
  const p = usePrefs()
  const { t } = useT()
  const units = useUnits()
  const [reset, setReset] = useState<'sinceStart' | 'longTerm' | null>(null)
  useScreenTitle(t.carSetup.mfd)

  const items: [keyof typeof p & `mfd.${string}`, string][] = [
    ['mfd.currentConsumption', t.vehicle.currentConsumption],
    ['mfd.avgConsumption', t.vehicle.avgConsumption],
    ['mfd.refuelVolume', t.carSetup.refuelVolume],
    ['mfd.ecoTips', t.carSetup.ecoTips],
    ['mfd.travelTime', t.vehicle.driveTime],
    ['mfd.distance', t.vehicle.distance],
    ['mfd.avgSpeed', t.vehicle.avgSpeed],
    ['mfd.digitalSpeed', t.carSetup.digitalSpeed],
    ['mfd.speedWarning', t.carSetup.speedWarning],
    ['mfd.oilTemp', t.carSetup.oilTemp],
  ]

  return (
    <>
      <ScrollList>
        <RowHeader>{t.carSetup.mfdShow}</RowHeader>
        {items.map(([key, label]) => (
          <RowCheck key={key} label={label} checked={p[key] as boolean} onChange={(v) => set(key, v as never)} />
        ))}
        {p['mfd.speedWarning'] && (
          <RowStep
            label={t.carSetup.speedWarningValue}
            value={p['mfd.speedWarningValue']}
            min={30}
            max={240}
            step={10}
            onChange={(v) => set('mfd.speedWarningValue', v)}
            format={(v) => units.speed(v).value}
          />
        )}
        <RowAction label={t.carSetup.resetStart} icon="refresh" onClick={() => setReset('sinceStart')} />
        <RowAction label={t.carSetup.resetLong} icon="refresh" onClick={() => setReset('longTerm')} />
      </ScrollList>
      <ConfirmDialog
        open={reset !== null}
        title={t.vehicle.resetMemory}
        message={fill(t.vehicle.resetConfirm, { name: reset ? t.vehicle[reset] : '' })}
        confirmLabel={t.common.reset}
        onConfirm={() => reset && vehicleService.resetMemory(reset)}
        onClose={() => setReset(null)}
      />
    </>
  )
}

function FactorySetup() {
  const { t } = useT()
  const { notify } = useShell()
  const [group, setGroup] = useState<{ id: PrefGroup; label: string } | null>(null)
  useScreenTitle(t.carSetup.factory)

  const groups: { id: PrefGroup; label: string }[] = [
    { id: 'vehicle', label: t.carSetup.factoryAll },
    { id: 'assist', label: t.carSetup.assist },
    { id: 'park', label: t.carSetup.park },
    { id: 'light', label: t.carSetup.light },
    { id: 'mirrors', label: t.carSetup.mirrors },
    { id: 'open', label: t.carSetup.open },
    { id: 'mfd', label: t.carSetup.mfd },
  ]

  return (
    <>
      <ScrollList>
        {groups.map((g) => (
          <RowAction key={g.id} label={g.label} icon="refresh" onClick={() => setGroup(g)} />
        ))}
      </ScrollList>
      <ConfirmDialog
        open={group !== null}
        title={t.carSetup.factory}
        message={fill(t.carSetup.factoryConfirm, { group: group?.label ?? '' })}
        confirmLabel={t.common.reset}
        onConfirm={() => {
          if (!group) return
          prefsService.resetGroup(group.id)
          notify(t.carSetup.factoryDone)
        }}
        onClose={() => setGroup(null)}
      />
    </>
  )
}

/** Veza sa vozilom (program car-bridge na Linux racunaru). */
function HardwareSetup() {
  const p = usePrefs()
  const { t } = useT()
  const { openKeyboard } = useShell()
  const bridge = useBridge()
  useScreenTitle(t.carSetup.hardware)
  const status =
    bridge.status === 'connected'
      ? t.carSetup.bridgeConnected + (bridge.peer ? ` (${bridge.peer.name} v${bridge.peer.version})` : '')
      : bridge.status === 'connecting'
        ? t.carSetup.bridgeConnecting
        : bridge.status === 'offline'
          ? t.carSetup.bridgeOffline
          : t.carSetup.bridgeDisabled
  return (
    <ScrollList>
      <RowHeader>{t.carSetup.bridge}</RowHeader>
      <RowCheck label={t.carSetup.bridgeEnabled} checked={p['hw.bridge']} onChange={(v) => set('hw.bridge', v)} />
      <RowInfo label={t.carSetup.bridgeStatus} value={<span style={{ color: bridge.status === 'connected' ? 'var(--ok)' : undefined }}>{status}</span>} />
      <RowLink
        label={t.carSetup.bridgeUrl}
        value={p['hw.bridgeUrl']}
        onClick={() => openKeyboard({ title: t.carSetup.bridgeUrl, value: p['hw.bridgeUrl'], onDone: (v) => v.trim() && set('hw.bridgeUrl', v.trim()) })}
      />
      <ListNote>{t.carSetup.bridgeNote}</ListNote>
      <RowHeader>{t.carSetup.park}</RowHeader>
      <ParkEquipmentLink />
    </ScrollList>
  )
}

function ParkEquipmentLink() {
  const p = usePrefs()
  const { t } = useT()
  const { replace } = useNavigation()
  const label = { sensors: t.carSetup.equipSensors, camera: t.carSetup.equipCamera, both: t.carSetup.equipBoth, none: t.carSetup.equipNone }[p['hw.park']]
  return <RowLink label={t.carSetup.equipment} value={label} icon="parking" onClick={() => replace(['setup', 'park'])} />
}

function AssistSetup() {
  const { t } = useT()
  useScreenTitle(t.carSetup.assist)
  return <AssistList />
}

function ParkSetup() {
  const { t } = useT()
  useScreenTitle(t.carSetup.park)
  return <ParkList />
}

/** Koren menija "Podesavanja vozila" (fabricki SETUP vozila). */
function SetupRoot() {
  const p = usePrefs()
  const { push, replace, go } = useNavigation()
  const { t } = useT()

  return (
    <ScrollList>
      <RowSelect
        label={t.carSetup.esc}
        value={p['esc.mode']}
        options={[
          { value: 'on', label: t.carSetup.escOn },
          { value: 'sport', label: t.carSetup.escSport },
          { value: 'off', label: t.carSetup.escOff },
        ]}
        onSelect={(v) => set('esc.mode', v)}
      />
      <RowLink label={t.carSetup.tyres} icon="gauge" onClick={() => push('tyres')} />
      <RowLink label={t.carSetup.assist} icon="car" onClick={() => push('assist')} />
      <RowLink label={t.carSetup.park} icon="equalizer" onClick={() => push('park')} />
      <RowLink label={t.carSetup.light} icon="headlight" onClick={() => push('light')} />
      <RowLink label={t.carSetup.mirrors} icon="door" onClick={() => push('mirrors')} />
      <RowLink label={t.carSetup.open} icon="door" onClick={() => push('open')} />
      <RowLink label={t.carSetup.seat} icon="seat" onClick={() => push('seat')} />
      <RowLink label={t.carSetup.mfd} icon="gauge" onClick={() => push('mfd')} />
      <RowLink label={t.carSetup.time} icon="clock" onClick={() => go('settings', ['time'])} />
      <RowLink label={t.carSetup.units} icon="list" onClick={() => go('settings', ['units'])} />
      <RowLink label={t.carSetup.service} icon="wrench" onClick={() => replace(['service'])} />
      <RowLink label={t.carSetup.hardware} icon="link" onClick={() => push('hardware')} />
      <RowLink label={t.carSetup.factory} icon="refresh" onClick={() => push('factory')} />
    </ScrollList>
  )
}

/** Podesavanja vozila sa podmenijima (path: ['setup', grupa, ...]). */
export function CarSetup() {
  const { path } = useNavigation()
  switch (path[1]) {
    case 'tyres':
      return <TyresSetup />
    case 'assist':
      return <AssistSetup />
    case 'park':
      return <ParkSetup />
    case 'light':
      return <LightSetup />
    case 'mirrors':
      return <MirrorsSetup />
    case 'open':
      return <OpenSetup />
    case 'seat':
      return <SeatSetup />
    case 'mfd':
      return <MfdSetup />
    case 'factory':
      return <FactorySetup />
    case 'hardware':
      return <HardwareSetup />
    default:
      return <SetupRoot />
  }
}
