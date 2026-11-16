/**
 * DEMO mapa.
 *
 * Ovo nije stvarna kartografija i ne predstavlja stvarne ulice — to je jedna
 * fiksna, namerno shematska podloga za razvoj interfejsa. Prava mapa (offline
 * podloga + GPS) dolazi kasnije i menja samo ovu komponentu, dok raspored
 * ekrana ostaje isti.
 *
 * Sve boje dolaze iz tokena (--map-*), pa mapa prati temu.
 */

const BLOCKS: [number, number, number, number][] = [
  [20, 24, 90, 62],
  [130, 14, 66, 72],
  [226, 30, 96, 56],
  [24, 112, 80, 28],
  [128, 112, 64, 28],
  [214, 112, 110, 28],
  [214, 162, 52, 32],
  [278, 162, 46, 32],
  [30, 216, 80, 60],
  [158, 214, 36, 62],
  [258, 220, 70, 56],
  [352, 20, 48, 66],
  [352, 112, 48, 82],
  [352, 216, 48, 60],
]

const MINOR_ROADS =
  'M0 100h400M0 202h400M118 0v300M204 0v300M340 0v300M0 50h118M246 202v98M24 160h94M60 202v98'
const MAIN_ROAD = 'M0 150h400'
/** Pozicija vozila u koordinatama mape. */
const VEHICLE = { x: 60, y: 228 }
const ROUTE = 'M60 228 L60 202 L204 202 L204 100 L330 100'

/**
 * Kadar mape je sirok (ekran je 16:9), pa se prikazuje pojas y 60–300.
 * Zum se radi oko pozicije vozila (procenti kadra), da vozilo ostane na
 * istom mestu na ekranu, kao u pravoj navigaciji.
 */
const VIEWBOX = '0 60 400 240'
const ZOOM_ORIGIN = '15% 72%'

export function MiniMap({
  className = '',
  showRoute = true,
  zoom = 1,
}: {
  className?: string
  showRoute?: boolean
  zoom?: number
}) {
  return (
    // Pozicioniranje odredjuje roditelj (najcesce 'absolute inset-0'). Ako bi
    // ovde stajali i 'relative' i 'absolute', mapa bi imala visinu nula.
    <div
      aria-hidden="true"
      className={
        'overflow-hidden ' + (/(absolute|fixed)/.test(className) ? '' : 'relative ') + className
      }
      style={{ background: 'var(--map-bg)' }}
    >
      <svg
        viewBox={VIEWBOX}
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 size-full transition-transform duration-300 ease-out"
        style={{ transform: 'scale(' + zoom + ')', transformOrigin: ZOOM_ORIGIN }}
      >
        {/* Park */}
        <path d="M130 228h20v48h-20zM196 214h44v62h-44z" fill="var(--map-park)" />

        {/* Blokovi zgrada */}
        <g fill="var(--map-block)">
          {BLOCKS.map(([x, y, w, h]) => (
            <rect key={x + '-' + y} x={x} y={y} width={w} height={h} rx="2" />
          ))}
        </g>

        {/* Ulice: tamna ivica pa svetlija traka — kao na pravim navigacionim mapama */}
        <path d={MINOR_ROADS} stroke="var(--map-casing)" strokeWidth="11" strokeLinecap="square" fill="none" />
        <path d={MAIN_ROAD} stroke="var(--map-casing)" strokeWidth="17" strokeLinecap="square" fill="none" />
        <path d={MINOR_ROADS} stroke="var(--map-road)" strokeWidth="8" strokeLinecap="square" fill="none" />
        <path d={MAIN_ROAD} stroke="var(--map-road-main)" strokeWidth="13" strokeLinecap="square" fill="none" />

        {showRoute && (
          <>
            {/* Obris rute, da se akcentna linija odvoji od ulice u svakoj temi */}
            <path
              d={ROUTE}
              fill="none"
              stroke="var(--map-casing)"
              strokeWidth="11"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d={ROUTE}
              fill="none"
              stroke="var(--accent)"
              strokeWidth="6.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Cilj */}
            <circle cx="330" cy="100" r="11" fill="var(--accent)" opacity="0.2" />
            <circle cx="330" cy="100" r="6" fill="var(--accent)" stroke="var(--map-bg)" strokeWidth="2.5" />
          </>
        )}

        {/* Simulirana pozicija vozila */}
        <g transform={`translate(${VEHICLE.x} ${VEHICLE.y})`}>
          <circle r="18" fill="var(--accent)" opacity="0.16" />
          <circle r="10" fill="var(--accent)" />
          <path d="M0 -6.5 L4.8 5 L0 2.6 L-4.8 5 Z" fill="var(--map-vehicle)" />
        </g>
      </svg>

      {/* Blago zatamnjenje dna, da plutajuci paneli ostanu citljivi */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'linear-gradient(to top, var(--map-fade), transparent 45%)' }}
      />
    </div>
  )
}
