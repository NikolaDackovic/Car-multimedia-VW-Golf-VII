import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { vehicleProfile } from '@/services/vehicle/profile'

/**
 * Studijski prikaz mog automobila.
 *
 * Koriste se moje fotografije izrezane iz pozadine (scripts/cutout-vehicle.mjs),
 * bez registarske tablice. Automobil stoji u tamnoj sceni sa reflektorom
 * odozgo, kontaktnom senkom i odrazom na podu.
 *
 * Fotografija desne strane (side-right.jpg) seče prednji branik na ivici
 * kadra, pa se desni profil crta kao ogledalo levog, koji je ceo.
 *
 * Velicina vozila se racuna i po sirini i po visini okvira (container
 * jedinice cqw/cqh), pa auto nikada ne izlazi iz kartice ni u uskim ni u
 * niskim prostorima.
 */
export type VehicleView = 'front' | 'right' | 'left'

const SOURCES: Record<VehicleView, { src: string; aspect: number; mirror: boolean }> = {
  front: { src: vehicleProfile.cutouts.front, aspect: 1265 / 778, mirror: false },
  left: { src: vehicleProfile.photos.sideLeft, aspect: 1411 / 534, mirror: false },
  right: { src: vehicleProfile.photos.sideLeft, aspect: 1411 / 534, mirror: true },
}

/** Najveci udeo okvira koji vozilo sme da zauzme (sirina, visina) i visina poda. */
const LAYOUT: Record<VehicleView, { w: number; h: number; floor: number }> = {
  front: { w: 66, h: 62, floor: 16 },
  left: { w: 80, h: 52, floor: 22 },
  right: { w: 80, h: 52, floor: 22 },
}

export function VehicleRender({
  view = 'front',
  className = '',
  compact = false,
  children,
}: {
  view?: VehicleView
  className?: string
  /** Kompaktna varijanta za male kartice: bez odraza, sa vise vazduha. */
  compact?: boolean
  /**
   * Oznake na vozilu (tacke, sjaj svetala...). Crtaju se unutar okvira slike,
   * pa se pozicioniraju sa carPoint() u procentima slike, ne scene.
   */
  children?: ReactNode
}) {
  const source = SOURCES[view]
  const layout = LAYOUT[view]
  const w = compact ? layout.w - 8 : layout.w
  const h = compact ? layout.h - 6 : layout.h
  const floor = compact ? layout.floor - 4 : layout.floor

  return (
    // Pozicioniranje odredjuje roditelj (najcesce 'absolute inset-0').
    <div
      className={'overflow-hidden ' + (/(absolute|fixed)/.test(className) ? '' : 'relative ') + className}
      style={{ containerType: 'size' }}
    >
      <div className="absolute inset-0" style={{ background: 'var(--stage-bg)' }} />
      {/* Svetla povrsina poda */}
      <div
        className="absolute left-1/2 -translate-x-1/2 rounded-[50%]"
        style={{
          bottom: floor - 9 + '%',
          width: w * 1.2 + '%',
          height: '24%',
          background:
            'radial-gradient(ellipse at 50% 40%, color-mix(in srgb, var(--accent) 14%, transparent) 0%, var(--stage-floor) 38%, transparent 70%)',
        }}
      />

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={view}
          initial={{ opacity: 0, x: view === 'left' ? 40 : -40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: view === 'left' ? -40 : 40 }}
          transition={{ duration: 0.32, ease: [0.22, 0.61, 0.36, 1] }}
          className="absolute inset-0"
        >
          {/* Pozornica: okvir tacno velicine slike — sve unutra je u % slike */}
          <div
            className="absolute left-1/2 -translate-x-1/2"
            style={{
              width: `min(${w}cqw, ${(h * source.aspect).toFixed(2)}cqh)`,
              bottom: floor + '%',
              aspectRatio: String(source.aspect),
            }}
          >
            <div
              className="absolute left-[5%] w-[90%] rounded-[50%]"
              style={{
                top: '90%',
                height: compact ? '14%' : '12%',
                background: 'radial-gradient(ellipse, #000000f0 0%, #00000090 45%, transparent 72%)',
                filter: 'blur(4px)',
              }}
            />
            <img
              src={source.src}
              alt="Volkswagen Golf VII"
              draggable={false}
              className="absolute inset-0 size-full"
              style={{
                filter: 'drop-shadow(0 16px 20px #000000b0) saturate(1.06) contrast(1.04)',
                transform: source.mirror ? 'scaleX(-1)' : undefined,
              }}
            />
            {!compact && (
              <img
                src={source.src}
                alt=""
                aria-hidden="true"
                draggable={false}
                className="absolute left-0 w-full opacity-[0.12]"
                style={{
                  top: '94%',
                  transform: source.mirror ? 'scale(-1, -1)' : 'scaleY(-1)',
                  filter: 'blur(2px)',
                  maskImage: 'linear-gradient(to top, #000 0%, transparent 40%)',
                  WebkitMaskImage: 'linear-gradient(to top, #000 0%, transparent 40%)',
                }}
              />
            )}
            {children}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

/** Delovi vozila na koje se kace oznake (tacke statusa, sjaj svetala, greske). */
export type CarPart =
  | 'frontLight'
  | 'rearLight'
  | 'door'
  | 'frontWheel'
  | 'rearWheel'
  | 'bonnet'
  | 'cabin'

/** Polozaji delova u procentima SLIKE, izmereni na levom profilu i 3/4 pogledu spreda. */
const LEFT: Record<CarPart, { x: number; y: number }> = {
  frontLight: { x: 7, y: 50 },
  rearLight: { x: 94.5, y: 38 },
  door: { x: 59.5, y: 40 },
  frontWheel: { x: 19, y: 75 },
  rearWheel: { x: 83, y: 76 },
  bonnet: { x: 18, y: 40 },
  cabin: { x: 50, y: 21 },
}

const POINTS: Record<VehicleView, Record<CarPart, { x: number; y: number }>> = {
  left: LEFT,
  // Desni profil je ogledalo levog: x se preslikava
  right: Object.fromEntries(
    Object.entries(LEFT).map(([k, p]) => [k, { x: 100 - p.x, y: p.y }]),
  ) as Record<CarPart, { x: number; y: number }>,
  front: {
    frontLight: { x: 48, y: 58 },
    rearLight: { x: 94, y: 32 },
    door: { x: 85, y: 42 },
    frontWheel: { x: 69, y: 77 },
    rearWheel: { x: 96, y: 51 },
    bonnet: { x: 36, y: 39 },
    cabin: { x: 51, y: 17 },
  },
}

/** Tacka dela vozila u procentima slike — koristi se unutar <VehicleRender>{...}</VehicleRender>. */
export function carPoint(view: VehicleView, part: CarPart): { x: number; y: number } {
  return POINTS[view][part]
}
