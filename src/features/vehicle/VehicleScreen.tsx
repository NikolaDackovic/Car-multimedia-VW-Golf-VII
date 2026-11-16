import { Icon } from '@/components/ui/Icon'
import type { IconName } from '@/components/ui/Icon'
import { useNavigation } from '@/app/navigation'
import { useScreenTitle } from '@/app/shell'
import { useT } from '@/hooks/useT'
import { CarSetup } from './CarSetup'
import { ServiceBook } from './ServiceBook'
import { Consumers, DrivingData, Service, Tyres, VehicleStatus, useStatusMessages } from './VehiclePages'

type Tab = 'data' | 'status' | 'consumers' | 'tyres' | 'service' | 'setup'

const TABS: { id: Tab; icon: IconName; key: 'drivingData' | 'status' | 'consumers' | 'tyres' | 'service' | 'setup' }[] = [
  { id: 'data', icon: 'route', key: 'drivingData' },
  { id: 'status', icon: 'car', key: 'status' },
  { id: 'consumers', icon: 'fan', key: 'consumers' },
  { id: 'tyres', icon: 'gauge', key: 'tyres' },
  { id: 'service', icon: 'wrench', key: 'service' },
  { id: 'setup', icon: 'settings', key: 'setup' },
]

/** Naslov za stranice sa levim menijem (podmeniji podesavanja postavljaju svoj). */
function TabTitle({ title }: { title: string }) {
  useScreenTitle(title)
  return null
}

/**
 * Vozilo (fabricki taster CAR): podaci o voznji, status vozila, potrosaci
 * komfora, kontrola pritiska u gumama, servis i podesavanja vozila.
 */
export function VehicleScreen() {
  const { path, replace } = useNavigation()
  const { t } = useT()
  const status = useStatusMessages()
  const tab = (path[0] as Tab) || 'data'

  // Duboki podmeniji (podesavanja, servisna knjiga) zauzimaju ceo ekran
  if (tab === 'setup' && path.length > 1) return <div className="flex h-full flex-col"><CarSetup /></div>
  if (tab === 'service' && path[1] === 'book') return <div className="flex h-full flex-col"><ServiceBook /></div>

  const current = TABS.find((x) => x.id === tab) ?? TABS[0]

  return (
    <div className="flex h-full">
      <TabTitle title={t.nav.vehicle + ' · ' + t.vehicle[current.key]} />
      <nav className="flex w-[268px] shrink-0 flex-col border-r border-line-soft py-2">
        {TABS.map((item) => {
          const active = tab === item.id
          const badge = item.id === 'status' && status.onCar.length > 0 ? status.onCar.length : null
          return (
            <button
              key={item.id}
              type="button"
              aria-current={active ? 'page' : undefined}
              onClick={() => replace(item.id === 'data' ? [] : [item.id])}
              className="relative flex h-[96px] items-center gap-4 px-5 text-left"
            >
              {active && <span className="absolute inset-y-2 inset-x-2 oem-frame" aria-hidden="true" />}
              <Icon name={item.icon} size={26} className={'relative ' + (active ? 'text-accent-ink' : 'text-text-2')} />
              <span className={'relative flex-1 text-body-lg leading-tight ' + (active ? 'text-text-1' : 'text-text-2')}>
                {t.vehicle[item.key]}
              </span>
              {badge && (
                <span className="relative flex h-7 min-w-7 items-center justify-center rounded-full bg-warn px-2 text-small font-bold text-black">
                  {badge}
                </span>
              )}
            </button>
          )
        })}
      </nav>
      <div className="flex min-w-0 flex-1 flex-col">
        {tab === 'data' && <DrivingData />}
        {tab === 'status' && <VehicleStatus />}
        {tab === 'consumers' && <Consumers />}
        {tab === 'tyres' && <Tyres />}
        {tab === 'service' && <Service />}
        {tab === 'setup' && <CarSetup />}
      </div>
    </div>
  )
}
