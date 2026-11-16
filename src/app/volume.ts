import { audioService } from '@/services/audio'

/** Fabricki uredjaj ima 30 stepeni glasnoce. */
export const VOLUME_STEPS = 30

/**
 * Menja glasnocu za `delta` koraka. Koriste je fizicki tasteri multimedije
 * (preko tastature/HID dogadjaja) i kontrole na ekranu.
 */
export function changeVolume(delta: number) {
  const s = audioService.getState()
  const current = s.muted ? 0 : Math.round(s.volume * VOLUME_STEPS)
  const next = Math.max(0, Math.min(VOLUME_STEPS, current + delta))
  audioService.setVolume(next / VOLUME_STEPS)
  if (next > 0 && s.muted) audioService.setMuted(false)
}
