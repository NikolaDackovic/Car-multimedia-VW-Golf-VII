import { usePrefs } from './usePrefs'
import { useT } from './useT'

/**
 * Prikaz vrednosti u jedinicama izabranim u Podesavanjima → Jedinice.
 * Svi podaci u servisima su metricki (km, °C, l/100 km, bar); konverzija
 * se radi samo pri prikazu, kao na fabrickom uredjaju.
 */
export function useUnits() {
  const p = usePrefs()
  const { locale } = useT()

  const num = (v: number, digits = 0) =>
    v.toLocaleString(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits })

  return {
    distance(km: number, digits = 0) {
      return p['units.distance'] === 'mi'
        ? { value: num(km * 0.621371, digits), unit: 'mi' }
        : { value: num(km, digits), unit: 'km' }
    },
    speed(kmh: number) {
      return p['units.speed'] === 'mph'
        ? { value: num(kmh * 0.621371), unit: 'mph' }
        : { value: num(kmh), unit: 'km/h' }
    },
    temp(c: number, digits = 0) {
      return p['units.temp'] === 'f'
        ? { value: num((c * 9) / 5 + 32, digits), unit: '°F' }
        : { value: num(c, digits), unit: '°C' }
    },
    volume(l: number, digits = 1) {
      return p['units.volume'] === 'gal'
        ? { value: num(l * 0.264172, digits), unit: 'gal' }
        : { value: num(l, digits), unit: 'l' }
    },
    consumption(l100: number) {
      if (l100 <= 0) return { value: '--', unit: unitLabel(p['units.consumption']) }
      switch (p['units.consumption']) {
        case 'kml':
          return { value: num(100 / l100, 1), unit: 'km/l' }
        case 'mpg':
          return { value: num(235.215 / l100, 1), unit: 'mpg' }
        default:
          return { value: num(l100, 1), unit: 'l/100 km' }
      }
    },
    /** Potrosnja komfor-potrosaca u litrima na sat. */
    flow(lph: number) {
      return p['units.volume'] === 'gal'
        ? { value: num(lph * 0.264172, 2), unit: 'gal/h' }
        : { value: num(lph, 1), unit: 'l/h' }
    },
    pressure(bar: number) {
      switch (p['units.pressure']) {
        case 'psi':
          return { value: num(bar * 14.5038), unit: 'psi' }
        case 'kpa':
          return { value: num(bar * 100), unit: 'kPa' }
        default:
          return { value: num(bar, 1), unit: 'bar' }
      }
    },
    num,
  }
}

function unitLabel(u: 'l100' | 'kml' | 'mpg'): string {
  return u === 'kml' ? 'km/l' : u === 'mpg' ? 'mpg' : 'l/100 km'
}
