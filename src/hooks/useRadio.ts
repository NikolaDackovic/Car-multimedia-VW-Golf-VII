import { useEffect, useState } from 'react'
import { radioService } from '@/services/radio'
import type { RadioState } from '@/services/radio'

export function useRadio(): RadioState {
  const [state, setState] = useState<RadioState>(() => radioService.getState())
  useEffect(() => radioService.subscribe(setState), [])
  return state
}
