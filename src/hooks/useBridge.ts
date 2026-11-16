import { useEffect, useState } from 'react'
import { bridgeService } from '@/services/bridge'
import type { BridgeState } from '@/services/bridge'

export function useBridge(): BridgeState {
  const [state, setState] = useState<BridgeState>(() => bridgeService.getState())
  useEffect(() => bridgeService.subscribe(setState), [])
  return state
}
