/**
 * Mala Volkswagen oznaka u interfejsu.
 *
 * Koristi se ravni znak (providna pozadina), preveden CSS filterom u boju
 * teksta teme (`--logo-filter`): belo na tamnoj, teget na svetloj podlozi.
 */
export function VwMark({
  size = 44,
  className = '',
  opacity = 0.55,
}: {
  size?: number
  className?: string
  opacity?: number
}) {
  return (
    <img
      src="/assets/Volkswagen_logo_2019.svg.webp"
      alt="Volkswagen"
      draggable={false}
      width={size}
      height={size}
      className={'object-contain ' + className}
      style={{ filter: 'var(--logo-filter)', opacity }}
    />
  )
}
