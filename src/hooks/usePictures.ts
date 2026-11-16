import { useEffect, useState } from 'react'
import { picturesService } from '@/services/pictures'
import type { PicturesState } from '@/services/pictures'

export function usePictures(): PicturesState {
  const [state, setState] = useState<PicturesState>(() => picturesService.getState())
  useEffect(() => picturesService.subscribe(setState), [])
  return state
}
