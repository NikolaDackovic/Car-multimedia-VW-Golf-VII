import { useEffect, useState } from 'react'
import { prefsService } from '@/services/prefs'
import { usePrefs } from './usePrefs'

/** Trenutno vreme sistema: sat uredjaja + rucna korekcija (izvor vremena "Rucno"). */
export function systemNow(): Date {
  const p = prefsService.getState()
  const offset = p['time.source'] === 'manual' ? p['time.offsetMin'] : 0
  return new Date(Date.now() + offset * 60_000)
}

/**
 * Trenutno vreme za prikaz sata (sati i minuti).
 *
 * Proverava svake sekunde, ali novo stanje postavlja samo kada se promeni
 * minut — ekrani sa satom se tako ne iscrtavaju ponovo 60 puta u minuti.
 * Promena rucne korekcije vremena se primenjuje odmah.
 */
export function useClock(checkMs = 1000): Date {
  const prefs = usePrefs()
  const offset = prefs['time.source'] === 'manual' ? prefs['time.offsetMin'] : 0
  const [now, setNow] = useState(systemNow)

  useEffect(() => {
    setNow(systemNow())
    const id = window.setInterval(() => {
      const next = systemNow()
      setNow((prev) =>
        prev.getMinutes() === next.getMinutes() &&
        prev.getHours() === next.getHours() &&
        prev.getDate() === next.getDate()
          ? prev
          : next,
      )
    }, checkMs)
    return () => window.clearInterval(id)
  }, [checkMs, offset])
  return now
}

export function formatTime(d: Date, use24h = true, locale = 'sr-Latn-RS'): string {
  return d.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: !use24h,
  })
}

export function formatDate(d: Date, locale = 'sr-Latn-RS'): string {
  return d.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })
}

/** Kratak datum u formatu izabranom u Podesavanjima (DD.MM.GGGG, GGGG-MM-DD, MM-DD-GGGG). */
export function formatDateShort(d: Date, format: 'dmy' | 'ymd' | 'mdy'): string {
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  if (format === 'ymd') return `${yyyy}-${mm}-${dd}`
  if (format === 'mdy') return `${mm}-${dd}-${yyyy}`
  return `${dd}.${mm}.${yyyy}`
}

export function formatDuration(sec: number): string {
  if (!Number.isFinite(sec) || sec <= 0) return '0:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

/** Trajanje voznje "1:05 h" kao na fabrickom MFD-u. */
export function formatDriveTime(min: number): string {
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  return `${h}:${String(m).padStart(2, '0')} h`
}
