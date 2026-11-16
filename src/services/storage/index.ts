/**
 * Storage adapter. Sada localStorage, kasnije SQLite preko Tauri SQL plugina —
 * interfejs ostaje isti, pa se ekrani ne prepravljaju.
 */
export interface StorageAdapter {
  read<T>(key: string, fallback: T): T
  write<T>(key: string, value: T): void
  remove(key: string): void
}

const NS = 'car-os:'

export const localStorageAdapter: StorageAdapter = {
  read<T>(key: string, fallback: T): T {
    try {
      const raw = window.localStorage.getItem(NS + key)
      if (raw === null) return fallback
      return JSON.parse(raw) as T
    } catch {
      return fallback
    }
  },
  write<T>(key: string, value: T): void {
    try {
      window.localStorage.setItem(NS + key, JSON.stringify(value))
    } catch {
      /* privatni režim ili pun storage — podešavanja se tada ne pamte */
    }
  },
  remove(key: string): void {
    try {
      window.localStorage.removeItem(NS + key)
    } catch {
      /* ignorisano namerno */
    }
  },
}

export const storage: StorageAdapter = localStorageAdapter
