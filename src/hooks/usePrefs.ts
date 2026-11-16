import { useEffect, useState } from 'react'
import { prefsService } from '@/services/prefs'
import type { PrefKey, Prefs } from '@/services/prefs'

/** Sva podesavanja sistema i vozila. */
export function usePrefs(): Prefs {
  const [state, setState] = useState<Prefs>(() => prefsService.getState())
  useEffect(() => prefsService.subscribe(setState), [])
  return state
}

/** Jedno podesavanje kao par [vrednost, postavi]. */
export function usePref<K extends PrefKey>(key: K): [Prefs[K], (value: Prefs[K]) => void] {
  const prefs = usePrefs()
  return [prefs[key], (value: Prefs[K]) => prefsService.set(key, value)]
}
