import { prefsService } from '@/services/prefs'
import type { Prefs } from '@/services/prefs'

/**
 * Veza sa vozilom.
 *
 * Car OS ne prica direktno sa CAN magistralom — to radi mali program na
 * Linux racunaru u autu (`bridge/car_bridge.py`). On cita CAN, ulaz za
 * rikverc, taster P..., i salje podatke preko WebSocket-a kao JSON poruke:
 *
 *   { "type": "hello",   "name": "car-bridge", "version": 1 }
 *   { "type": "vehicle", "data": { "speedKmh": 12, "doors": { "driver": true } } }
 *   { "type": "park",    "data": { "reverse": true, "front": [null, 80, 95, null], "rear": [40, 25, 30, 60] } }
 *   { "type": "key",     "key": "park" }
 *
 * Car OS salje nazad komande i podesavanja vozila:
 *
 *   { "type": "command", "name": "tpmsSet" }
 *   { "type": "setting", "key": "light.comingHome", "value": 30 }
 *
 * Dok veza ne postoji, servisi rade u simulaciji (oznaka SIMULIRANO).
 * Kompletan opis protokola je u bridge/README.md.
 */
export type BridgeStatus = 'disabled' | 'connecting' | 'connected' | 'offline'

export interface BridgeState {
  status: BridgeStatus
  url: string
  /** Ime i verzija programa sa druge strane (iz poruke "hello"). */
  peer: { name: string; version: number } | null
  lastMessageAt: number | null
}

export type BridgeMessage =
  | { type: 'hello'; name?: string; version?: number }
  | { type: 'vehicle'; data: Record<string, unknown> }
  | { type: 'park'; data: Record<string, unknown> }
  | { type: 'key'; key: string }
  | { type: string; [k: string]: unknown }

type Handler = (msg: BridgeMessage) => void

export interface BridgeService {
  getState(): BridgeState
  subscribe(listener: (s: BridgeState) => void): () => void
  /** Prijava na poruke odredjenog tipa ("vehicle", "park", "key"). */
  on(type: string, handler: Handler): () => void
  /** Salje poruku vozilu; vraca false ako veza ne postoji. */
  send(msg: Record<string, unknown>): boolean
  start(): void
}

/** Podesavanja koja pripadaju vozilu i salju se bridge-u kada se promene. */
const VEHICLE_PREFIXES = ['esc.', 'tyres.', 'assist.', 'park.', 'light.', 'mirrors.', 'wipers.', 'open.', 'seat.', 'mfd.']

function vehicleSettings(p: Prefs): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(p)) if (VEHICLE_PREFIXES.some((x) => k.startsWith(x))) out[k] = v
  return out
}

const RETRY_MIN_MS = 1000
const RETRY_MAX_MS = 15000

function createBridgeService(): BridgeService {
  let state: BridgeState = { status: 'disabled', url: '', peer: null, lastMessageAt: null }
  const listeners = new Set<(s: BridgeState) => void>()
  const handlers = new Map<string, Set<Handler>>()
  let ws: WebSocket | null = null
  let retryMs = RETRY_MIN_MS
  let retryTimer: number | null = null
  let started = false

  function set(patch: Partial<BridgeState>) {
    state = { ...state, ...patch }
    for (const l of listeners) l(state)
  }

  function dispatch(msg: BridgeMessage) {
    for (const h of handlers.get(msg.type) ?? []) h(msg)
    for (const h of handlers.get('*') ?? []) h(msg)
  }

  function close() {
    if (retryTimer !== null) window.clearTimeout(retryTimer)
    retryTimer = null
    if (ws) {
      ws.onclose = null
      ws.close()
      ws = null
    }
  }

  function connect() {
    const prefs = prefsService.getState()
    close()
    if (!prefs['hw.bridge']) {
      set({ status: 'disabled', url: prefs['hw.bridgeUrl'], peer: null })
      return
    }
    const url = prefs['hw.bridgeUrl']
    set({ status: 'connecting', url })
    let socket: WebSocket
    try {
      socket = new WebSocket(url)
    } catch {
      schedule()
      return
    }
    ws = socket
    socket.onopen = () => {
      retryMs = RETRY_MIN_MS
      set({ status: 'connected' })
      socket.send(JSON.stringify({ type: 'hello', name: 'car-os', version: 1 }))
      // Bridge odmah dobija sva podesavanja vozila (npr. posle paljenja auta)
      socket.send(JSON.stringify({ type: 'settings', data: vehicleSettings(prefsService.getState()) }))
    }
    socket.onmessage = (e) => {
      let msg: BridgeMessage
      try {
        msg = JSON.parse(String(e.data)) as BridgeMessage
      } catch {
        return
      }
      if (!msg || typeof msg.type !== 'string') return
      if (msg.type === 'hello') set({ peer: { name: String(msg.name ?? '?'), version: Number(msg.version ?? 0) } })
      set({ lastMessageAt: Date.now() })
      dispatch(msg)
    }
    socket.onclose = () => {
      ws = null
      set({ status: 'offline', peer: null })
      dispatch({ type: 'disconnect' })
      schedule()
    }
  }

  // Ponovno povezivanje sa sve duzom pauzom (auto se pali, racunar se budi...)
  function schedule() {
    if (retryTimer !== null) return
    retryTimer = window.setTimeout(() => {
      retryTimer = null
      connect()
    }, retryMs)
    retryMs = Math.min(RETRY_MAX_MS, retryMs * 2)
  }

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener)
      listener(state)
      return () => listeners.delete(listener)
    },
    on(type, handler) {
      if (!handlers.has(type)) handlers.set(type, new Set())
      handlers.get(type)!.add(handler)
      return () => handlers.get(type)?.delete(handler)
    },
    send(msg) {
      if (!ws || ws.readyState !== WebSocket.OPEN) return false
      ws.send(JSON.stringify(msg))
      return true
    },
    start() {
      if (started) return
      started = true
      let last = ''
      let prev = prefsService.getState()
      prefsService.subscribe((p) => {
        for (const [k, v] of Object.entries(vehicleSettings(p)))
          if (prev[k as keyof Prefs] !== v) this.send({ type: 'setting', key: k, value: v })
        prev = p
        const key = p['hw.bridge'] + '|' + p['hw.bridgeUrl']
        if (key === last) return
        last = key
        retryMs = RETRY_MIN_MS
        connect()
      })
    },
  }
}

export const bridgeService = createBridgeService()

/** Da li podaci stizu iz pravog vozila (inace su simulirani). */
export function isLive(): boolean {
  return bridgeService.getState().status === 'connected'
}
