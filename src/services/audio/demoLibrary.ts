import { readId3 } from './metadata'
import type { Track } from './types'

/**
 * Demo biblioteka za razvoj — nema audio fajlove, pa servis simulira reprodukciju.
 * Prave pesme se dodaju u Media ekranu ("Dodaj fajlove" ili "Dodaj folder").
 */
export const demoLibrary: Track[] = [
  { id: 'd1', title: 'Night Drive', artist: 'Kavinsky', album: 'OutRun', durationSec: 274, hue: 262, folder: 'Demo' },
  { id: 'd2', title: 'Midnight City', artist: 'M83', album: 'Hurry Up, We’re Dreaming', durationSec: 243, hue: 212, folder: 'Demo' },
  { id: 'd3', title: 'Autobahn', artist: 'Kraftwerk', album: 'Autobahn', durationSec: 322, hue: 28, folder: 'Demo' },
  { id: 'd4', title: 'Teardrop', artist: 'Massive Attack', album: 'Mezzanine', durationSec: 330, hue: 174, folder: 'Demo' },
  { id: 'd5', title: 'Dirt Off Your Shoulder', artist: 'Jay-Z', album: 'The Black Album', durationSec: 263, hue: 8, folder: 'Demo' },
  { id: 'd6', title: 'Svetlost', artist: 'Idoli', album: 'Odbrana i poslednji dani', durationSec: 198, hue: 318, folder: 'Demo' },
  { id: 'd7', title: 'Strobe', artist: 'deadmau5', album: 'For Lack of a Better Name', durationSec: 376, hue: 192, folder: 'Demo' },
  { id: 'd8', title: 'Zvezda', artist: 'Ekatarina Velika', album: 'Ljubav', durationSec: 254, hue: 46, folder: 'Demo' },
]

const AUDIO_EXT = /\.(mp3|m4a|aac|flac|ogg|oga|opus|wav|wma)$/i

/** Zadrzava samo audio fajlove — folder obicno sadrzi i slike, tekstove i slicno. */
export function filterAudioFiles(files: File[]): File[] {
  return files.filter((f) => f.type.startsWith('audio/') || AUDIO_EXT.test(f.name))
}

/** Folder fajla na izvoru (bez imena fajla); prazan string za koren. */
function folderOf(file: File): string {
  const rel = (file as File & { webkitRelativePath?: string }).webkitRelativePath ?? ''
  const i = rel.lastIndexOf('/')
  return i > 0 ? rel.slice(0, i) : ''
}

/** Rezervni naziv iz imena fajla, kada tagova nema. */
function fromFileName(name: string): { title: string; artist: string } {
  const base = name.replace(/\.[^.]+$/, '').replace(/^\d+[\s.\-_]+/, '')
  const parts = base.split(' - ')
  if (parts.length >= 2) {
    return { title: parts.slice(1).join(' - ').trim(), artist: parts[0].trim() }
  }
  return { title: base.trim(), artist: 'Nepoznat izvodjac' }
}

/**
 * Pravi Track objekte od izabranih fajlova i cita im ID3 tagove.
 * Tagovi se citaju paralelno; ako ih nema, koristi se ime fajla.
 */
export async function tracksFromFiles(files: File[]): Promise<Track[]> {
  const audio = filterAudioFiles(files)

  const tracks = await Promise.all(
    audio.map(async (file, i): Promise<Track> => {
      const meta = await readId3(file)
      const fallback = fromFileName(file.name)
      return {
        id: `local-${Date.now()}-${i}`,
        title: meta.title || fallback.title,
        artist: meta.artist || fallback.artist,
        album: meta.album || 'Lokalni fajlovi',
        durationSec: 0, // popunjava se kada stignu metapodaci fajla
        src: URL.createObjectURL(file),
        coverUrl: meta.coverUrl,
        trackNo: meta.trackNo,
        hue: (i * 47) % 360,
        folder: folderOf(file),
      }
    }),
  )

  // Fajlovi iz foldera dolaze nesortirano — redjaju se po albumu i broju numere.
  return tracks.sort((a, b) => {
    if (a.album !== b.album) return a.album.localeCompare(b.album, 'sr')
    if (a.trackNo && b.trackNo) return a.trackNo - b.trackNo
    return a.title.localeCompare(b.title, 'sr')
  })
}
