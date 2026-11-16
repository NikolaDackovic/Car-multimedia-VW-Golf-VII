import { useEffect, useState } from 'react'
import { vehicleService } from '@/services/vehicle'
import type { VehicleState } from '@/services/vehicle'

export function useVehicle(): VehicleState {
  const [state, setState] = useState<VehicleState>(() => vehicleService.getState())
  useEffect(() => vehicleService.subscribe(setState), [])
  return state
}
