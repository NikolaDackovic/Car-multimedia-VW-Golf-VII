import { useEffect, useId, useState } from 'react'
import { useScreenTitle } from '@/app/shell'
import { SimTag } from '@/components/oem/controls'
import { useBridge } from '@/hooks/useBridge'
import { useT } from '@/hooks/useT'
import { useUnits } from '@/hooks/useUnits'
import { useVehicle } from '@/hooks/useVehicle'
import { vehicleProfile } from '@/services/vehicle/profile'
import { VehicleView } from '@/features/vehicle/VehicleView'

/**
 * Instrumenti: obrtomer levo, brzinomer desno i moj Golf u sredini, na putu
 * koji tece brzinom vozila. Kada je auto povezan (bridge), vrednosti stizu sa
 * CAN-a; bez veze se prikazuje demo voznja.
 */

/** 1.6 TDI: crveno polje od 4500 o/min, skala do 6000. */
const RPM_MAX = 6000
const RPM_RED = 4500
/** Priblizan odnos o/min po km/h za stepene prenosa (rucni 5 brzina, 1.6 TDI). */
const RATIO = [0, 118, 64, 41, 31, 25]

function estimateGear(kmh: number, rpm: number): number {
  if (kmh < 3) return 0
  let best = 1
  let err = Infinity
  RATIO.forEach((r, g) => {
    if (!g) return
    const e = Math.abs(kmh * r - rpm)
    if (e < err) {
      err = e
      best = g
    }
  })
  return best
}

/** Demo voznja: ubrzanje kroz brzine, voznja i usporavanje (ciklus ~24 s). */
function useDemoDrive(enabled: boolean) {
  const [s, setS] = useState({ kmh: 0, rpm: 820, gear: 0 })
  useEffect(() => {
    if (!enabled) return
    const t0 = performance.now()
    const id = window.setInterval(() => {
      const t = ((performance.now() - t0) / 1000) % 24
      const kmh = t < 14 ? 118 * Math.sin((t / 14) * (Math.PI / 2)) ** 1.4 : t < 18 ? 118 : 118 * (1 - (t - 18) / 6)
      // Najvisi stepen u kome obrtaji ostaju iznad 1400 o/min
      let gear = 1
      for (let g = 5; g >= 1; g--) {
        if (kmh * RATIO[g] >= 1400) {
          gear = g
          break
        }
      }
      const rpm = kmh < 3 ? 820 : Math.max(900, kmh * RATIO[gear])
      setS({ kmh, rpm, gear: kmh < 3 ? 0 : gear })
    }, 80)
    return () => window.clearInterval(id)
  }, [enabled])
  return s
}

const START = -120
const SWEEP = 240

function polar(r: number, deg: number) {
  const a = ((deg - 90) * Math.PI) / 180
  return { x: 150 + r * Math.cos(a), y: 150 + r * Math.sin(a) }
}

function arc(r: number, from: number, to: number) {
  const a = polar(r, from)
  const b = polar(r, to)
  return `M${a.x} ${a.y} A${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${b.x} ${b.y}`
}

/** Analogni instrument: podeoci, brojevi, akcentni luk do vrednosti i kazaljka. */
function Gauge({
  value,
  max,
  major,
  minor,
  label,
  digits,
  unit,
  sub,
  red,
  format,
}: {
  value: number
  max: number
  major: number
  minor: number
  label: string
  digits: string
  unit: string
  sub?: string
  red?: number
  format: (v: number) => string
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const ratio = Math.max(0, Math.min(1, value / max))
  const angle = START + SWEEP * ratio
  const ticks: { v: number; major: boolean }[] = []
  for (let v = 0; v <= max + 0.001; v += minor) ticks.push({ v, major: Math.abs(v / major - Math.round(v / major)) < 0.001 })

  return (
    <svg viewBox="0 0 300 300" className="h-full w-full" role="img" aria-label={`${label}: ${digits} ${unit}`}>
      <defs>
        <radialGradient id={`dial-${uid}`} cx="0.5" cy="0.45" r="0.6">
          <stop offset="0" stopColor="#141a24" />
          <stop offset="0.85" stopColor="#07090d" />
          <stop offset="1" stopColor="#000" />
        </radialGradient>
        <linearGradient id={`acc-${uid}`} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" style={{ stopColor: 'color-mix(in srgb, var(--accent) 60%, #000)' }} />
          <stop offset="1" style={{ stopColor: 'color-mix(in srgb, var(--accent) 70%, #fff)' }} />
        </linearGradient>
      </defs>
      {/* Brojcanik i hromirani obod */}
      <circle cx="150" cy="150" r="146" fill={`url(#dial-${uid})`} stroke="#ffffff1f" strokeWidth="2" />
      <circle cx="150" cy="150" r="138" fill="none" stroke="#ffffff0d" strokeWidth="1" />
      {/* Podloga luka i akcentni luk do trenutne vrednosti */}
      <path d={arc(122, START, START + SWEEP)} fill="none" stroke="#ffffff10" strokeWidth="10" strokeLinecap="round" />
      {red !== undefined && <path d={arc(122, START + SWEEP * (red / max), START + SWEEP)} fill="none" stroke="var(--danger)" strokeWidth="10" opacity="0.75" />}
      {ratio > 0.002 && (
        <path
          d={arc(122, START, angle)}
          fill="none"
          stroke={`url(#acc-${uid})`}
          strokeWidth="10"
          strokeLinecap="round"
          style={{ filter: 'drop-shadow(0 0 6px color-mix(in srgb, var(--accent) 70%, transparent))', transition: 'd 120ms linear' }}
        />
      )}
      {/* Podeoci i brojevi */}
      {ticks.map(({ v, major: isMajor }) => {
        const deg = START + SWEEP * (v / max)
        const a = polar(isMajor ? 100 : 106, deg)
        const b = polar(112, deg)
        const inRed = red !== undefined && v >= red
        return (
          <g key={v}>
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={inRed ? 'var(--danger)' : isMajor ? '#e8edf4' : '#7d8693'} strokeWidth={isMajor ? 3 : 1.5} strokeLinecap="round" />
            {isMajor && (
              <text {...polar(84, deg)} fill={inRed ? 'var(--danger)' : '#dfe5ee'} fontSize="17" fontWeight="500" textAnchor="middle" dominantBaseline="central">
                {format(v)}
              </text>
            )}
          </g>
        )
      })}
      {/* Kazaljka */}
      <g style={{ transform: `rotate(${angle}deg)`, transformOrigin: '150px 150px', transition: 'transform 120ms linear' }}>
        <path d="M147 160 L150 34 L153 160 Z" fill="var(--accent)" style={{ filter: 'drop-shadow(0 0 5px var(--accent))' }} />
      </g>
      <circle cx="150" cy="150" r="46" fill="#05070a" stroke="#ffffff1a" strokeWidth="1.5" />
      <text x="150" y="146" fill="#fff" fontSize="34" fontWeight="300" textAnchor="middle" className="tabular-nums">
        {digits}
      </text>
      <text x="150" y="170" fill="#8a93a0" fontSize="12" textAnchor="middle">
        {unit}
      </text>
      {sub && (
        <text x="150" y="232" fill="var(--accent)" fontSize="26" fontWeight="600" textAnchor="middle">
          {sub}
        </text>
      )}
      <text x="150" y="262" fill="#8a93a0" fontSize="12" letterSpacing="1.5" textAnchor="middle">
        {label.toUpperCase()}
      </text>
    </svg>
  )
}

function DataItem({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="overlay-panel min-w-0 flex-1 px-4 py-2.5 text-center">
      <p className="truncate text-caption text-text-3">{label}</p>
      <p className="truncate text-title tabular-nums">
        {value}
        {unit && <span className="ml-1 text-small text-text-3">{unit}</span>}
      </p>
    </div>
  )
}

export function InstrumentsScreen() {
  const { t } = useT()
  useScreenTitle(t.nav.instruments)
  const v = useVehicle()
  const units = useUnits()
  const bridge = useBridge()
  const live = bridge.status === 'connected'
  const demo = useDemoDrive(!live)

  const kmh = live ? v.speedKmh : demo.kmh
  const rpm = live ? v.rpm : demo.rpm
  const gear = live ? (v.gear ?? estimateGear(v.speedKmh, v.rpm)) : demo.gear
  const mph = units.speed(100).unit === 'mph'
  const speedValue = mph ? kmh * 0.621371 : kmh
  const speedMax = mph ? 160 : 240
  const coolant = units.temp(v.coolantC)
  const oil = units.temp(v.oilC)
  const consumption = units.consumption(v.currentConsumption)
  const gearLabel = gear === -1 ? 'R' : gear === 0 ? 'N' : String(gear)

  return (
    <div
      className="relative h-full overflow-hidden"
      style={{
        background: `radial-gradient(ellipse 55% 55% at 50% 58%, color-mix(in srgb, ${vehicleProfile.colorHex} 70%, transparent) 0%, transparent 70%), linear-gradient(180deg, #03060c 0%, #000 100%)`,
      }}
    >
      {/* Moj Golf na putu — put tece stvarnom brzinom vozila */}
      <VehicleView
        view="chase"
        bare
        road
        driving={kmh > 2}
        speed={Math.max(0.5, kmh / 3.6)}
        className="absolute inset-0"
      />
      {/* Teget odsjaj ispod vozila (ambijentalno svetlo u boji auta) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-[96px] left-1/2 h-[70px] w-[300px] -translate-x-1/2 rounded-[50%]"
        style={{ background: `radial-gradient(ellipse at center, color-mix(in srgb, ${vehicleProfile.colorHex} 90%, #4d7cff) 0%, transparent 70%)`, opacity: 0.55, filter: 'blur(10px)' }}
      />

      <div className="absolute top-6 left-6 h-[440px] w-[440px] max-w-[38%]">
        <Gauge
          value={rpm}
          max={RPM_MAX}
          major={1000}
          minor={500}
          red={RPM_RED}
          label={t.instruments.rpm}
          digits={String(Math.round(rpm / 10) * 10)}
          unit={t.instruments.rpmUnit}
          sub={gearLabel}
          format={(x) => String(x / 1000)}
        />
      </div>
      <div className="absolute top-6 right-6 h-[440px] w-[440px] max-w-[38%]">
        <Gauge
          value={speedValue}
          max={speedMax}
          major={20}
          minor={10}
          label={t.instruments.speed}
          digits={String(Math.round(speedValue))}
          unit={mph ? 'mph' : 'km/h'}
          format={(x) => (x % 40 === 0 ? String(x) : '')}
        />
      </div>

      <div className="absolute inset-x-6 bottom-5 flex items-center gap-3">
        <DataItem label={t.instruments.coolant} value={coolant.value} unit={coolant.unit} />
        <DataItem label={t.instruments.oil} value={oil.value} unit={oil.unit} />
        <DataItem label={t.instruments.battery} value={units.num(v.batteryV, 1)} unit="V" />
        <DataItem label={t.instruments.consumption} value={consumption.value} unit={consumption.unit} />
      </div>

      {!live && (
        <div className="absolute top-4 left-1/2 flex -translate-x-1/2 items-center gap-3">
          <SimTag />
          <span className="text-caption text-text-3">{t.instruments.demo}</span>
        </div>
      )}
    </div>
  )
}
