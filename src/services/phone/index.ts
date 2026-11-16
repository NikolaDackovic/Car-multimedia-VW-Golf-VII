import { storage } from '@/services/storage'

/**
 * Telefonski interfejs (PHONE), po fabrickom MIB2.
 *
 * Telefon NIJE povezan: nema Bluetooth veze (HFP/PBAP/MAP), pristupa imeniku
 * telefona ni mogucnosti da se uspostavi poziv. Imenik, favoriti i liste
 * poziva su lokalni i cuvaju se na uredjaju, da bi ekran mogao da se koristi.
 * Kada se doda Bluetooth stek, menja se samo implementacija ovog servisa.
 */
export interface Contact {
  id: string
  name: string
  number: string
  /** Zadrzano zbog starih zapisa; favoriti su sada mesta u `favorites`. */
  favorite?: boolean
}

export type CallDirection = 'missed' | 'dialed' | 'received'

export interface CallLogEntry {
  id: string
  contactId?: string
  name: string
  number: string
  direction: CallDirection
  at: number
}

export interface PhoneState {
  contacts: Contact[]
  log: CallLogEntry[]
  /** Favoriti (tasteri za brzo biranje) — id kontakta po mestu ili null. */
  favorites: (string | null)[]
  /** Status Bluetooth veze sa telefonom. Trenutno uvek false. */
  connected: boolean
  /** Pretraga telefona u toku. */
  searching: boolean
}

export const FAVORITE_SLOTS = 4

const SEED: Contact[] = [
  { id: 'c1', name: 'Kuca', number: '+381 11 123 456' },
  { id: 'c2', name: 'Servis', number: '+381 11 987 654' },
  { id: 'c3', name: 'Pomoc na putu', number: '1987' },
]

const HOUR = 3_600_000
const SEED_LOG: CallLogEntry[] = [
  { id: 'l1', contactId: 'c1', name: 'Kuca', number: '+381 11 123 456', direction: 'received', at: Date.now() - 2 * HOUR },
  { id: 'l2', name: '+381 64 555 0101', number: '+381 64 555 0101', direction: 'missed', at: Date.now() - 5 * HOUR },
  { id: 'l3', contactId: 'c2', name: 'Servis', number: '+381 11 987 654', direction: 'dialed', at: Date.now() - 26 * HOUR },
]

function uid(): string {
  return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

export interface PhoneService {
  getState(): PhoneState
  subscribe(listener: (s: PhoneState) => void): () => void
  addContact(name: string, number: string): Contact
  updateContact(id: string, patch: Partial<Omit<Contact, 'id'>>): void
  removeContact(id: string): void
  setFavorite(slot: number, contactId: string | null): void
  clearFavorites(): void
  /** Belezi pokusaj poziva u listu biranih; poziv se NE uspostavlja. */
  logDialAttempt(name: string, number: string, contactId?: string): void
  clearLog(): void
  /** Pretraga Bluetooth telefona — bez Bluetooth steka uvek se zavrsi bez rezultata. */
  searchPhones(): Promise<string[]>
}

export function createLocalPhoneService(): PhoneService {
  const contacts = storage.read<Contact[]>('contacts', SEED)
  // Prelaz sa starog oblika (favorite: true na kontaktu) na mesta za favorite
  const legacy = contacts.filter((c) => c.favorite).map((c) => c.id)
  const storedFavs = storage.read<(string | null)[] | null>('favorites', null)
  const initialFavs = legacy.length > 0 ? legacy : ['c1', 'c2', 'c3']
  const favorites =
    storedFavs ?? Array.from({ length: FAVORITE_SLOTS }, (_, i) => initialFavs[i] ?? null)

  let state: PhoneState = {
    contacts,
    log: storage.read<CallLogEntry[]>('callLog.v2', SEED_LOG),
    favorites,
    connected: false,
    searching: false,
  }

  const listeners = new Set<(s: PhoneState) => void>()

  function commit(next: PhoneState) {
    state = next
    storage.write('contacts', state.contacts)
    storage.write('callLog.v2', state.log)
    storage.write('favorites', state.favorites)
    for (const l of listeners) l(state)
  }

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener)
      listener(state)
      return () => listeners.delete(listener)
    },
    addContact(name, number) {
      const contact: Contact = { id: uid(), name: name.trim(), number: number.trim() }
      commit({ ...state, contacts: [...state.contacts, contact] })
      return contact
    },
    updateContact(id, patch) {
      commit({
        ...state,
        contacts: state.contacts.map((c) => (c.id === id ? { ...c, ...patch } : c)),
      })
    },
    removeContact(id) {
      commit({
        ...state,
        contacts: state.contacts.filter((c) => c.id !== id),
        favorites: state.favorites.map((f) => (f === id ? null : f)),
      })
    },
    setFavorite(slot, contactId) {
      const favorites = [...state.favorites]
      favorites[slot] = contactId
      commit({ ...state, favorites })
    },
    clearFavorites() {
      commit({ ...state, favorites: Array.from({ length: FAVORITE_SLOTS }, () => null) })
    },
    logDialAttempt(name, number, contactId) {
      const entry: CallLogEntry = {
        id: uid(),
        contactId,
        name,
        number,
        direction: 'dialed',
        at: Date.now(),
      }
      commit({ ...state, log: [entry, ...state.log].slice(0, 50) })
    },
    clearLog() {
      commit({ ...state, log: [] })
    },
    searchPhones() {
      commit({ ...state, searching: true })
      return new Promise((resolve) => {
        window.setTimeout(() => {
          commit({ ...state, searching: false })
          resolve([])
        }, 4000)
      })
    },
  }
}

export const phoneService: PhoneService = createLocalPhoneService()
