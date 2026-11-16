import { useMemo, useState } from 'react'
import { Icon } from '@/components/ui/Icon'
import type { IconName } from '@/components/ui/Icon'
import { BarButton, FunctionBar, OemButton, TitleActions, TitleButton } from '@/components/oem/controls'
import { ConfirmDialog, Dialog } from '@/components/oem/Dialog'
import { ListNote, RowAction, RowCheck, RowInfo, RowLink, RowSelect, ScrollList } from '@/components/oem/List'
import { useNavigation } from '@/app/navigation'
import { useScreenTitle, useShell } from '@/app/shell'
import { useLongPress } from '@/hooks/useLongPress'
import { usePhone } from '@/hooks/usePhone'
import { usePrefs } from '@/hooks/usePrefs'
import { useT } from '@/hooks/useT'
import { fill } from '@/i18n'
import { FAVORITE_SLOTS, phoneService } from '@/services/phone'
import type { CallDirection, Contact } from '@/services/phone'
import { prefsService } from '@/services/prefs'

/* ----------------------------- pomocno ----------------------------- */

let toneCtx: AudioContext | null = null
/** Kratko preslusavanje melodije zvona (6 fabrickih melodija = 6 obrazaca tonova). */
export function playRingtone(n: number) {
  try {
    toneCtx ??= new AudioContext()
    const base = [660, 740, 880, 520, 990, 600][(n - 1) % 6]
    const pattern = [0, 0.18, 0.36, 0.6]
    for (const [i, at] of pattern.entries()) {
      const osc = toneCtx.createOscillator()
      const gain = toneCtx.createGain()
      osc.type = n % 2 ? 'sine' : 'triangle'
      osc.frequency.value = base * (i % 2 ? 1.25 : 1)
      const t0 = toneCtx.currentTime + at
      gain.gain.setValueAtTime(0.0001, t0)
      gain.gain.exponentialRampToValueAtTime(0.12, t0 + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.16)
      osc.connect(gain).connect(toneCtx.destination)
      osc.start(t0)
      osc.stop(t0 + 0.17)
    }
  } catch {
    /* bez audio konteksta nema preslusavanja */
  }
}

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

/** Poziv: bez Bluetooth veze nije moguc — belezi se pokusaj i prikazuje obavestenje. */
function useCall() {
  const [open, setOpen] = useState(false)
  const { t } = useT()
  const call = (name: string, number: string, contactId?: string) => {
    if (!number.trim()) return
    phoneService.logDialAttempt(name, number, contactId)
    setOpen(true)
  }
  const dialog = (
    <Dialog
      open={open}
      title={t.phone.callNotPossible}
      onClose={() => setOpen(false)}
      actions={
        <OemButton className="flex-1" active onClick={() => setOpen(false)}>
          {t.common.ok}
        </OemButton>
      }
    >
      <div className="flex items-start gap-4 px-5 py-6">
        <Icon name="bluetooth" size={28} className="mt-0.5 shrink-0 text-text-3" />
        <p className="text-body leading-relaxed">{t.phone.callNotPossibleText}</p>
      </div>
    </Dialog>
  )
  return { call, dialog }
}

/** Izbor kontakta iz imenika (za favorite). */
function ContactPicker({
  open,
  onPick,
  onClose,
}: {
  open: boolean
  onPick: (c: Contact) => void
  onClose: () => void
}) {
  const { contacts } = usePhone()
  const { t } = useT()
  return (
    <Dialog open={open} title={t.phone.chooseContact} onClose={onClose}>
      {contacts.length === 0 && <ListNote>{t.phone.noContacts}</ListNote>}
      {contacts.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => {
            onPick(c)
            onClose()
          }}
          className="flex min-h-16 w-full items-center gap-4 border-b border-line-soft px-5 text-left last:border-0"
        >
          <span className="flex size-10 items-center justify-center rounded-full bg-surface-3 text-small font-semibold">
            {initials(c.name)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-body">{c.name}</span>
            <span className="block truncate text-small text-text-3">{c.number}</span>
          </span>
        </button>
      ))}
    </Dialog>
  )
}

/* ----------------------------- glavni meni ----------------------------- */

function FavoriteKey({
  slot,
  contact,
  onCall,
  onAssign,
}: {
  slot: number
  contact?: Contact
  onCall: (c: Contact) => void
  onAssign: (slot: number) => void
}) {
  const { t } = useT()
  const press = useLongPress({
    onClick: () => (contact ? onCall(contact) : onAssign(slot)),
    onHold: () => onAssign(slot),
  })
  return (
    <button
      type="button"
      {...press}
      aria-label={contact ? t.phone.call + ': ' + contact.name : t.phone.assign}
      className="oem-btn flex h-[168px] flex-1 flex-col items-center justify-center gap-3 px-3"
    >
      {contact ? (
        <>
          <span className="flex size-[68px] items-center justify-center rounded-full border border-line-strong bg-surface-3 text-[26px] font-light">
            {initials(contact.name)}
          </span>
          <span className="w-full truncate text-center text-body-lg font-medium">{contact.name}</span>
          <span className="-mt-2 w-full truncate text-center text-small text-text-3 tabular-nums">{contact.number}</span>
        </>
      ) : (
        <>
          <span className="flex size-[68px] items-center justify-center rounded-full border border-dashed border-line-strong text-text-3">
            <Icon name="plus" size={28} />
          </span>
          <span className="text-body text-text-3">{t.phone.assign}</span>
        </>
      )}
    </button>
  )
}

function PhoneMain() {
  const phone = usePhone()
  const { push } = useNavigation()
  const { t } = useT()
  const { notify } = useShell()
  const { call, dialog } = useCall()
  const [assignSlot, setAssignSlot] = useState<number | null>(null)

  return (
    <div className="flex h-full flex-col">
      {/* Status veze */}
      <div className="flex h-[88px] shrink-0 items-center gap-4 border-b border-line-soft px-6">
        <span className="flex size-12 items-center justify-center rounded-full border border-line text-text-3">
          <Icon name="bluetooth" size={24} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-body-lg">{phone.searching ? t.phone.searching : t.phone.noPhone}</p>
          <p className="text-small text-text-3">{t.phone.holdToChange}</p>
        </div>
        <OemButton
          disabled={phone.searching}
          onClick={() => {
            void phoneService.searchPhones().then(() => notify(t.phone.noDevicesFound))
          }}
        >
          <Icon name="search" size={20} />
          {t.phone.searchPhone}
        </OemButton>
      </div>

      {/* Favoriti */}
      <div className="flex min-h-0 flex-1 flex-col justify-center px-6">
        <p className="mb-3 text-small text-text-3">{t.phone.favorites}</p>
        <div className="flex gap-3">
          {Array.from({ length: FAVORITE_SLOTS }, (_, i) => {
            const contact = phone.contacts.find((c) => c.id === phone.favorites[i])
            return (
              <FavoriteKey
                key={i}
                slot={i}
                contact={contact}
                onCall={(c) => call(c.name, c.number, c.id)}
                onAssign={setAssignSlot}
              />
            )
          })}
        </div>
      </div>

      <FunctionBar>
        <BarButton icon="keypad" label={t.phone.keypad} onClick={() => push('keypad')} />
        <BarButton icon="contacts" label={t.phone.contacts} onClick={() => push('contacts')} />
        <BarButton icon="phone-list" label={t.phone.callLists} onClick={() => push('calls')} />
        <BarButton icon="message" label={t.phone.sms} onClick={() => push('sms')} />
      </FunctionBar>

      <ContactPicker
        open={assignSlot !== null}
        onPick={(c) => assignSlot !== null && phoneService.setFavorite(assignSlot, c.id)}
        onClose={() => setAssignSlot(null)}
      />
      {dialog}
    </div>
  )
}

/* ----------------------------- tastatura ----------------------------- */

const KEYS: { key: string; sub?: string }[] = [
  { key: '1', sub: 'oo' },
  { key: '2', sub: 'ABC' },
  { key: '3', sub: 'DEF' },
  { key: '4', sub: 'GHI' },
  { key: '5', sub: 'JKL' },
  { key: '6', sub: 'MNO' },
  { key: '7', sub: 'PQRS' },
  { key: '8', sub: 'TUV' },
  { key: '9', sub: 'WXYZ' },
  { key: '*' },
  { key: '0', sub: '+' },
  { key: '#' },
]

function DialKey({ k, sub, onType, onHold }: { k: string; sub?: string; onType: () => void; onHold?: () => void }) {
  const press = useLongPress({ onClick: onType, onHold })
  return (
    <button type="button" {...press} className="oem-btn flex h-[74px] flex-col items-center justify-center">
      <span className="text-[28px] leading-none">{k}</span>
      {sub && <span className="mt-1 text-micro text-text-3">{sub === 'oo' ? '⌕' : sub}</span>}
    </button>
  )
}

function Keypad() {
  const prefs = usePrefs()
  const { t } = useT()
  const { call, dialog } = useCall()
  const [number, setNumber] = useState('')
  useScreenTitle(t.phone.keypad)
  const type = (ch: string) => setNumber((n) => (n.length < 24 ? n + ch : n))
  const clear = useLongPress({ onClick: () => setNumber((n) => n.slice(0, -1)), onHold: () => setNumber('') })

  return (
    <div className="flex h-full items-center justify-center gap-10 px-8">
      <div className="grid w-[420px] grid-cols-3 gap-2.5">
        {KEYS.map(({ key, sub }) => (
          <DialKey
            key={key}
            k={key}
            sub={sub}
            onType={() => type(key)}
            onHold={
              key === '0'
                ? () => type('+')
                : key === '1'
                  ? () => call(t.phone.voicemail, prefs['phone.voicemail'] || '1')
                  : undefined
            }
          />
        ))}
      </div>
      <div className="flex w-[420px] flex-col gap-4">
        <div className="flex h-[74px] items-center gap-3 border-b-2 border-accent px-2">
          <span className="min-w-0 flex-1 truncate text-[34px] font-light tracking-[0.04em] tabular-nums">
            {number || ' '}
          </span>
          <button
            type="button"
            aria-label={t.phone.deleteDigit}
            disabled={!number}
            {...clear}
            className="flex size-14 items-center justify-center text-text-2 disabled:text-text-disabled"
          >
            <Icon name="backspace" size={30} />
          </button>
        </div>
        <OemButton
          size="lg"
          active
          disabled={!number}
          onClick={() => {
            call(t.phone.unknown, number)
            setNumber('')
          }}
          className="h-[74px]"
        >
          <Icon name="phone" size={26} />
          {t.phone.call}
        </OemButton>
        <OemButton
          onClick={() => call(t.phone.voicemail, prefs['phone.voicemail'] || '1')}
          className="h-[60px]"
        >
          <Icon name="message" size={22} />
          {t.phone.voicemail}
        </OemButton>
      </div>
      {dialog}
    </div>
  )
}

/* ----------------------------- kontakti ----------------------------- */

function sortKey(name: string, by: 'first' | 'last'): string {
  if (by === 'first') return name.toLowerCase()
  const parts = name.trim().split(/\s+/)
  return (parts.length > 1 ? parts[parts.length - 1] + ' ' + parts.slice(0, -1).join(' ') : name).toLowerCase()
}

/** Novi kontakt ili izmena: tastatura za ime, pa telefonska tastatura za broj. */
function useContactEditor() {
  const { openKeyboard } = useShell()
  const { t } = useT()
  return (existing?: Contact, onCreated?: (c: Contact) => void) => {
    openKeyboard({
      title: t.phone.name,
      value: existing?.name ?? '',
      maxLength: 32,
      onDone: (name) => {
        if (!name) return
        window.setTimeout(
          () =>
            openKeyboard({
              title: t.phone.number,
              value: existing?.number ?? '',
              mode: 'phone',
              onDone: (number) => {
                if (!number) return
                if (existing) phoneService.updateContact(existing.id, { name, number })
                else onCreated?.(phoneService.addContact(name, number))
              },
            }),
          60,
        )
      },
    })
  }
}

function Contacts() {
  const phone = usePhone()
  const prefs = usePrefs()
  const { push } = useNavigation()
  const { openKeyboard } = useShell()
  const { t } = useT()
  const edit = useContactEditor()
  const [query, setQuery] = useState('')
  useScreenTitle(t.phone.contacts)

  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    return phone.contacts
      .filter((c) => !q || c.name.toLowerCase().includes(q) || c.number.replace(/\s/g, '').includes(q))
      .sort((a, b) => sortKey(a.name, prefs['phone.sort']).localeCompare(sortKey(b.name, prefs['phone.sort'])))
  }, [phone.contacts, query, prefs])

  return (
    <div className="flex h-full flex-col">
      <TitleActions>
        <TitleButton onClick={() => edit(undefined, (c) => push(c.id))}>
          <Icon name="plus" size={18} /> {t.phone.newContact}
        </TitleButton>
      </TitleActions>
      <button
        type="button"
        onClick={() => openKeyboard({ title: t.phone.searchContacts, value: query, onDone: setQuery })}
        className="flex h-16 shrink-0 items-center gap-4 border-b border-line px-5 text-left"
      >
        <Icon name="search" size={22} className="text-text-3" />
        <span className={'flex-1 text-body ' + (query ? 'text-text-1' : 'text-text-3')}>
          {query || t.phone.searchContacts}
        </span>
        {query && (
          <span
            role="button"
            tabIndex={0}
            aria-label={t.common.close}
            onClick={(e) => {
              e.stopPropagation()
              setQuery('')
            }}
            className="flex size-10 items-center justify-center text-text-2"
          >
            <Icon name="close" size={20} />
          </span>
        )}
      </button>
      <ScrollList>
        {list.length === 0 && <ListNote>{t.phone.noContacts}</ListNote>}
        {list.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => push(c.id)}
            className="flex min-h-16 w-full items-center gap-4 border-b border-line-soft px-5 text-left"
          >
            <span className="flex size-11 items-center justify-center rounded-full bg-surface-3 text-small font-semibold">
              {initials(c.name)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-body">{c.name}</span>
              <span className="block truncate text-small text-text-3 tabular-nums">{c.number}</span>
            </span>
            {phone.favorites.includes(c.id) && <Icon name="star" size={18} className="text-accent-ink" />}
            <Icon name="chevron-right" size={20} className="text-text-3" />
          </button>
        ))}
      </ScrollList>
    </div>
  )
}

function ContactDetail({ id }: { id: string }) {
  const phone = usePhone()
  const { back } = useNavigation()
  const { t } = useT()
  const { call, dialog } = useCall()
  const edit = useContactEditor()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [slotOpen, setSlotOpen] = useState(false)
  const contact = phone.contacts.find((c) => c.id === id)
  useScreenTitle(contact?.name ?? t.phone.contacts)

  if (!contact) return <ListNote>{t.phone.noContacts}</ListNote>
  const favSlot = phone.favorites.indexOf(contact.id)

  return (
    <div className="flex h-full flex-col px-10 py-8">
      <div className="flex items-center gap-6">
        <span className="flex size-24 items-center justify-center rounded-full border border-line-strong bg-surface-3 text-[36px] font-light">
          {initials(contact.name)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-[34px] font-light">{contact.name}</p>
          <p className="mt-1 text-title text-text-2 tabular-nums">{contact.number}</p>
        </div>
      </div>
      <div className="mt-10 grid grid-cols-4 gap-3">
        <OemButton size="lg" active onClick={() => call(contact.name, contact.number, contact.id)} className="h-[72px]">
          <Icon name="phone" size={24} /> {t.phone.call}
        </OemButton>
        <OemButton size="lg" onClick={() => edit(contact)} className="h-[72px]">
          <Icon name="edit" size={22} /> {t.common.edit}
        </OemButton>
        <OemButton size="lg" active={favSlot >= 0} onClick={() => setSlotOpen(true)} className="h-[72px]">
          <Icon name="star" size={22} /> {t.phone.favorites}
        </OemButton>
        <OemButton size="lg" onClick={() => setConfirmDelete(true)} className="h-[72px]">
          <Icon name="trash" size={22} /> {t.common.delete}
        </OemButton>
      </div>
      <Dialog open={slotOpen} title={t.phone.chooseSlot} onClose={() => setSlotOpen(false)}>
        {Array.from({ length: FAVORITE_SLOTS }, (_, i) => {
          const occupant = phone.contacts.find((c) => c.id === phone.favorites[i])
          return (
            <button
              key={i}
              type="button"
              onClick={() => {
                phoneService.setFavorite(i, contact.id)
                setSlotOpen(false)
              }}
              className="flex min-h-16 w-full items-center gap-4 border-b border-line-soft px-5 text-left last:border-0"
            >
              <span className="w-8 text-title font-light text-text-3 tabular-nums">{i + 1}</span>
              <span className="flex-1 text-body">{occupant?.name ?? '—'}</span>
            </button>
          )
        })}
      </Dialog>
      <ConfirmDialog
        open={confirmDelete}
        title={t.common.delete}
        message={fill(t.phone.deleteContact, { name: contact.name })}
        confirmLabel={t.common.delete}
        onConfirm={() => {
          phoneService.removeContact(contact.id)
          back()
        }}
        onClose={() => setConfirmDelete(false)}
      />
      {dialog}
    </div>
  )
}

/* ----------------------------- liste poziva ----------------------------- */

const DIRECTION_ICON: Record<CallDirection, IconName> = {
  missed: 'call-end',
  dialed: 'phone',
  received: 'phone',
}

function CallLists() {
  const phone = usePhone()
  const { t, locale } = useT()
  const { call, dialog } = useCall()
  const [filter, setFilter] = useState<'all' | CallDirection>('all')
  useScreenTitle(t.phone.callLists)
  const list = phone.log.filter((e) => filter === 'all' || e.direction === filter)

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 gap-2 border-b border-line px-4 py-3">
        {(['all', 'missed', 'dialed', 'received'] as const).map((f) => (
          <OemButton key={f} size="sm" active={filter === f} onClick={() => setFilter(f)} className="flex-1">
            {t.phone[f]}
          </OemButton>
        ))}
      </div>
      <ScrollList>
        {list.length === 0 && <ListNote>{t.phone.noCalls}</ListNote>}
        {list.map((e) => (
          <button
            key={e.id}
            type="button"
            onClick={() => call(e.name, e.number, e.contactId)}
            className="flex min-h-16 w-full items-center gap-4 border-b border-line-soft px-5 text-left"
          >
            <Icon
              name={DIRECTION_ICON[e.direction]}
              size={20}
              className={e.direction === 'missed' ? 'text-danger' : 'text-text-3'}
              style={e.direction === 'received' ? { transform: 'scaleX(-1)' } : undefined}
            />
            <span className="min-w-0 flex-1">
              <span className={'block truncate text-body ' + (e.direction === 'missed' ? 'text-danger' : '')}>
                {e.name}
              </span>
              <span className="block truncate text-small text-text-3 tabular-nums">
                {t.phone[e.direction]} · {e.number}
              </span>
            </span>
            <span className="text-small text-text-3 tabular-nums">
              {new Date(e.at).toLocaleString(locale, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
            </span>
          </button>
        ))}
      </ScrollList>
      {dialog}
    </div>
  )
}

function Sms() {
  const { t } = useT()
  useScreenTitle(t.phone.sms)
  return (
    <ScrollList>
      <ListNote>{t.phone.smsUnavailable}</ListNote>
    </ScrollList>
  )
}

/* ----------------------------- podesavanja ----------------------------- */

/** Bluetooth podesavanja — isti meni otvara se i iz Podesavanja sistema i iz Medija. */
export function BluetoothSettings() {
  const prefs = usePrefs()
  const phone = usePhone()
  const { openKeyboard, notify } = useShell()
  const { t } = useT()
  const set = prefsService.set

  return (
    <ScrollList>
      <RowCheck label={t.phone.set.btOn} checked={prefs['phone.bt']} onChange={(v) => set('phone.bt', v)} />
      <RowSelect
        label={t.phone.set.visibility}
        value={prefs['phone.visible'] ? 'visible' : 'hidden'}
        options={[
          { value: 'visible', label: t.phone.set.visible },
          { value: 'hidden', label: t.phone.set.hidden },
        ]}
        onSelect={(v) => set('phone.visible', v === 'visible')}
        disabled={!prefs['phone.bt']}
      />
      <RowLink
        label={t.phone.set.deviceName}
        value={prefs['phone.name']}
        onClick={() =>
          openKeyboard({
            title: t.phone.set.deviceName,
            value: prefs['phone.name'],
            maxLength: 24,
            onDone: (v) => v && set('phone.name', v),
          })
        }
      />
      <RowInfo label={t.phone.set.paired} value={t.common.none} hint={t.phone.set.noPaired} />
      <RowAction
        label={phone.searching ? t.phone.searching : t.phone.set.searchDevices}
        icon="search"
        disabled={!prefs['phone.bt'] || phone.searching}
        onClick={() => void phoneService.searchPhones().then(() => notify(t.phone.noDevicesFound))}
      />
      <RowCheck
        label={t.phone.set.btAudio}
        checked={prefs['phone.btAudio']}
        onChange={(v) => set('phone.btAudio', v)}
        disabled={!prefs['phone.bt']}
      />
      <ListNote>{t.phone.btMissing}</ListNote>
    </ScrollList>
  )
}

function ProfileSettings() {
  const prefs = usePrefs()
  const { push } = useNavigation()
  const { openKeyboard } = useShell()
  const { t } = useT()
  useScreenTitle(t.phone.set.profile)
  const set = prefsService.set

  return (
    <ScrollList>
      <RowLink label={t.phone.set.manageFavorites} icon="star" onClick={() => push('favorites')} />
      <RowLink
        label={t.phone.set.voicemailNumber}
        value={prefs['phone.voicemail'] || '—'}
        onClick={() =>
          openKeyboard({
            title: t.phone.set.voicemailNumber,
            value: prefs['phone.voicemail'],
            mode: 'phone',
            onDone: (v) => set('phone.voicemail', v),
          })
        }
      />
      <RowSelect
        label={t.phone.set.sortBy}
        value={prefs['phone.sort']}
        options={[
          { value: 'last', label: t.phone.set.sortLast },
          { value: 'first', label: t.phone.set.sortFirst },
        ]}
        onSelect={(v) => set('phone.sort', v)}
      />
      <RowAction label={t.phone.set.importContacts} icon="refresh" disabled onClick={() => undefined} />
      <RowAction label={t.phone.set.deleteProfiles} icon="trash" disabled onClick={() => undefined} />
      <RowSelect
        label={t.phone.set.ringtone}
        value={prefs['phone.ringtone']}
        options={[1, 2, 3, 4, 5, 6].map((n) => ({ value: n, label: fill(t.phone.set.ringtoneN, { n }) }))}
        onSelect={(v) => {
          set('phone.ringtone', v)
          playRingtone(v)
        }}
      />
      <RowCheck label={t.phone.set.reminder} checked={prefs['phone.reminder']} onChange={(v) => set('phone.reminder', v)} />
      <RowCheck label={t.phone.set.pictures} checked={prefs['phone.pictures']} onChange={(v) => set('phone.pictures', v)} />
    </ScrollList>
  )
}

function ManageFavorites() {
  const phone = usePhone()
  const { t } = useT()
  const [pickSlot, setPickSlot] = useState<number | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)
  useScreenTitle(t.phone.set.manageFavorites)

  return (
    <>
      <ScrollList>
        {Array.from({ length: FAVORITE_SLOTS }, (_, i) => {
          const c = phone.contacts.find((x) => x.id === phone.favorites[i])
          return (
            <div key={i} className="flex min-h-16 items-center gap-4 border-b border-line-soft px-5">
              <span className="w-8 text-title font-light text-text-3 tabular-nums">{i + 1}</span>
              <span className={'min-w-0 flex-1 truncate text-body ' + (c ? '' : 'text-text-3')}>{c?.name ?? '—'}</span>
              <OemButton size="sm" onClick={() => setPickSlot(i)}>
                {c ? t.common.edit : t.phone.assign}
              </OemButton>
              {c && (
                <OemButton size="sm" aria-label={t.common.delete} onClick={() => phoneService.setFavorite(i, null)}>
                  <Icon name="trash" size={18} />
                </OemButton>
              )}
            </div>
          )
        })}
        <RowAction label={t.phone.set.clearFavorites} icon="trash" danger onClick={() => setConfirmClear(true)} />
      </ScrollList>
      <ContactPicker
        open={pickSlot !== null}
        onPick={(c) => pickSlot !== null && phoneService.setFavorite(pickSlot, c.id)}
        onClose={() => setPickSlot(null)}
      />
      <ConfirmDialog
        open={confirmClear}
        title={t.phone.set.clearFavorites}
        message={t.phone.set.clearFavoritesConfirm}
        confirmLabel={t.common.delete}
        onConfirm={() => phoneService.clearFavorites()}
        onClose={() => setConfirmClear(false)}
      />
    </>
  )
}

function BluetoothPage() {
  const { t } = useT()
  useScreenTitle(t.phone.set.bluetooth)
  return <BluetoothSettings />
}

function PhoneSettingsList() {
  const { push } = useNavigation()
  const phone = usePhone()
  const { notify } = useShell()
  const { t } = useT()
  useScreenTitle(t.phone.settingsTitle)

  return (
    <ScrollList>
      <RowCheck label={t.phone.set.handsfree} checked disabled onChange={() => undefined} />
      <RowLink label={t.phone.set.selectPhone} value={t.common.none} disabled onClick={() => undefined} />
      <RowAction
        label={phone.searching ? t.phone.searching : t.phone.set.searchPhone}
        icon="search"
        disabled={phone.searching}
        onClick={() => void phoneService.searchPhones().then(() => notify(t.phone.noDevicesFound))}
      />
      <RowLink label={t.phone.set.bluetooth} icon="bluetooth" onClick={() => push('bluetooth')} />
      <RowLink label={t.phone.set.profile} icon="user" onClick={() => push('profile')} />
    </ScrollList>
  )
}

function PhoneSettings() {
  const { path } = useNavigation()
  if (path[1] === 'bluetooth') return <BluetoothPage />
  if (path[1] === 'profile') return path[2] === 'favorites' ? <ManageFavorites /> : <ProfileSettings />
  return <PhoneSettingsList />
}

/** Telefonski interfejs (PHONE), po fabrickom MIB2. */
export function PhoneScreen() {
  const { path, push } = useNavigation()
  const { t } = useT()
  const sub = path[0]

  let body: React.JSX.Element
  if (sub === 'keypad') body = <Keypad />
  else if (sub === 'contacts') body = path[1] ? <ContactDetail id={path[1]} /> : <Contacts />
  else if (sub === 'calls') body = <CallLists />
  else if (sub === 'sms') body = <Sms />
  else if (sub === 'settings') body = <PhoneSettings />
  else body = <PhoneMain />

  return (
    <div className="flex h-full flex-col">
      {!sub && (
        <TitleActions>
          <TitleButton onClick={() => push('settings')} aria-label={t.common.settings}>
            <Icon name="settings" size={20} />
          </TitleButton>
        </TitleActions>
      )}
      {body}
    </div>
  )
}
