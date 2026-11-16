import type { PlatformAdapter } from './types'

/**
 * Razvojna implementacija: sve što zahteva hardver vraća false,
 * pa UI zna da prikaže softversku zamenu (npr. zatamnjenje preko CSS-a).
 */
export const browserPlatform: PlatformAdapter = {
  id: 'browser',
  name: 'Browser (razvoj)',
  capabilities: {
    filesystemAudio: false,
    hardwareBrightness: false,
    powerControl: false,
    vehicleData: false,
  },
  async setBrightness() {
    return false
  },
  async blankScreen() {
    return false
  },
}
