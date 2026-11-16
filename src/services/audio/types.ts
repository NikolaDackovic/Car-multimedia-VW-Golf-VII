export interface Track {
  id: string
  title: string
  artist: string
  album: string
  durationSec: number
  /** Nedostaje za demo pesme — tada se reprodukcija simulira. */
  src?: string
  /** Omot albuma iz ID3 taga, ako postoji. */
  coverUrl?: string
  /** Broj numere na albumu, za sortiranje foldera. */
  trackNo?: number
  /** Boja za generisani album art kada nema omota (0-360). */
  hue: number
  /** Putanja foldera na izvoru (npr. "Muzika/Rock"), za listu naslova po folderima. */
  folder?: string
}

/** Fabricki taster rezima: iskljuceno → ponovi naslov → ponovi sve → nasumicno. */
export type PlayMode = 'off' | 'one' | 'all' | 'shuffle'

export type RepeatMode = 'off' | 'all' | 'one'

export interface AudioState {
  queue: Track[]
  index: number
  playing: boolean
  positionSec: number
  durationSec: number
  volume: number
  muted: boolean
  shuffle: boolean
  repeat: RepeatMode
  /** true kada pesma nema pravi fajl i napredak se samo simulira. */
  simulated: boolean
  /** Fajl se ucitava (traju metapodaci ili baferovanje). */
  loading: boolean
  /** Lista je odsvirana do kraja i nema sledece pesme. */
  ended: boolean
  /** Poslednja greska pri reprodukciji, npr. nepodrzan format. */
  error: string | null
}

export interface AudioService {
  getState(): AudioState
  subscribe(listener: (state: AudioState) => void): () => void
  setQueue(tracks: Track[], startIndex?: number): void
  addTracks(tracks: Track[]): void
  playIndex(index: number): void
  play(): void
  pause(): void
  toggle(): void
  next(): void
  previous(): void
  seek(sec: number): void
  setVolume(value: number): void
  setMuted(value: boolean): void
  /** Privremeno utisavanje (npr. ParkPilot): 1 = normalno, 0.3 = utisano. */
  setDuck(factor: number): void
  toggleShuffle(): void
  cycleRepeat(): void
  /** Jedan taster za ponavljanje/nasumicno, kao na fabrickom uredjaju. */
  cycleMode(): void
  /** Premotavanje (dugi pritisak na |<< / >>|), u sekundama. */
  seekBy(deltaSec: number): void
  dispose(): void
}
