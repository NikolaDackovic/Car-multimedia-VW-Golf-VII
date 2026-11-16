import { useEffect, useState } from 'react'
import { soundService } from '@/services/sound'
import type { SoundState } from '@/services/sound'

export function useSound(): SoundState {
  const [state, setState] = useState<SoundState>(() => soundService.getState())
  useEffect(() => soundService.subscribe(setState), [])
  return state
}
