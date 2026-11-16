import { useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { MenuIcon } from '@/components/oem/MenuIcon'
import type { MenuIconName } from '@/components/oem/MenuIcon'
import { PageDots } from '@/components/oem/controls'
import { useNavigation } from '@/app/navigation'
import type { ScreenId } from '@/app/navigation'
import { useT } from '@/hooks/useT'
import { parkingService } from '@/services/parking'
import { vehicleProfile } from '@/services/vehicle/profile'

/** Plocica koja ne otvara ekran nego funkciju (ParkPilot, kao taster P). */
type MenuId = ScreenId | 'parking'

/** Raspored kao na fabrickom MENU-u Golfa 7.5: dva reda po cetiri, druga strana prevlacenjem. */
const PAGES: { id: MenuId; icon: MenuIconName }[][] = [
  [
    { id: 'radio', icon: 'radio' },
    { id: 'phone', icon: 'phone' },
    { id: 'appconnect', icon: 'appconnect' },
    { id: 'vehicle', icon: 'vehicle' },
    { id: 'media', icon: 'media' },
    { id: 'assist', icon: 'assist' },
    { id: 'sound', icon: 'sound' },
    { id: 'settings', icon: 'settings' },
  ],
  [
    { id: 'navigation', icon: 'navigation' },
    { id: 'pictures', icon: 'pictures' },
    { id: 'climate', icon: 'climate' },
    { id: 'parking', icon: 'parking' },
    { id: 'instruments', icon: 'instruments' },
  ],
]

/** Samo u razvoju: `&page=1` otvara drugu stranu menija (za snimke ekrana). */
const DEV_PAGE = import.meta.env.DEV ? Math.min(PAGES.length - 1, Number(new URLSearchParams(window.location.search).get('page') ?? 0) || 0) : 0

function Tile({ id, icon, onOpen }: { id: MenuId; icon: MenuIconName; onOpen: () => void }) {
  const { t } = useT()
  return (
    <motion.button
      type="button"
      onClick={onOpen}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.08 }}
      className="group flex w-full flex-col items-center gap-[0.9em]"
    >
      <span className="card relative block aspect-[236/150] w-full overflow-hidden transition-[border-color,box-shadow] duration-150 group-active:border-accent group-active:shadow-[var(--accent-glow)]">
        {/* Blagi akcentni odsjaj iza ikonice */}
        <span
          aria-hidden="true"
          className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 60% 70% at 50% 55%, color-mix(in srgb, var(--accent) 14%, transparent), transparent 70%)' }}
        />
        {/* Visina ikonice je udeo plocice — plocica uvek zadrzava odnos 236:150 */}
        <span className="absolute inset-y-[17%] left-1/2 aspect-square -translate-x-1/2">
          <MenuIcon name={icon} size="100%" />
        </span>
      </span>
      <span className="leading-none font-medium tracking-[0.005em] whitespace-nowrap text-text-1">{id === 'parking' ? t.park.title : t.nav[id]}</span>
    </motion.button>
  )
}

/**
 * Glavni meni. Pločice se skaliraju sa prostorom (container jedinice), pa
 * raspored ostaje isti na svakoj velicini ekrana: dva reda po cetiri.
 */
export function MenuScreen() {
  const { go } = useNavigation()
  const { t } = useT()
  const [page, setPage] = useState(DEV_PAGE)
  const dragStart = useRef<number | null>(null)

  return (
    <div
      className="flex h-full touch-pan-y flex-col items-center justify-center"
      style={{
        containerType: 'size',
        // Blag teget preliv u boji auta, samo da pozadina nije ravno crna
        background: `radial-gradient(ellipse 85% 70% at 50% 110%, color-mix(in srgb, ${vehicleProfile.colorHex} 55%, transparent) 0%, transparent 65%), radial-gradient(ellipse 70% 50% at 50% -10%, color-mix(in srgb, ${vehicleProfile.colorHex} 30%, transparent) 0%, transparent 60%), #000`,
      }}
      onPointerDown={(e) => (dragStart.current = e.clientX)}
      onPointerUp={(e) => {
        if (dragStart.current === null) return
        const dx = e.clientX - dragStart.current
        dragStart.current = null
        if (dx < -70 && page < PAGES.length - 1) setPage(page + 1)
        if (dx > 70 && page > 0) setPage(page - 1)
      }}
    >
      {/* Sirina mreze: ogranicena i sirinom i visinom ekrana */}
      <div
        className="relative"
        style={{
          width: 'min(90cqw, calc((90cqh - 120px) * 3.2))',
          fontSize: 'clamp(15px, 1.75cqw, 24px)',
        }}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.nav
            key={page}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="grid grid-cols-4 gap-x-[3.6%]"
            style={{ rowGap: '1.6em' }}
          >
            {PAGES[page].map((item) => (
              <Tile key={item.id} id={item.id} icon={item.icon} onOpen={() => (item.id === 'parking' ? parkingService.open() : go(item.id))} />
            ))}
            {/* Prazna mesta drze istu visinu mreze i na drugoj strani */}
            {Array.from({ length: 8 - PAGES[page].length }, (_, i) => (
              <span key={'e' + i} aria-hidden="true" className="invisible flex flex-col gap-[0.9em]">
                <span className="aspect-[236/150] w-full" />
                <span className="leading-none">&nbsp;</span>
              </span>
            ))}
          </motion.nav>
        </AnimatePresence>
      </div>
      <div className="mt-[3cqh]">
        <PageDots count={PAGES.length} index={page} onSelect={setPage} label={t.menu.page} />
      </div>
    </div>
  )
}
