import { Component, Suspense, lazy, useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useT } from '@/hooks/useT'
import { VehicleRender } from './VehicleRender'
import type { VehicleView as PhotoView } from './VehicleRender'
import type { Car3DProps, CarView } from './Car3D'
import { stage } from './stage'

/**
 * Prikaz vozila u 3D.
 *
 * Koristi jednu stalnu scenu (stage.ts) koja se pripremi skrivena odmah
 * posle pokretanja, pa se vozilo pojavljuje trenutno, a izmedju ekrana kamera
 * samo predje u novi kadar. Ako je scena zauzeta, prikaz pravi svoje platno.
 * Fotografija se koristi jedino kada uredjaj nema WebGL ili ucitavanje ne uspe.
 */
const Car3D = lazy(() => import('./Car3D'))

/** Pokrece ucitavanje 3D modula i modela u pozadini (poziva se pri pokretanju sistema). */
export function preload3D() {
  if (hasWebGL()) void import('./Car3D')
}

let webglSupport: boolean | null = null
export function hasWebGL(): boolean {
  if (webglSupport !== null) return webglSupport
  try {
    const canvas = document.createElement('canvas')
    webglSupport = Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'))
  } catch {
    webglSupport = false
  }
  return webglSupport
}

class Fallback3D extends Component<{ fallback: ReactNode; children: ReactNode; onError?: () => void }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch() {
    this.props.onError?.()
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

/** Samo u razvoju: `&nointro` preskace uvodnu animaciju (za snimke ekrana). */
const DEV_NO_INTRO = import.meta.env.DEV && new URLSearchParams(window.location.search).has('nointro')

const PHOTO_VIEW: Record<CarView, PhotoView> = { front: 'front', side: 'left', rear: 'front', top: 'left', parkTop: 'left', chase: 'front', frontRight: 'front', rearLeft: 'front', rearRight: 'front', rearCenter: 'front', bootSide: 'left' }

/** Uvodna animacija (put, tockovi, kamera) samo pri prvom prikazu posle pokretanja. */
let introPlayed = false

/**
 * Stalna 3D scena — montira se jednom u ljusci sistema. Dok je nijedan ekran
 * ne koristi, crta se u skrivenom okviru (tako se sejderi i osvetljenje
 * pripreme unapred).
 */
export function VehicleStage() {
  const parkingRef = useRef<HTMLDivElement>(null)
  const st = useSyncExternalStore(stage.subscribe, stage.get)
  const webgl = hasWebGL()
  useLayoutEffect(() => {
    if (!webgl) return
    stage.setMounted(parkingRef.current)
    return () => stage.setMounted(null)
  }, [webgl])
  if (!webgl) return null
  return (
    <>
      <div ref={parkingRef} aria-hidden="true" className="pointer-events-none absolute top-0 left-0 h-[560px] w-[960px] opacity-0" style={{ zIndex: -1 }} />
      {createPortal(
        <Fallback3D fallback={null} onError={() => stage.setMounted(null)}>
          <Suspense fallback={null}>
            <Car3D {...st.props} className="absolute inset-0" onReady={stage.setReady} />
          </Suspense>
        </Fallback3D>,
        st.el,
      )}
    </>
  )
}

/**
 * `bare`: samo vozilo, bez pozadine scene, trake ucitavanja i fotografije
 * (npr. ParkPilot, koji ima svoj crtez dok se 3D ne prikaze). `onLoaded`
 * javlja kada je 3D prikazan.
 */
export function VehicleView({
  view = 'front',
  className = '',
  bare = false,
  onLoaded,
  priority = false,
  ...rest
}: Car3DProps & { bare?: boolean; onLoaded?: () => void; priority?: boolean }) {
  const { t } = useT()
  const [owner] = useState(() => Symbol('vehicle-view'))
  const hostRef = useRef<HTMLDivElement>(null)
  const st = useSyncExternalStore(stage.subscribe, stage.get)
  const [intro] = useState(() => rest.intro ?? (!bare && !introPlayed && !DEV_NO_INTRO))
  const [mode, setMode] = useState<'stage' | 'local' | null>(null)
  const [localReady, setLocalReady] = useState(false)
  const onLocalReady = useCallback(() => setLocalReady(true), [])
  const webgl = hasWebGL()

  const props = { ...(bare ? { road: false } : {}), ...rest, view, intro }
  const propsRef = useRef(props)
  propsRef.current = props

  // Preuzimanje stalne scene pri otvaranju ekrana, vracanje pri zatvaranju
  useLayoutEffect(() => {
    if (!webgl || !hostRef.current) return
    const ok = stage.claim(owner, hostRef.current, propsRef.current, priority)
    if (ok && !bare) introPlayed = true
    setMode(ok ? 'stage' : 'local')
    return () => stage.release(owner)
  }, [owner, webgl, bare, priority])

  // Novi parametri (prikaz, oznake, voznja...) idu u scenu samo kada se promene
  useEffect(() => {
    if (mode === 'stage') stage.update(owner, props)
  })

  const ready = mode === 'stage' ? st.ready : localReady
  useEffect(() => {
    if (ready) onLoaded?.()
  }, [ready, onLoaded])

  const photo = <VehicleRender view={PHOTO_VIEW[view]} className={className} />
  if (!webgl) return bare ? null : photo

  return (
    <div className={'overflow-hidden ' + (/(absolute|fixed)/.test(className) ? '' : 'relative ') + className}>
      {!bare && <div className="absolute inset-0" style={{ background: 'var(--stage-bg)' }} />}
      {!bare && mode !== null && !ready && (
        <div className="absolute inset-x-[30%] bottom-[18%] flex flex-col items-center gap-2" role="status">
          <span className="relative block h-[2px] w-full overflow-hidden bg-surface-3">
            <span className="absolute inset-y-0 left-0 w-1/3 animate-[loading-bar_1.2s_ease-in-out_infinite] bg-accent" />
          </span>
          <span className="text-caption text-text-3">{t.vehicle.loading3d}</span>
        </div>
      )}
      {/* Ovde se premesta platno stalne scene */}
      <div ref={hostRef} className="absolute inset-0" />
      {mode === 'local' && (
        <Fallback3D fallback={bare ? null : photo}>
          <Suspense fallback={null}>
            <Car3D
              {...props}
              className={'absolute inset-0 transition-opacity duration-500 ' + (localReady ? 'opacity-100' : 'opacity-0')}
              onReady={onLocalReady}
            />
          </Suspense>
        </Fallback3D>
      )}
    </div>
  )
}
