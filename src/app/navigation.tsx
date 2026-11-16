import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'

/** Glavni ekrani — odgovaraju plocicama fabrickog menija i tasterima MENU/HOME. */
export const SCREENS = [
  'home',
  'menu',
  'radio',
  'media',
  'phone',
  'appconnect',
  'vehicle',
  'assist',
  'sound',
  'settings',
  'navigation',
  'pictures',
  'climate',
  'instruments',
] as const
export type ScreenId = (typeof SCREENS)[number]

/** Ekrani koje korisnik moze da izabere kao pocetni posle pokretanja. */
export const STARTUP_SCREENS: ScreenId[] = ['home', 'menu', 'radio', 'media', 'navigation', 'vehicle']

interface NavEntry {
  screen: ScreenId
  /** Putanja podmenija unutar ekrana, npr. ['display'] u Podesavanjima. */
  path: string[]
}

interface NavContextValue {
  screen: ScreenId
  path: string[]
  /** Postoji podmeni iz kog se moze nazad (strelica u naslovnoj traci). */
  canGoBack: boolean
  /** Otvara glavni ekran (podmeniji se zatvaraju). */
  go: (screen: ScreenId, path?: string[]) => void
  /** Ulazi u podmeni trenutnog ekrana. */
  push: (segment: string) => void
  /** Zamenjuje poslednji nivo podmenija (npr. kartice). */
  replace: (path: string[]) => void
  /** Jedan nivo nazad: prvo kroz podmenije, pa kroz istoriju ekrana. */
  back: () => void
}

const NavContext = createContext<NavContextValue | null>(null)

const HISTORY_LIMIT = 12

export function NavigationProvider({
  initial,
  initialPath = [],
  onChange,
  children,
}: {
  initial: ScreenId
  initialPath?: string[]
  onChange?: (screen: ScreenId) => void
  children: ReactNode
}) {
  // Ekran, podmeni i istorija su jedno stanje: tako se ne mogu raziti.
  const [{ current }, setNav] = useState<{ current: NavEntry; history: NavEntry[] }>({
    current: { screen: initial, path: initialPath },
    history: [],
  })

  const go = useCallback((screen: ScreenId, path: string[] = []) => {
    setNav((state) =>
      state.current.screen === screen && path.length === 0 && state.current.path.length === 0
        ? state
        : {
            current: { screen, path },
            history: [...state.history, { ...state.current, path: [] }].slice(-HISTORY_LIMIT),
          },
    )
  }, [])

  const push = useCallback((segment: string) => {
    setNav((state) => ({
      ...state,
      current: { ...state.current, path: [...state.current.path, segment] },
    }))
  }, [])

  const replace = useCallback((path: string[]) => {
    setNav((state) => ({ ...state, current: { ...state.current, path } }))
  }, [])

  const back = useCallback(() => {
    setNav((state) => {
      if (state.current.path.length > 0) {
        return { ...state, current: { ...state.current, path: state.current.path.slice(0, -1) } }
      }
      if (state.history.length === 0) {
        return state.current.screen === 'home'
          ? state
          : { current: { screen: 'home', path: [] }, history: [] }
      }
      return {
        current: state.history[state.history.length - 1],
        history: state.history.slice(0, -1),
      }
    })
  }, [])

  // Pamcenje poslednjeg ekrana ide kroz efekat, van azuriranja stanja.
  const onChangeRef = useRef(onChange)
  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])
  useEffect(() => {
    onChangeRef.current?.(current.screen)
  }, [current.screen])

  const value = useMemo(
    () => ({
      screen: current.screen,
      path: current.path,
      canGoBack: current.path.length > 0,
      go,
      push,
      replace,
      back,
    }),
    [current, go, push, replace, back],
  )
  return <NavContext.Provider value={value}>{children}</NavContext.Provider>
}

export function useNavigation(): NavContextValue {
  const ctx = useContext(NavContext)
  if (!ctx) throw new Error('useNavigation mora biti unutar NavigationProvider')
  return ctx
}
