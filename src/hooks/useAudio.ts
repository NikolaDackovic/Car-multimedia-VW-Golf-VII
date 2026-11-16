import { useEffect, useState } from 'react'
import { audioService } from '@/services/audio'
import type { AudioState } from '@/services/audio'

/** Pretplata na audio servis. Komponente ne znaju odakle zvuk stiže. */
export function useAudio(): AudioState {
  const [state, setState] = useState<AudioState>(() => audioService.getState())
  useEffect(() => audioService.subscribe(setState), [])
  return state
}
