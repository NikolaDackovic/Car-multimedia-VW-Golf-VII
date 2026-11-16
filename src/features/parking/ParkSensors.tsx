import { ZONE_COUNT, zoneOf } from '@/services/parking'
import type { Sectors } from '@/services/parking'

/**
 * Fabricki OPS prikaz (Golf 7): zone senzora oko vozila. Samo vozilo je moj
 * 3D model iz pticije perspektive, ispod ovog crteza, u istoj razmeri.
 * Svaki senzor ima svoj sektor sa cetiri zone; svetli zona u kojoj je
 * prepreka — zuto dalje, crveno najblize. Jedinice crteza su cm vozila
 * (Golf VII: 4,26 m × 1,80 m), prednji deo je gore.
 */

/** Zone prate oblik branika (superelipsa), pa se ugaoni sektori "obavijaju" oko uglova. */
const SHAPE = { cx: 0, cy: 60, rx0: 102, ry0: 170, step: 24, band: 19, n: 3.5 }

function pt(rx: number, ry: number, deg: number, cy: number): string {
  const a = (deg * Math.PI) / 180
  const c = Math.cos(a)
  const s = Math.sin(a)
  const e = 2 / SHAPE.n
  const x = rx * Math.sign(c) * Math.abs(c) ** e
  const y = cy + ry * Math.sign(s) * Math.abs(s) ** e
  return `${x.toFixed(1)} ${y.toFixed(1)}`
}

function sectorPath(zone: number, from: number, to: number, front: boolean): string {
  const cy = front ? -SHAPE.cy : SHAPE.cy
  const r0x = SHAPE.rx0 + zone * SHAPE.step
  const r0y = SHAPE.ry0 + zone * SHAPE.step
  const r1x = r0x + SHAPE.band
  const r1y = r0y + SHAPE.band
  const steps = 10
  const outer: string[] = []
  const inner: string[] = []
  for (let i = 0; i <= steps; i++) {
    const d = from + ((to - from) * i) / steps
    outer.push(pt(r1x, r1y, d, cy))
    inner.push(pt(r0x, r0y, to - ((to - from) * i) / steps, cy))
  }
  return 'M' + outer.join(' L') + ' L' + inner.join(' L') + ' Z'
}

/** Uglovi sektora (stepeni, 0 = desno, 90 = nazad): levi ugao, levo, desno, desni ugao — gledano odozgo. */
const REAR_SECTORS: [number, number][] = [
  [158, 124],
  [122, 91],
  [89, 58],
  [56, 22],
]
const FRONT_SECTORS: [number, number][] = [
  [202, 236],
  [238, 269],
  [271, 302],
  [304, 338],
]

const ZONE_COLOR = ['var(--danger)', 'var(--warn)', 'var(--warn)', 'var(--warn)']

function SensorRing({ list, front, enabled }: { list: Sectors; front: boolean; enabled: boolean }) {
  const sectors = front ? FRONT_SECTORS : REAR_SECTORS
  return (
    <g>
      {sectors.map(([from, to], i) => {
        const corner = i === 0 || i === 3
        const active = enabled ? zoneOf(list[i], front, corner) : null
        return (
          <g key={i}>
            {Array.from({ length: ZONE_COUNT }, (_, z) => (
              <path
                key={z}
                d={sectorPath(z, from, to, front)}
                fill={active === z ? ZONE_COLOR[z] : 'var(--surface-3)'}
                opacity={active === z ? 1 : enabled ? 0.55 : 0.2}
                style={{ transition: 'fill 120ms, opacity 120ms', filter: active === z ? 'drop-shadow(0 0 6px ' + ZONE_COLOR[z] + ')' : undefined }}
              />
            ))}
          </g>
        )
      })}
    </g>
  )
}

export function ParkSensors({
  front,
  rear,
  frontEnabled,
  fault,
  className = '',
}: {
  front: Sectors
  rear: Sectors
  frontEnabled: boolean
  fault?: boolean
  className?: string
}) {
  return (
    <svg viewBox="-260 -360 520 720" className={className} role="img" aria-label="ParkPilot">
      <SensorRing list={front} front enabled={frontEnabled && !fault} />
      <SensorRing list={rear} front={false} enabled={!fault} />
    </svg>
  )
}
