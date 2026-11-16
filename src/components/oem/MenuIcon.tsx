import { useId } from 'react'
import type { ReactNode } from 'react'

/**
 * Ikonice glavnog menija — moderan stil novijih VW sistema: cista bela
 * linija i akcentni (plavi) detalji sa blagim sjajem. Akcent prati boju iz
 * Podesavanja → Ekran, jer se uzima iz CSS promenljive --accent.
 *
 * Sve je vektorsko (SVG), ostro na svakoj velicini; prelivi imaju
 * jedinstvene ID-jeve po instanci.
 */
export type MenuIconName =
  | 'radio'
  | 'phone'
  | 'appconnect'
  | 'vehicle'
  | 'media'
  | 'assist'
  | 'sound'
  | 'settings'
  | 'navigation'
  | 'pictures'
  | 'climate'
  | 'parking'
  | 'instruments'

/** Zupcanik: naizmenicni zubi po obodu (spoljni R, unutrasnji r). */
function gearPath(cx: number, cy: number, teeth: number, R: number, r: number): string {
  const pts: string[] = []
  const step = (Math.PI * 2) / teeth
  for (let i = 0; i < teeth; i++) {
    const a = i * step
    const corners = [
      [a - step * 0.26, r],
      [a - step * 0.16, R],
      [a + step * 0.16, R],
      [a + step * 0.26, r],
      [a + step * 0.5, r],
    ] as const
    for (const [ang, rad] of corners) pts.push(`${(cx + Math.cos(ang) * rad).toFixed(2)} ${(cy + Math.sin(ang) * rad).toFixed(2)}`)
  }
  return 'M' + pts.join(' L') + ' Z'
}

const GEAR = gearPath(60, 60, 8, 43, 34)
const SW = 4.5
const DARK = '#0b0d10'

export function MenuIcon({ name, size = 112 }: { name: MenuIconName; size?: number | string }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const id = (n: string) => `${n}-${uid}`
  const L = `url(#${id('line')})`
  const A = `url(#${id('acc')})`
  const line = { stroke: L, strokeWidth: SW, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' }

  let body: ReactNode
  switch (name) {
    case 'radio':
      body = (
        <>
          <path d="M36 40 L80 20" {...line} />
          <rect x="20" y="40" width="80" height="54" rx="12" {...line} />
          <circle cx="45" cy="67" r="13" fill={A} />
          <circle cx="45" cy="67" r="4" fill={DARK} />
          <path d="M68 58h18M68 67h18M68 76h12" {...line} />
        </>
      )
      break

    case 'phone':
      body = (
        <>
          <path
            d="M41 22c3.6-1.6 7.8-.2 9.6 3.3l6.3 12.4c1.6 3.2.9 7.1-1.8 9.5l-5.4 4.8c4.2 9.6 11.7 17.1 21.3 21.3l4.8-5.4c2.4-2.7 6.3-3.4 9.5-1.8l12.4 6.3c3.5 1.8 4.9 6 3.3 9.6l-3.4 7.6c-2.3 5.2-7.9 8.2-13.5 7.2C55.5 91.2 28.8 64.5 23.2 33.1c-1-5.6 2-11.2 7.2-13.5z"
            fill={A}
          />
          <path d="M70 24a28 28 0 0 1 26 26M70 37a15 15 0 0 1 13 13" {...line} />
        </>
      )
      break

    case 'appconnect':
      body = (
        <>
          <rect x="14" y="30" width="58" height="44" rx="8" {...line} />
          <path d="M30 90h26M43 74v16" {...line} />
          <rect x="64" y="22" width="40" height="74" rx="10" fill={A} />
          <rect x="70" y="31" width="28" height="50" rx="4" fill={DARK} opacity="0.55" />
          <circle cx="84" cy="88" r="2.8" fill={DARK} />
        </>
      )
      break

    case 'vehicle':
      // Hecbek iz profila (Golf), jasno prepoznatljiv i u malim velicinama
      body = (
        <>
          <path d="M42 54 L53 41 Q55.5 38 59.5 38 L70 38 L70 54 Z M75 38 L84 38 Q88 38 90.5 41.5 L97 54 L75 54 Z" fill={A} />
          <path
            d="M12 76 V67 Q12 60 19 58.5 L37 55 L50 39.5 Q55 34 62 34 H85 Q91.5 34 95 39.5 L103.5 55 Q109 57.5 109 64 V76 Q109 80 105 80 H16 Q12 80 12 76 Z"
            {...line}
          />
          <path d="M98 64h7M16 64h6" stroke={A} strokeWidth="4.5" strokeLinecap="round" />
          <circle cx="34" cy="80" r="11" fill={DARK} stroke={L} strokeWidth={SW} />
          <circle cx="88" cy="80" r="11" fill={DARK} stroke={L} strokeWidth={SW} />
          <circle cx="34" cy="80" r="3.5" fill={A} />
          <circle cx="88" cy="80" r="3.5" fill={A} />
        </>
      )
      break

    case 'media':
      body = (
        <>
          <circle cx="60" cy="60" r="40" {...line} />
          <path d="M51 42 L80 60 L51 78 Z" fill={A} stroke={A} strokeWidth="5" strokeLinejoin="round" />
        </>
      )
      break

    case 'assist':
      // Vozilo odozgo izmedju linija trake, sa radarom ispred — sistemi za pomoc vozacu
      body = (
        <>
          <path d="M26 16 V104 M94 16 V104" {...line} />
          <path d="M60 18 V30 M60 92 V104" {...line} opacity="0.5" />
          <path d="M44 34 a22 22 0 0 1 32 0 M49 25 a30 30 0 0 1 22 0" stroke={A} strokeWidth={SW} strokeLinecap="round" fill="none" opacity="0.8" />
          <rect x="45" y="42" width="30" height="54" rx="11" fill={A} />
          <path d="M49 58 Q60 53 71 58 L69 66 Q60 63 51 66 Z" fill={DARK} opacity="0.75" />
          <path d="M51 84 Q60 87 69 84 L70 89 Q60 92 50 89 Z" fill={DARK} opacity="0.6" />
        </>
      )
      break

    case 'sound':
      body = (
        <>
          <path d="M36 22v76M60 22v76M84 22v76" {...line} opacity="0.5" />
          <rect x="26" y="54" width="20" height="14" rx="5" fill={A} />
          <rect x="50" y="32" width="20" height="14" rx="5" fill={A} />
          <rect x="74" y="70" width="20" height="14" rx="5" fill={A} />
        </>
      )
      break

    case 'settings':
      body = (
        <>
          <path d={GEAR} {...line} />
          <circle cx="60" cy="60" r="13" fill={A} />
        </>
      )
      break

    case 'navigation':
      body = (
        <>
          <circle cx="60" cy="60" r="40" {...line} />
          <path d="M60 30 L79 86 L60 75 L41 86 Z" fill={A} stroke={A} strokeWidth="3" strokeLinejoin="round" />
        </>
      )
      break

    case 'pictures':
      body = (
        <>
          <rect x="18" y="26" width="84" height="68" rx="12" {...line} />
          <path d="M28 86 L50 60 L63 74 L73 64 L92 86 Z" fill={A} stroke={A} strokeWidth="3" strokeLinejoin="round" />
          <circle cx="80" cy="45" r="7" fill={L} />
        </>
      )
      break

    case 'climate':
      body = (
        <>
          <circle cx="60" cy="60" r="40" {...line} />
          {[0, 120, 240].map((a) => (
            <path key={a} d="M60 60 C55 47 57 34 67 28 C76 36 73 50 60 60 Z" fill={A} transform={`rotate(${a} 60 60)`} />
          ))}
          <circle cx="60" cy="60" r="6.5" fill={DARK} stroke={L} strokeWidth="3" />
        </>
      )
      break

    case 'instruments':
      // Brzinomer: luk sa podeocima, akcentni deo skale i kazaljka
      body = (
        <>
          <path d="M24 86 A42 42 0 1 1 96 86" {...line} />
          <path d="M28.5 90 A46 46 0 0 1 22 46" stroke={A} strokeWidth="6" strokeLinecap="round" fill="none" />
          <path d="M60 30v8M33 41l6 5M87 41l-6 5M24 66h8M96 66h-8" {...line} />
          <path d="M60 68 L83 46" stroke={A} strokeWidth="6" strokeLinecap="round" />
          <circle cx="60" cy="68" r="8" fill={A} />
          <path d="M48 94h24" {...line} />
        </>
      )
      break

    case 'parking':
      body = (
        <>
          <rect x="20" y="20" width="80" height="80" rx="20" {...line} />
          <path
            d="M48 86V34h17c11 0 18 6.5 18 16s-7 16-18 16h-8v20z M57 42v16h7.5c5 0 9-3 9-8s-4-8-9-8z"
            fill={A}
            fillRule="evenodd"
          />
        </>
      )
      break
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      aria-hidden="true"
      style={{ overflow: 'visible', filter: 'drop-shadow(0 0 8px color-mix(in srgb, var(--accent) 35%, transparent))' }}
    >
      <defs>
        <linearGradient id={id('line')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#b9c3d0" />
        </linearGradient>
        <linearGradient id={id('acc')} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" style={{ stopColor: 'color-mix(in srgb, var(--accent) 55%, #ffffff)' }} />
          <stop offset="1" style={{ stopColor: 'var(--accent)' }} />
        </linearGradient>
      </defs>
      {body}
    </svg>
  )
}
