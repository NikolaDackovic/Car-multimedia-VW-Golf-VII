import type { AudioService, AudioState, PlayMode, RepeatMode, Track } from './types'

const TICK_MS = 250

/**
 * Browser implementacija audio servisa.
 *
 * Pesme sa `src` idu kroz HTMLAudioElement. Demo pesme bez fajla se simuliraju
 * tajmerom, da se ceo interfejs (progress, next, repeat) može testirati bez muzike.
 */
export function createBrowserAudioService(initialQueue: Track[] = []): AudioService {
  const el = new Audio()
  el.preload = 'metadata'

  let state: AudioState = {
    queue: initialQueue,
    index: 0,
    playing: false,
    positionSec: 0,
    durationSec: initialQueue[0]?.durationSec ?? 0,
    volume: 0.6,
    muted: false,
    shuffle: false,
    repeat: 'off',
    simulated: initialQueue.length > 0 && !initialQueue[0].src,
    loading: false,
    ended: false,
    error: null,
  }
  el.volume = state.volume
  /** Utisavanje dok rade parking senzori (glasnoca u stanju ostaje ista). */
  let duck = 1

  const listeners = new Set<(s: AudioState) => void>()
  let timer: number | null = null

  function emit() {
    for (const listener of listeners) listener(state)
  }

  function set(patch: Partial<AudioState>) {
    state = { ...state, ...patch }
    emit()
  }

  function currentTrack(): Track | undefined {
    return state.queue[state.index]
  }

  function stopTimer() {
    if (timer !== null) {
      window.clearInterval(timer)
      timer = null
    }
  }

  function startTimer() {
    stopTimer()
    timer = window.setInterval(() => {
      if (!state.playing) return
      if (state.simulated) {
        const next = state.positionSec + TICK_MS / 1000
        if (next >= state.durationSec) {
          handleEnded()
        } else {
          set({ positionSec: next })
        }
      } else {
        set({ positionSec: el.currentTime, durationSec: el.duration || state.durationSec })
      }
    }, TICK_MS)
  }

  function loadCurrent(autoplay: boolean) {
    const track = currentTrack()
    stopTimer()
    if (!track) {
      el.removeAttribute('src')
      set({ playing: false, positionSec: 0, durationSec: 0, simulated: false, loading: false })
      return
    }

    const simulated = !track.src
    if (simulated) {
      el.pause()
      el.removeAttribute('src')
    } else {
      el.src = track.src as string
      el.currentTime = 0
    }

    set({
      simulated,
      positionSec: 0,
      durationSec: track.durationSec,
      playing: autoplay,
      loading: !simulated,
      ended: false,
      error: null,
    })

    if (autoplay) {
      if (!simulated) void el.play().catch(() => set({ playing: false }))
      startTimer()
    }
  }

  function pickNextIndex(): number | null {
    if (state.queue.length === 0) return null
    if (state.repeat === 'one') return state.index
    if (state.shuffle) {
      if (state.queue.length === 1) return 0
      let candidate = state.index
      while (candidate === state.index) {
        candidate = Math.floor(Math.random() * state.queue.length)
      }
      return candidate
    }
    const next = state.index + 1
    if (next < state.queue.length) return next
    return state.repeat === 'all' ? 0 : null
  }

  function handleEnded() {
    const next = pickNextIndex()
    if (next === null) {
      stopTimer()
      set({ playing: false, positionSec: state.durationSec, ended: true })
      return
    }
    state = { ...state, index: next }
    loadCurrent(true)
  }

  el.addEventListener('ended', handleEnded)
  el.addEventListener('loadedmetadata', () => {
    if (!state.simulated && Number.isFinite(el.duration)) {
      // Trajanje lokalnog fajla je poznato tek sada — upisuje se i u listu.
      const queue = state.queue.map((t, i) =>
        i === state.index ? { ...t, durationSec: el.duration } : t,
      )
      set({ durationSec: el.duration, loading: false, queue })
    } else {
      set({ loading: false })
    }
  })
  el.addEventListener('waiting', () => set({ loading: true }))
  el.addEventListener('playing', () => set({ loading: false }))
  // Tekst greske prevodi ekran (t.media.playbackError); servis samo javlja da je doslo do nje.
  el.addEventListener('error', () => {
    // Prazan src posle removeAttribute takodje okida 'error' — to nije greska reprodukcije
    if (!el.getAttribute('src')) return
    stopTimer()
    set({ loading: false, playing: false, error: 'playback' })
  })

  const service: AudioService = {
    getState: () => state,

    subscribe(listener) {
      listeners.add(listener)
      listener(state)
      return () => listeners.delete(listener)
    },

    setQueue(tracks, startIndex = 0) {
      state = { ...state, queue: tracks, index: Math.min(startIndex, Math.max(tracks.length - 1, 0)) }
      loadCurrent(false)
    },

    addTracks(tracks) {
      if (tracks.length === 0) return
      const wasEmpty = state.queue.length === 0
      state = { ...state, queue: [...state.queue, ...tracks] }
      if (wasEmpty) {
        loadCurrent(false)
      } else {
        emit()
      }
    },

    playIndex(index) {
      if (index < 0 || index >= state.queue.length) return
      state = { ...state, index }
      loadCurrent(true)
    },

    play() {
      if (!currentTrack()) return
      // Posle kraja liste ponovni Play krece od pocetka pesme.
      if (state.ended) service.seek(0)
      set({ playing: true, ended: false })
      if (!state.simulated) void el.play().catch(() => set({ playing: false }))
      startTimer()
    },

    pause() {
      if (!state.simulated) el.pause()
      stopTimer()
      set({ playing: false })
    },

    toggle() {
      if (state.playing) service.pause()
      else service.play()
    },

    next() {
      if (state.queue.length === 0) return
      // Rucni "sledeca" uvek menja pesmu — i u shuffle rezimu nikada ne ponovi istu
      let index = (state.index + 1) % state.queue.length
      if (state.shuffle && state.queue.length > 1) {
        do index = Math.floor(Math.random() * state.queue.length)
        while (index === state.index)
      }
      state = { ...state, index }
      loadCurrent(true)
    },

    previous() {
      if (state.queue.length === 0) return
      // Prvi pritisak vraća na početak pesme, drugi na prethodnu — kao u fabričkim jedinicama.
      if (state.positionSec > 3) {
        service.seek(0)
        return
      }
      const index = (state.index - 1 + state.queue.length) % state.queue.length
      state = { ...state, index }
      loadCurrent(true)
    },

    seek(sec) {
      const clamped = Math.max(0, Math.min(sec, state.durationSec || 0))
      if (!state.simulated) el.currentTime = clamped
      set({ positionSec: clamped })
    },

    setVolume(value) {
      const clamped = Math.max(0, Math.min(1, value))
      // Pomeranje glasnoce iznad nule ukida utisavanje — i u stanju i na samom
      // elementu, inace bi UI pokazivao da zvuk radi dok element ostaje nem.
      const muted = clamped === 0 ? state.muted : false
      el.volume = clamped * duck
      el.muted = muted
      set({ volume: clamped, muted })
    },

    setMuted(value) {
      el.muted = value
      set({ muted: value })
    },

    setDuck(factor) {
      duck = Math.max(0, Math.min(1, factor))
      el.volume = state.volume * duck
    },

    toggleShuffle() {
      set({ shuffle: !state.shuffle })
    },

    cycleRepeat() {
      const order: RepeatMode[] = ['off', 'all', 'one']
      const next = order[(order.indexOf(state.repeat) + 1) % order.length]
      set({ repeat: next })
    },

    cycleMode() {
      const mode: PlayMode = state.shuffle ? 'shuffle' : state.repeat
      const order: PlayMode[] = ['off', 'one', 'all', 'shuffle']
      const next = order[(order.indexOf(mode) + 1) % order.length]
      set({
        shuffle: next === 'shuffle',
        repeat: next === 'one' || next === 'all' ? next : 'off',
      })
    },

    seekBy(deltaSec) {
      service.seek(state.positionSec + deltaSec)
    },

    dispose() {
      stopTimer()
      el.pause()
      el.removeAttribute('src')
      listeners.clear()
    },
  }

  return service
}
