import { useState } from 'react'
import { Icon } from '@/components/ui/Icon'
import { OemButton, TitleActions, TitleButton } from '@/components/oem/controls'
import { ConfirmDialog } from '@/components/oem/Dialog'
import { ListNote, RowHeader, RowLink, RowSelect, ScrollList } from '@/components/oem/List'
import { useNavigation } from '@/app/navigation'
import { useScreenTitle, useShell } from '@/app/shell'
import { formatDateShort } from '@/hooks/useClock'
import { useMaintenance } from '@/hooks/useMaintenance'
import { usePrefs } from '@/hooks/usePrefs'
import { useT } from '@/hooks/useT'
import { useUnits } from '@/hooks/useUnits'
import { useVehicle } from '@/hooks/useVehicle'
import { fill } from '@/i18n'
import { SERVICE_KINDS, maintenanceService } from '@/services/maintenance'
import type { ServiceKind, ServiceRecord } from '@/services/maintenance'

/** DD.MM.GGGG ili GGGG-MM-DD → ISO datum; null ako nije ispravan. */
function parseDate(text: string): string | null {
  const s = text.trim()
  let y: number, m: number, d: number
  const dmy = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/.exec(s)
  const ymd = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s)
  if (dmy) [d, m, y] = [+dmy[1], +dmy[2], +dmy[3]]
  else if (ymd) [y, m, d] = [+ymd[1], +ymd[2], +ymd[3]]
  else return null
  const date = new Date(Date.UTC(y, m - 1, d))
  if (date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null
  return date.toISOString().slice(0, 10)
}

function NewRecord() {
  const v = useVehicle()
  const prefs = usePrefs()
  const { back } = useNavigation()
  const { openKeyboard } = useShell()
  const { t } = useT()
  useScreenTitle(t.service.newRecord)
  const [draft, setDraft] = useState({
    kind: 'ulje' as ServiceKind,
    date: new Date().toISOString().slice(0, 10),
    odometerKm: v.odometerKm,
    note: '',
  })
  const fmt = prefs['time.dateFormat']

  return (
    <div className="flex h-full flex-col">
      <ScrollList>
        <RowSelect
          label={t.service.kind}
          value={draft.kind}
          options={SERVICE_KINDS.map((k) => ({ value: k, label: t.service.kinds[k] }))}
          onSelect={(kind) => setDraft({ ...draft, kind })}
        />
        <RowLink
          label={t.service.date}
          value={formatDateShort(new Date(draft.date), fmt)}
          onClick={() =>
            openKeyboard({
              title: t.service.date + ' (DD.MM.GGGG)',
              value: formatDateShort(new Date(draft.date), 'dmy'),
              maxLength: 10,
              onDone: (text) => {
                const iso = parseDate(text)
                if (iso) setDraft((d) => ({ ...d, date: iso }))
              },
            })
          }
        />
        <RowLink
          label={t.service.odometer}
          value={draft.odometerKm.toLocaleString() + ' km'}
          onClick={() =>
            openKeyboard({
              title: t.service.odometer + ' (km)',
              value: String(draft.odometerKm),
              mode: 'number',
              maxLength: 7,
              onDone: (text) => {
                const n = Number(text)
                if (Number.isFinite(n) && n > 0) setDraft((d) => ({ ...d, odometerKm: Math.round(n) }))
              },
            })
          }
        />
        <RowLink
          label={t.service.note}
          value={draft.note || '—'}
          onClick={() =>
            openKeyboard({
              title: t.service.note,
              value: draft.note,
              maxLength: 60,
              onDone: (note) => setDraft((d) => ({ ...d, note })),
            })
          }
        />
      </ScrollList>
      <div className="flex shrink-0 gap-3 border-t border-line-soft p-4">
        <OemButton className="flex-1" onClick={back}>
          {t.common.cancel}
        </OemButton>
        <OemButton
          className="flex-1"
          active
          onClick={() => {
            maintenanceService.addRecord(draft)
            back()
          }}
        >
          {t.service.saveRecord}
        </OemButton>
      </div>
    </div>
  )
}

export function ServiceBook() {
  const m = useMaintenance()
  const prefs = usePrefs()
  const { path, push } = useNavigation()
  const { t } = useT()
  const units = useUnits()
  const [toDelete, setToDelete] = useState<ServiceRecord | null>(null)
  useScreenTitle(path[2] === 'new' ? null : t.vehicle.serviceBook)

  if (path[2] === 'new') return <NewRecord />

  return (
    <div className="flex h-full flex-col">
      <TitleActions>
        <TitleButton onClick={() => push('new')}>
          <Icon name="plus" size={18} /> {t.service.newRecord}
        </TitleButton>
      </TitleActions>
      <ScrollList>
        {m.records.length === 0 && <ListNote>{t.service.noRecords}</ListNote>}
        {m.records.map((r) => {
          const d = units.distance(r.odometerKm)
          return (
            <div key={r.id} className="flex min-h-[72px] items-center gap-4 border-b border-line-soft px-5">
              <Icon name="wrench" size={22} className="text-text-3" />
              <div className="min-w-0 flex-1">
                <p className="text-body">{t.service.kinds[r.kind]}</p>
                {r.note && <p className="truncate text-small text-text-3">{r.note}</p>}
              </div>
              <div className="text-right text-small text-text-2 tabular-nums">
                <p>{formatDateShort(new Date(r.date), prefs['time.dateFormat'])}</p>
                <p>
                  {d.value} {d.unit}
                </p>
              </div>
              <OemButton size="sm" aria-label={t.common.delete} onClick={() => setToDelete(r)} className="!w-12 !px-0">
                <Icon name="trash" size={18} />
              </OemButton>
            </div>
          )
        })}
        <RowHeader>{t.service.interval}</RowHeader>
        <div className="flex flex-wrap gap-2 px-5 py-3">
          {[10000, 15000, 30000].map((km) => (
            <OemButton
              key={km}
              size="sm"
              active={m.intervalKm === km}
              onClick={() => maintenanceService.setInterval(km, m.intervalMonths)}
            >
              {units.distance(km).value} {units.distance(km).unit}
            </OemButton>
          ))}
          {[12, 24].map((months) => (
            <OemButton
              key={months}
              size="sm"
              active={m.intervalMonths === months}
              onClick={() => maintenanceService.setInterval(m.intervalKm, months)}
            >
              {months} {t.service.months}
            </OemButton>
          ))}
        </div>
        <ListNote>{t.service.realDataNote}</ListNote>
      </ScrollList>
      <ConfirmDialog
        open={toDelete !== null}
        title={t.common.delete}
        message={fill(t.service.deleteConfirm, { name: toDelete ? t.service.kinds[toDelete.kind] : '' })}
        confirmLabel={t.common.delete}
        onConfirm={() => toDelete && maintenanceService.removeRecord(toDelete.id)}
        onClose={() => setToDelete(null)}
      />
    </div>
  )
}
