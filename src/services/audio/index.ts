export type { AudioService, AudioState, PlayMode, RepeatMode, Track } from './types'
export { createBrowserAudioService } from './browserAudioService'
export { demoLibrary, tracksFromFiles, filterAudioFiles } from './demoLibrary'
export { readId3 } from './metadata'
export type { TrackMetadata } from './metadata'

import { createBrowserAudioService } from './browserAudioService'
import { demoLibrary } from './demoLibrary'
import type { AudioService } from './types'

/**
 * Jedna instanca za celu aplikaciju. Kada dodamo Linux audio servis,
 * menja se samo ovaj izbor.
 */
export const audioService: AudioService = createBrowserAudioService(demoLibrary)
