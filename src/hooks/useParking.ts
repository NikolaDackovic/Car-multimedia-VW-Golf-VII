import { useEffect, useState } from 'react'
import { parkingService } from '@/services/parking'
import type { ParkState } from '@/services/parking'

export function useParking(): ParkState {
  const [state, setState] = useState<ParkState>(() => parkingService.getState())
  useEffect(() => parkingService.subscribe(setState), [])
  return state
}
