import { Icon } from '@/components/ui/Icon'
import { MenuIcon } from '@/components/oem/MenuIcon'
import { OemButton } from '@/components/oem/controls'
import { useNavigation } from '@/app/navigation'
import { useScreenTitle } from '@/app/shell'
import { usePrefs } from '@/hooks/usePrefs'
import { useT } from '@/hooks/useT'
import { AssistList, ParkList } from '@/features/vehicle/CarSetup'

function ParkPage() {
  const { t } = useT()
  useScreenTitle(t.assist.parking)
  return <ParkList />
}

/**
 * Sistemi za pomoc vozacu (fabricka plocica "Assistance systems" na Golfu 7.5).
 * Levo je pregled stanja, desno fabricki meni podesavanja.
 */
export function AssistScreen() {
  const p = usePrefs()
  const { path, push } = useNavigation()
  const { t } = useT()

  if (path[0] === 'park') {
    return (
      <div className="flex h-full flex-col">
        <ParkPage />
      </div>
    )
  }

  const systems: [string, boolean][] = [
    [t.assist.front, p['assist.front.active']],
    [t.assist.lane, p['assist.lane.active']],
    [t.assist.sign, p['assist.sign.mfd']],
    [t.assist.driverAlert, p['assist.driverAlert']],
    [t.assist.proactive, p['assist.proactive']],
  ]

  return (
    <div className="flex h-full">
      <aside className="flex w-[360px] shrink-0 flex-col border-r border-line-soft px-6 py-6">
        <div className="flex justify-center">
          <MenuIcon name="assist" size={150} />
        </div>
        <ul className="mt-6 space-y-3">
          {systems.map(([label, on]) => (
            <li key={label} className="flex items-center gap-3 text-body">
              <span
                className="size-3 shrink-0 rounded-full"
                style={{ background: on ? 'var(--ok)' : 'var(--line-strong)' }}
              />
              <span className="flex-1">{label}</span>
              <span className="text-small text-text-3">{on ? t.common.on : t.common.off}</span>
            </li>
          ))}
        </ul>
        <OemButton className="mt-auto" onClick={() => push('park')}>
          <Icon name="car" size={20} /> {t.assist.parking}
        </OemButton>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <AssistList />
      </div>
    </div>
  )
}
