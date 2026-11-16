import { storage } from '@/services/storage'

/**
 * Podesavanja zvuka (ekvilajzer, balans, fader, presets).
 *
 * VAZNO: ove vrednosti se cuvaju i prikazuju, ali jos NE menjaju zvuk.
 * Browser audio izlaz nema pristup pojacalu vozila; za stvarno dejstvo
 * potreban je audio lanac na uredjaju (Web Audio filteri ili sistemski mikser),
 * sto dolazi uz Linux/Tauri platformu. Interfejs to jasno navodi.
 */
export interface SoundState {
  bass: number // -7..7
  mid: number
  treble: number
  balance: number // -7 (levo) .. 7 (desno)
  fader: number // -7 (nazad) .. 7 (napred)
  loudness: boolean
  preset: PresetId
}

export type PresetId = 'standard' | 'vocal' | 'rock' | 'custom'

export const PRESETS: Record<Exclude<PresetId, 'custom'>, Pick<SoundState, 'bass' | 'mid' | 'treble'>> = {
  standard: { bass: 0, mid: 0, treble: 0 },
  vocal: { bass: -1, mid: 3, treble: 1 },
  rock: { bass: 4, mid: -1, treble: 3 },
}

const DEFAULTS: SoundState = {
  bass: 0,
  mid: 0,
  treble: 0,
  balance: 0,
  fader: 0,
  loudness: false,
  preset: 'standard',
}

export interface SoundService {
  getState(): SoundState
  subscribe(listener: (s: SoundState) => void): () => void
  set<K extends keyof SoundState>(key: K, value: SoundState[K]): void
  applyPreset(id: PresetId): void
  reset(): void
}

export function createSoundService(): SoundService {
  let state: SoundState = { ...DEFAULTS, ...storage.read<Partial<SoundState>>('sound', {}) }
  const listeners = new Set<(s: SoundState) => void>()

  function commit(next: SoundState) {
    state = next
    storage.write('sound', state)
    for (const l of listeners) l(state)
  }

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener)
      listener(state)
      return () => listeners.delete(listener)
    },
    set(key, value) {
      // Rucna izmena tona znaci da vise nismo na gotovoj postavci.
      const leavesPreset = key === 'bass' || key === 'mid' || key === 'treble'
      commit({ ...state, [key]: value, ...(leavesPreset ? { preset: 'custom' as PresetId } : {}) })
    },
    applyPreset(id) {
      if (id === 'custom') {
        commit({ ...state, preset: 'custom' })
        return
      }
      commit({ ...state, ...PRESETS[id], preset: id })
    },
    reset() {
      commit({ ...DEFAULTS })
    },
  }
}

export const soundService: SoundService = createSoundService()
