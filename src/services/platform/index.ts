import { browserPlatform } from './browserPlatform'
import type { PlatformAdapter } from './types'

export type { PlatformAdapter, PlatformCapabilities, PlatformId } from './types'

/**
 * Kada dodamo Tauri/Linux, ovde se bira adapter po okruženju —
 * ostatak aplikacije se ne menja.
 */
function detectPlatform(): PlatformAdapter {
  const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
  if (isTauri) {
    // TODO (Faza 3): tauriPlatform sa pravim hardverskim pozivima
    return { ...browserPlatform, id: 'tauri', name: 'Tauri (desktop)' }
  }
  return browserPlatform
}

export const platform: PlatformAdapter = detectPlatform()
