/**
 * Slike (fabricki meni "Slike" na MIB2): fotografije sa USB/SD medija,
 * pojedinacno ili kao prezentacija.
 *
 * U browseru se slike biraju dijalogom (fajlovi ili ceo folder) i drze se u
 * memoriji dok aplikacija radi — ne kopiraju se na uredjaj.
 */
export interface Picture {
  id: string
  name: string
  url: string
  folder: string
}

export interface PicturesState {
  pictures: Picture[]
}

const IMAGE_EXT = /\.(jpe?g|png|gif|bmp|webp)$/i

export function filterImageFiles(files: File[]): File[] {
  return files.filter((f) => f.type.startsWith('image/') || IMAGE_EXT.test(f.name))
}

export interface PicturesService {
  getState(): PicturesState
  subscribe(listener: (s: PicturesState) => void): () => void
  addFiles(files: File[]): number
  clear(): void
}

export function createPicturesService(): PicturesService {
  let state: PicturesState = { pictures: [] }
  const listeners = new Set<(s: PicturesState) => void>()

  function commit(next: PicturesState) {
    state = next
    for (const l of listeners) l(state)
  }

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener)
      listener(state)
      return () => listeners.delete(listener)
    },
    addFiles(files) {
      const images = filterImageFiles(files)
      const added: Picture[] = images.map((file, i) => {
        const rel = (file as File & { webkitRelativePath?: string }).webkitRelativePath ?? ''
        const slash = rel.lastIndexOf('/')
        return {
          id: `p-${Date.now()}-${i}`,
          name: file.name,
          url: URL.createObjectURL(file),
          folder: slash > 0 ? rel.slice(0, slash) : '',
        }
      })
      added.sort((a, b) => (a.folder + a.name).localeCompare(b.folder + b.name))
      commit({ pictures: [...state.pictures, ...added] })
      return added.length
    },
    clear() {
      for (const p of state.pictures) URL.revokeObjectURL(p.url)
      commit({ pictures: [] })
    },
  }
}

export const picturesService: PicturesService = createPicturesService()
