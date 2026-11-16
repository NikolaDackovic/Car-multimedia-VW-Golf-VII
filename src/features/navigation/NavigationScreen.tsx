import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Icon } from '@/components/ui/Icon'
import type { IconName } from '@/components/ui/Icon'
import { MiniMap } from './MiniMap'
import { useT } from '@/hooks/useT'
import { useShell } from '@/app/shell'

interface Place {
  id: string
  label: string
  detail: string
  eta: string
  km: string
  icon: IconName
}

const PLACES: Omit<Place, 'label' | 'detail'>[] = [
  { id: 'home', eta: '17 min', km: '12,4 km', icon: 'home' },
  { id: 'work', eta: '24 min', km: '18,1 km', icon: 'car' },
  { id: 'fuel', eta: '4 min', km: '2,3 km', icon: 'fuel' },
  { id: 'parking', eta: '12 min', km: '7,8 km', icon: 'map' },
]

const ZOOM_DEFAULT = 1
const ZOOM_MIN = 1
const ZOOM_MAX = 2.5
const ZOOM_STEP = 0.25

/** Okruglo dugme preko mape — 64 px, dovoljno za dodir u voznji. */
function MapButton({
  label,
  icon,
  onClick,
  disabled = false,
}: {
  label: string
  icon: IconName
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      whileTap={disabled ? undefined : { scale: 0.92 }}
      transition={{ duration: 0.1 }}
      className={[
        'overlay-panel flex size-16 items-center justify-center rounded-[var(--radius-panel)] text-text-1 transition-opacity',
        disabled ? 'opacity-40' : '',
      ].join(' ')}
    >
      <Icon name={icon} size={24} strokeWidth={1.8} />
    </motion.button>
  )
}

/**
 * Navigacija preko celog ekrana: mapa je pozadina, a sve ostalo su lebdece
 * kontrole — pretraga gore levo, zum desno, podaci o ruti dole.
 *
 * Mapa je shematska demo podloga, pozicija i vremena su simulirani.
 */
export function NavigationScreen() {
  const [zoom, setZoom] = useState(ZOOM_DEFAULT)
  const [active, setActive] = useState('home')
  const { t } = useT()
  const { openKeyboard } = useShell()
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')

  const places: Place[] = useMemo(
    () =>
      PLACES.map((p) => ({
        ...p,
        label: t.navigation.places[p.id as keyof typeof t.navigation.places] as string,
        detail: p.id === 'fuel' ? t.navigation.places.lastUsed : t.navigation.places.savedAddress,
      })),
    [t],
  )
  const destination = places.find((p) => p.id === active) ?? places[0]

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return places
    return places.filter(
      (p) => p.label.toLowerCase().includes(q) || p.detail.toLowerCase().includes(q),
    )
  }, [query, places])

  function closeSearch() {
    setSearchOpen(false)
    setQuery('')
  }

  return (
    <div className="relative h-full overflow-hidden">
      <MiniMap className="absolute inset-0" zoom={zoom} />

      {/* Dodir na mapu zatvara otvorenu pretragu */}
      {searchOpen && (
        <button
          type="button"
          aria-label={t.navigation.closeSearch}
          onClick={closeSearch}
          className="absolute inset-0 cursor-default"
        />
      )}

      {/* Pretraga */}
      <div className="absolute top-4 left-4 w-[440px]">
        <motion.button
          type="button"
          onClick={() => (searchOpen ? closeSearch() : setSearchOpen(true))}
          aria-expanded={searchOpen}
          whileTap={{ scale: 0.99 }}
          transition={{ duration: 0.1 }}
          className="overlay-panel flex h-14 w-full items-center gap-3 rounded-[var(--radius-panel)] px-5 text-left"
        >
          <Icon name="search" size={21} className="text-text-2" />
          <span className="flex-1 text-body text-text-2">
            {searchOpen ? t.navigation.closeSearch : t.navigation.searchPlaces}
          </span>
          <Icon
            name={searchOpen ? 'chevron-left' : 'chevron-right'}
            size={18}
            className="text-text-3"
          />
        </motion.button>

        <AnimatePresence>
          {searchOpen && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.16 }}
              className="overlay-panel mt-2 overflow-hidden rounded-[var(--radius-panel)]"
            >
              <button
                type="button"
                onClick={() => openKeyboard({ title: t.navigation.placeName, value: query, onDone: setQuery })}
                className="flex h-14 w-full items-center gap-3 border-b border-line px-5 text-left"
              >
                <Icon name="keypad" size={18} className="text-text-3" />
                <span className={'flex-1 text-body ' + (query ? '' : 'text-text-3')}>{query || t.navigation.placeName}</span>
              </button>

              <div className="touch-scroll max-h-[300px]">
                {results.length === 0 ? (
                  <p className="px-5 py-4 text-small text-text-3">
                    {t.navigation.noPlaceResults}
                  </p>
                ) : (
                  results.map((place) => {
                    const isActive = place.id === active
                    return (
                      <button
                        key={place.id}
                        type="button"
                        onClick={() => {
                          setActive(place.id)
                          closeSearch()
                        }}
                        className={[
                          'relative flex min-h-16 w-full items-center gap-3.5 border-b border-hairline px-5 py-3 text-left last:border-0',
                          isActive ? 'bg-accent-soft' : '',
                        ].join(' ')}
                      >
                        {isActive && <span className="absolute inset-y-0 left-0 w-[3px] bg-accent" />}
                        <span
                          className={[
                            'flex size-10 shrink-0 items-center justify-center rounded-full border',
                            isActive ? 'border-accent-line text-accent-ink' : 'border-control-border text-text-2',
                          ].join(' ')}
                        >
                          <Icon name={place.icon} size={18} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span
                            className={
                              'block text-body font-medium ' + (isActive ? 'text-accent-ink' : '')
                            }
                          >
                            {place.label}
                          </span>
                          <span className="block truncate text-caption text-text-3">
                            {place.detail}
                          </span>
                        </span>
                        <span className="text-right tabular-nums">
                          <span className="block text-small text-text-1">{place.eta}</span>
                          <span className="block text-caption text-text-3">{place.km}</span>
                        </span>
                      </button>
                    )
                  })
                )}
              </div>

              <p className="border-t border-hairline px-5 py-3 text-caption leading-relaxed text-text-3">
                {t.navigation.searchNote}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Oznaka demo mape */}
      <span className="overlay-panel absolute top-4 right-4 flex h-8 items-center rounded-full px-3.5 text-micro font-semibold tracking-[0.12em] text-text-2 uppercase">
        {t.navigation.demoBadge}
      </span>

      {/* Zum i centriranje */}
      <div className="absolute top-1/2 right-4 flex -translate-y-1/2 flex-col gap-2.5">
        <MapButton
          label={t.navigation.zoomIn}
          icon="plus"
          disabled={zoom >= ZOOM_MAX}
          onClick={() => setZoom((z) => Math.min(ZOOM_MAX, +(z + ZOOM_STEP).toFixed(2)))}
        />
        <MapButton
          label={t.navigation.zoomOut}
          icon="minus"
          disabled={zoom <= ZOOM_MIN}
          onClick={() => setZoom((z) => Math.max(ZOOM_MIN, +(z - ZOOM_STEP).toFixed(2)))}
        />
        <MapButton label={t.navigation.center} icon="navigate" onClick={() => setZoom(ZOOM_DEFAULT)} />
      </div>

      {/* Sledece skretanje */}
      <div className="overlay-panel absolute bottom-4 left-4 flex items-center gap-4 rounded-[var(--radius-panel)] py-3.5 pr-6 pl-3.5">
        <div className="flex size-14 items-center justify-center rounded-[var(--radius-tile)] bg-accent text-on-accent">
          <Icon name="chevron-right" size={30} strokeWidth={2.4} />
        </div>
        <div>
          <p className="text-[28px] leading-none font-semibold tabular-nums">400 m</p>
          <p className="mt-1.5 text-small text-text-2">{t.navigation.turnRight}</p>
        </div>
      </div>

      {/* Podaci o ruti */}
      <div className="overlay-panel absolute right-4 bottom-4 flex items-center rounded-[var(--radius-panel)] py-3.5 tabular-nums">
        {[
          [t.navigation.destination, destination.label],
          [t.navigation.remaining, destination.km],
          [t.navigation.time, destination.eta],
        ].map(([label, value], i) => (
          <div key={label} className={'px-5 ' + (i > 0 ? 'border-l border-hairline' : '')}>
            <p className="text-caption text-text-3">{label}</p>
            <p className="mt-0.5 text-body-lg font-semibold">{value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
