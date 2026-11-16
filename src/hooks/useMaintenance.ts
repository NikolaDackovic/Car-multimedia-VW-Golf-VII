import { useEffect, useState } from 'react'
import { maintenanceService } from '@/services/maintenance'
import type { MaintenanceState } from '@/services/maintenance'

export function useMaintenance(): MaintenanceState {
  const [state, setState] = useState<MaintenanceState>(() => maintenanceService.getState())
  useEffect(() => maintenanceService.subscribe(setState), [])
  return state
}
