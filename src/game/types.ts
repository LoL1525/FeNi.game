export type ResourceKey = 'iron' | 'copper' | 'nickel' | 'silicon'
export type AsteroidKind = 'common' | 'metallic' | 'rare' | 'anomalous' | 'crystal' | 'volcanic' | 'ice'
export type Screen = 'mining' | 'cases' | 'collection' | 'lab' | 'map' | 'achievements'
export type Rarity = 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary' | 'Anomalous'
export type PlanetType = 'Rocky' | 'Ocean' | 'Desert' | 'Ice' | 'Gas Giant' | 'Volcanic' | 'Toxic' | 'Anomalous'

export type PlanetEffect =
  | { type: 'salvage'; resource: ResourceKey; amount: number; every: number }
  | { type: 'double-drops'; chance: number }
  | { type: 'rare-asteroid'; chance: number }
  | { type: 'rare-case'; chance: number }
  | { type: 'mining-damage'; amount: number }
  | { type: 'relay-energy'; amount: number }

export interface Inventory {
  iron: number
  copper: number
  nickel: number
  silicon: number
  alloy: number
  scanner: number
  drill: number
  recycler: number
  condenser: number
  relay: number
}

export interface Asteroid {
  id: number
  kind: AsteroidKind
  hp: number
  maxHp: number
}

export interface PlanetTemplate {
  key: string
  name: string
  type: PlanetType
  rarity: Rarity
  mass: number
  temperature: number
  atmosphere: string
  resources: string[]
  sector: string
  effects: PlanetEffect[]
  weight: number
  visual: 'ocean' | 'rocky' | 'desert' | 'ice' | 'gas' | 'volcanic' | 'toxic' | 'anomaly' | 'ringed' | 'crystal' | 'aurora' | 'ember' | 'storm' | 'tide' | 'luminous' | 'canyon' | 'coral' | 'ribbon' | 'moss' | 'geode' | 'comet' | 'clockwork' | 'eclipse'
}

export interface MiniQuest {
  id: string
  title: string
  description: string
  kind: 'attacks' | 'asteroid' | 'asteroids'
  asteroidKind?: AsteroidKind
  target: number
  progress: number
  reward: Partial<Record<ResourceKey, number>>
  claimed: boolean
  claims: number
  cooldownMs: number
  availableAt?: number
}

export interface CollectedPlanet {
  uid: string
  catalogKey: string
  planetId: string
  discoveredAt: string
  onChain: boolean
  mintAddress?: string
  walletAddress?: string
  transactionSignature?: string
}

export interface GameState {
  inventory: Inventory
  collection: CollectedPlanet[]
  equippedPlanetKeys: string[]
  mined: number
  destroyedAsteroidsByKind: Record<AsteroidKind, number>
  totalClicks: number
  casesOpened: number
  sectorsExplored: number
  relayEnergy: number
  nextPlanetNumber: number
  lastDrops: Partial<Record<ResourceKey, number>>
  scannerActive: boolean
  scannerDurability: number
  condenserCharge: number
  quests: MiniQuest[]
}

export interface MiningResult {
  asteroid: Asteroid | null
  destroyed: boolean
  drops: Partial<Record<ResourceKey, number>>
  damage: number
  pulse: boolean
  energy: number
}
