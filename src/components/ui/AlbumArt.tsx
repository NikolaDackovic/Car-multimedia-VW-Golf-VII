import type { Track } from '@/services/audio'

/**
 * Omot albuma. Ako je ugradjen u fajl (ID3 APIC), prikazuje se prava slika;
 * u suprotnom se crta stabilan gradijent izveden iz `hue` pesme, da svaka
 * pesma ima prepoznatljivu boju. Dekorativan je — naziv pesme uvek stoji
 * pored, pa je alt prazan.
 */
export function AlbumArt({
  track,
  size = 240,
  rounded = 8,
  className = '',
}: {
  track?: Track
  size?: number
  rounded?: number
  className?: string
}) {
  const hue = track?.hue ?? 210
  const initials = (track?.title ?? '--')
    .split(' ')
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase()

  if (track?.coverUrl) {
    return (
      <img
        src={track.coverUrl}
        alt=""
        draggable={false}
        className={'shrink-0 object-cover ' + className}
        style={{ width: size, height: size, borderRadius: rounded, boxShadow: 'inset 0 0 0 1px #ffffff14, var(--shadow-1)' }}
      />
    )
  }

  const background =
    'linear-gradient(145deg, hsl(' +
    hue +
    ' 55% 34%), hsl(' +
    ((hue + 48) % 360) +
    ' 50% 14%))'

  return (
    <div
      className={'relative shrink-0 overflow-hidden ' + className}
      style={{ width: size, height: size, borderRadius: rounded, background, boxShadow: 'var(--shadow-1)' }}
      aria-hidden="true"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,#ffffff26,transparent_60%)]" />
      <div className="absolute inset-0 rounded-[inherit] shadow-[inset_0_0_0_1px_#ffffff14]" />
      <div
        className="absolute inset-0 flex items-center justify-center font-light text-white/80"
        style={{ fontSize: size * 0.2, letterSpacing: '0.04em' }}
      >
        {initials}
      </div>
    </div>
  )
}
