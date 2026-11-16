/**
 * Citanje ID3v2 tagova (naziv, izvodjac, album, broj numere i omot).
 *
 * Napisano bez spoljne biblioteke: uredjaj kasnije radi offline, pa ne zelim
 * dodatnu zavisnost zbog nekoliko polja. Podrzani su ID3v2.3 i v2.4, sto
 * pokriva gotovo sve MP3 fajlove. Ako tag ne postoji ili je neispravan,
 * funkcija vraca prazan rezultat i reprodukcija i dalje radi.
 */

export interface TrackMetadata {
  title?: string
  artist?: string
  album?: string
  trackNo?: number
  /** Object URL omota albuma, ako je ugradjen u fajl. */
  coverUrl?: string
}

/** Synchsafe broj (7 bita po bajtu) koji ID3 koristi za velicinu. */
function readSynchsafe(view: DataView, offset: number): number {
  return (
    ((view.getUint8(offset) & 0x7f) << 21) |
    ((view.getUint8(offset + 1) & 0x7f) << 14) |
    ((view.getUint8(offset + 2) & 0x7f) << 7) |
    (view.getUint8(offset + 3) & 0x7f)
  )
}

function decode(bytes: Uint8Array, encoding: number): string {
  try {
    switch (encoding) {
      case 0:
        return new TextDecoder('windows-1252').decode(bytes)
      case 1:
        return new TextDecoder('utf-16').decode(bytes)
      case 2:
        return new TextDecoder('utf-16be').decode(bytes)
      default:
        return new TextDecoder('utf-8').decode(bytes)
    }
  } catch {
    return new TextDecoder('utf-8').decode(bytes)
  }
}

/** Uklanja zavrsne nule koje neki enkoderi ostavljaju u tekstualnim poljima. */
function clean(text: string): string {
  return text.replace(/\0+$/g, '').trim()
}

export async function readId3(file: File): Promise<TrackMetadata> {
  const empty: TrackMetadata = {}
  try {
    const head = new DataView(await file.slice(0, 10).arrayBuffer())
    if (head.byteLength < 10) return empty
    const magic = String.fromCharCode(head.getUint8(0), head.getUint8(1), head.getUint8(2))
    if (magic !== 'ID3') return empty

    const major = head.getUint8(3)
    const tagSize = readSynchsafe(head, 6)
    const buffer = await file.slice(10, 10 + tagSize).arrayBuffer()
    const view = new DataView(buffer)
    const bytes = new Uint8Array(buffer)

    const meta: TrackMetadata = {}
    let offset = 0

    while (offset + 10 <= view.byteLength) {
      const id = String.fromCharCode(
        view.getUint8(offset),
        view.getUint8(offset + 1),
        view.getUint8(offset + 2),
        view.getUint8(offset + 3),
      )
      if (!/^[A-Z0-9]{4}$/.test(id)) break // kraj tagova ili padding

      const size =
        major >= 4 ? readSynchsafe(view, offset + 4) : view.getUint32(offset + 4, false)
      const body = offset + 10
      if (size <= 0 || body + size > view.byteLength) break

      if (id === 'APIC') {
        const encoding = bytes[body]
        let p = body + 1
        while (p < body + size && bytes[p] !== 0) p++ // MIME tip
        const mime = decode(bytes.subarray(body + 1, p), 0) || 'image/jpeg'
        p++ // nula posle MIME
        p++ // tip slike (omot, logo...)
        // Opis se zavrsava jednom nulom, odnosno duplom kod UTF-16
        if (encoding === 1 || encoding === 2) {
          while (p + 1 < body + size && !(bytes[p] === 0 && bytes[p + 1] === 0)) p += 2
          p += 2
        } else {
          while (p < body + size && bytes[p] !== 0) p++
          p++
        }
        if (p < body + size) {
          const blob = new Blob([bytes.subarray(p, body + size)], { type: mime })
          meta.coverUrl = URL.createObjectURL(blob)
        }
      } else if (id[0] === 'T') {
        const encoding = bytes[body]
        const text = clean(decode(bytes.subarray(body + 1, body + size), encoding))
        if (text) {
          if (id === 'TIT2') meta.title = text
          else if (id === 'TPE1') meta.artist = text
          else if (id === 'TALB') meta.album = text
          else if (id === 'TRCK') {
            const n = parseInt(text.split('/')[0], 10)
            if (Number.isFinite(n)) meta.trackNo = n
          }
        }
      }

      offset = body + size
    }

    return meta
  } catch {
    return empty
  }
}
