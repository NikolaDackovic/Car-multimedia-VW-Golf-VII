/**
 * Platform adapter — jedini sloj koji zna na čemu Car OS radi.
 * UI nikada ne pita "da li sam u browseru?", već traži mogućnost od adaptera.
 */
export type PlatformId = 'browser' | 'tauri' | 'linux'

export interface PlatformCapabilities {
  /** Može li da čita audio fajlove sa diska bez korisnikovog file dijaloga */
  filesystemAudio: boolean
  /** Može li da menja osvetljenost panela (hardverski) */
  hardwareBrightness: boolean
  /** Može li da gasi/uspava uređaj */
  powerControl: boolean
  /** Ima li pristup podacima vozila (OBD/CAN) */
  vehicleData: boolean
}

export interface PlatformAdapter {
  readonly id: PlatformId
  readonly name: string
  readonly capabilities: PlatformCapabilities
  /** Hardverska osvetljenost; vraća false ako platforma to ne podržava. */
  setBrightness(value: number): Promise<boolean>
  /** Ulaz u režim mirovanja ekrana. */
  blankScreen(): Promise<boolean>
}
