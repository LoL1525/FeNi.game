import type { Asteroid, GameState } from './types'

export type ServerAction =
  | 'mine' | 'open-basic-case' | 'open-advanced-case' | 'claim-quest'
  | 'craft-alloy' | 'craft-scanner' | 'craft-drill' | 'build-recycler'
  | 'upgrade-recycler' | 'recycle-nickel' | 'recycle-silicon'
  | 'craft-condenser' | 'craft-relay' | 'travel' | 'toggle-planet'

export interface GameSnapshot {
  state: GameState
  asteroid: Asteroid
  wallets?: string[]
}

export interface ActionSnapshot extends GameSnapshot {
  result?: {
    damage?: number
    destroyed?: boolean
    drops?: GameState['lastDrops']
    energy?: number
    pulse?: boolean
    planet?: GameState['collection'][number]
    duplicate?: boolean
    compensation?: GameState['lastDrops']
  }
}

export class GameApiError extends Error {
  readonly status: number
  constructor(message: string, status: number) { super(message); this.name = 'GameApiError'; this.status = status }
}

function toBase64(bytes: Uint8Array) {
  let binary = ''
  for (let offset = 0; offset < bytes.length; offset += 0x8000) binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000))
  return btoa(binary)
}

async function request<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(path, {
    method: body === undefined ? 'GET' : 'POST',
    credentials: 'same-origin',
    headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const result = await response.json() as T & { error?: string }
  if (!response.ok) {
    throw new GameApiError(result.error || `Game server returned ${response.status}`, response.status)
  }
  return result
}

export async function loadGuestGame() {
  return request<GameSnapshot>('/api/game')
}

export async function linkWalletToGame(address: string, signMessage: (message: Uint8Array) => Promise<Uint8Array>) {
  const challenge = await request<{ message: string }>('/api/auth/challenge', { address })
  const signature = await signMessage(new TextEncoder().encode(challenge.message))
  return request<GameSnapshot & { ok: boolean }>('/api/auth/verify', { address, signature: toBase64(signature) })
}

export async function sendGameAction(action: ServerAction, args: Record<string, string> = {}) {
  return request<ActionSnapshot>('/api/game/action', { action, args })
}

export async function submitPlanetNftClaim(walletAddress: string, planetUid: string, mintAddress: string, signature: string) {
  return request<GameSnapshot>('/api/game/nft/claim', { walletAddress, planetUid, mintAddress, signature })
}
