import { Icon } from '@/components/ui/Icon'
import type { IconName } from '@/components/ui/Icon'
import { OemButton, SimTag } from '@/components/oem/controls'
import { useT } from '@/hooks/useT'
import { useUnits } from '@/hooks/useUnits'
import { useVehicle } from '@/hooks/useVehicle'
import { CLIMATE_MAX, CLIMATE_MIN, vehicleService } from '@/services/vehicle'
import type { AirFlow, Climate } from '@/services/vehicle'

const set = (patch: Partial<Climate>) => vehicleService.setClimate(patch)

function TempColumn({ side, label }: { side: 'driverC' | 'passengerC'; label: string }) {
  const v = useVehicle()
  const { t } = useT()
  const units = useUnits()
  const value = v.climate[side]
  const temp = value <= CLIMATE_MIN ? 'LO' : value >= CLIMATE_MAX ? 'HI' : units.temp(value, 1).value
  const seatKey = side === 'driverC' ? 'seatHeatLeft' : 'seatHeatRight'
  const seat = v.climate[seatKey]

  return (
    <div className="flex w-[220px] flex-col items-center gap-3">
      <span className="text-body text-text-2">{label}</span>
      <OemButton
        size="lg"
        aria-label={t.climate.raise}
        onClick={() => set({ [side]: value + 0.5 })}
        onHold={() => set({ [side]: vehicleService.getState().climate[side] + 0.5 })}
        repeatMs={200}
        className="!w-28"
      >
        <Icon name="chevron-up" size={30} />
      </OemButton>
      <p className="text-[64px] leading-none font-light tabular-nums">
        {temp}
        {temp !== 'LO' && temp !== 'HI' && <span className="text-title text-text-3">{units.temp(0).unit}</span>}
      </p>
      <OemButton
        size="lg"
        aria-label={t.climate.lower}
        onClick={() => set({ [side]: value - 0.5 })}
        onHold={() => set({ [side]: vehicleService.getState().climate[side] - 0.5 })}
        repeatMs={200}
        className="!w-28"
      >
        <Icon name="chevron-down" size={30} />
      </OemButton>
      <OemButton
        size="sm"
        active={seat > 0}
        aria-label={t.climate.seatHeat}
        onClick={() => set({ [seatKey]: (seat + 1) % 4 })}
        className="mt-2 !w-28"
      >
        <Icon name="seat" size={20} />
        <span className="flex gap-1">
          {[1, 2, 3].map((n) => (
            <span key={n} className="h-3 w-1.5" style={{ background: n <= seat ? 'var(--warn)' : 'var(--surface-3)' }} />
          ))}
        </span>
      </OemButton>
    </div>
  )
}

/**
 * Klima (Climatronic) — simulacija. Golf VII ima fizicki panel klime;
 * ovaj ekran pokazuje stanje i ne salje komande vozilu.
 */
export function ClimateScreen() {
  const v = useVehicle()
  const { t } = useT()
  const c = v.climate

  const toggles: { key: keyof Climate; label: string; icon?: IconName }[] = [
    { key: 'auto', label: t.climate.auto },
    { key: 'ac', label: t.climate.ac, icon: 'snowflake' },
    { key: 'acMax', label: t.climate.acMax, icon: 'snowflake' },
    { key: 'sync', label: t.climate.sync },
    { key: 'recirc', label: t.climate.recirc, icon: 'recirc' },
    { key: 'defrost', label: t.climate.defrost, icon: 'defrost' },
    { key: 'rearHeat', label: t.climate.rearHeat, icon: 'rear-defrost' },
  ]
  const flows: AirFlow[] = ['windscreen', 'body', 'bodyFeet', 'feet', 'windscreenFeet']

  return (
    <div className="flex h-full flex-col">
      <div className="flex min-h-0 flex-1 items-center justify-between px-8">
        <TempColumn side="driverC" label={t.climate.driver} />

        <div className="flex flex-1 flex-col items-center gap-5 px-6">
          <div className="flex items-center gap-2">
            <SimTag />
          </div>
          <div className="flex w-full items-center gap-3">
            <OemButton size="lg" aria-label={t.climate.fan + ' −'} onClick={() => set({ fanLevel: c.fanLevel - 1 })} className="!w-16 !px-0">
              <Icon name="minus" size={24} />
            </OemButton>
            <div className="flex flex-1 items-end gap-1.5" aria-label={t.climate.fan} role="img">
              {Array.from({ length: 7 }, (_, i) => (
                <span
                  key={i}
                  className="flex-1"
                  style={{
                    height: 12 + i * 6,
                    background: i < c.fanLevel ? 'var(--accent)' : 'var(--surface-3)',
                    boxShadow: i < c.fanLevel ? 'var(--accent-glow)' : undefined,
                  }}
                />
              ))}
            </div>
            <OemButton size="lg" aria-label={t.climate.fan + ' +'} onClick={() => set({ fanLevel: c.fanLevel + 1 })} className="!w-16 !px-0">
              <Icon name="plus" size={24} />
            </OemButton>
          </div>
          <p className="-mt-2 flex items-center gap-2 text-body text-text-2">
            <Icon name="fan" size={20} /> {c.fanLevel === 0 ? t.common.off : c.fanLevel}
            {c.auto && <span className="ml-2 text-accent-ink">{t.climate.auto}</span>}
          </p>

          <div className="w-full">
            <p className="mb-2 text-small text-text-3">
              {t.climate.airFlow}: {t.climate.flows[c.airFlow]}
            </p>
            <div className="flex gap-2">
              {flows.map((f) => (
                <OemButton key={f} size="sm" active={c.airFlow === f} onClick={() => set({ airFlow: f })} className="!h-14 min-w-0 flex-1 !shrink !px-1.5 text-center !text-caption leading-tight !whitespace-normal">
                  {t.climate.flows[f]}
                </OemButton>
              ))}
            </div>
          </div>
        </div>

        <TempColumn side="passengerC" label={t.climate.passenger} />
      </div>

      <div className="flex shrink-0 gap-2 border-t border-line-soft px-4 py-3">
        {toggles.map(({ key, label, icon }) => (
          <OemButton
            key={key}
            active={Boolean(c[key])}
            pressed={Boolean(c[key])}
            onClick={() => set({ [key]: !c[key] })}
            className="h-[60px] flex-1 flex-col !gap-1 !px-1"
          >
            {icon && <Icon name={icon} size={20} />}
            <span className="text-caption leading-none">{label}</span>
          </OemButton>
        ))}
      </div>
      <p className="px-5 pb-2 text-caption text-text-3">{t.climate.note}</p>
    </div>
  )
}
