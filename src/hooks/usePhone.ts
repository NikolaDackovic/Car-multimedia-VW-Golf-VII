import { useEffect, useState } from 'react'
import { phoneService } from '@/services/phone'
import type { PhoneState } from '@/services/phone'

export function usePhone(): PhoneState {
  const [state, setState] = useState<PhoneState>(() => phoneService.getState())
  useEffect(() => phoneService.subscribe(setState), [])
  return state
}
