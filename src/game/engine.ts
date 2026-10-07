import { ADVANCED_CASE_COST, ALLOY_COST, CASE_COST, CONDENSER_BUILD_COST, CONDENSER_UPGRADE_BASE_COST, DRILL_COST, PLANETS, RECYCLER_BUILD_COST, RECYCLER_RECIPES, RECYCLER_UPGRADE_BASE_COST, RELAY_COST, SCANNER_COST, SECTOR_TRAVEL_REQUIREMENTS, SECTORS } from './data'
import { getEquippedPlanetEffects } from './planetBonuses'
import type { Asteroid, AsteroidKind, CollectedPlanet, GameState, Inventory, MiniQuest, MiningResult, Rarity, ResourceKey } from './types'

export const QUEST_COOLDOWN_MS = 10 * 60 * 1000
export const RELAY_ENERGY_REQUIRED = 250
export const SCANNER_DURABILITY_MAX = 30
const SECTOR_LOOT_GROWTH = 1.6

export const INITIAL_QUESTS: MiniQuest[] = [
  { id: 'stone-breaker', title: 'Очистить орбиту', description: 'Разрушь 8 каменных фрагментов', kind: 'asteroid', asteroidKind: 'common', target: 8, progress: 0, reward: { iron: 50 }, claimed: false, claims: 0, cooldownMs: QUEST_COOLDOWN_MS },
  { id: 'metal-hunter', title: 'Охотник за металлом', description: 'Разрушь 6 металлических астероидов', kind: 'asteroid', asteroidKind: 'metallic', target: 6, progress: 0, reward: { iron: 100, copper: 25, silicon: 5 }, claimed: false, claims: 0, cooldownMs: QUEST_COOLDOWN_MS },
  { id: 'orbital-shift', title: 'Большая зачистка', description: 'Разрушь 18 астероидов любого типа', kind: 'asteroids', target: 18, progress: 0, reward: { iron: 250, copper: 100, nickel: 15, silicon: 10 }, claimed: false, claims: 0, cooldownMs: QUEST_COOLDOWN_MS },
]

export const INITIAL_GAME_STATE: GameState = {
  inventory: { iron: 0, copper: 0, nickel: 0, silicon: 0, alloy: 0, scanner: 0, drill: 0, recycler: 0, condenser: 0, relay: 0 },
  collection: [],
  equippedPlanetKeys: [],
  mined: 0,
  destroyedAsteroidsByKind: { common: 0, metallic: 0, rare: 0, anomalous: 0, crystal: 0, volcanic: 0, ice: 0 },
  totalClicks: 0,
  casesOpened: 0,
  sectorsExplored: 1,
  relayEnergy: 0,
  nextPlanetNumber: 731,
  lastDrops: {},
  scannerActive: false,
  scannerDurability: 0,
  condenserCharge: 0,
  quests: INITIAL_QUESTS,
}

const randomInt = (min: number, max: number, random: () => number) => min + Math.floor(random() * (max - min + 1))
const chance = (probability: number, random: () => number) => random() < probability

export function getEquippedRareAsteroidChance(state: GameState) {
  return Math.min(150, getEquippedPlanetEffects(state).reduce((total, effect) => total + (effect.type === 'rare-asteroid' ? effect.chance : 0), 0))
}

export function getEquippedMiningDamage(state: GameState) {
  return Math.min(1, getEquippedPlanetEffects(state).reduce((total, effect) => total + (effect.type === 'mining-damage' ? effect.amount : 0), 0))
}

function mineDrops(kind: Asteroid['kind'], state: GameState, random: () => number): Partial<Record<ResourceKey, number>> {
  const drops: Partial<Record<ResourceKey, number>> = {}
  const sectorLootMultiplier = Math.pow(SECTOR_LOOT_GROWTH, Math.max(0, state.sectorsExplored - 1))
  const add = (key: ResourceKey, min: number, max: number, bonus = 0) => {
    let amount = randomInt(min, max, random)
    const finalAmount = Math.ceil((amount + bonus) * sectorLootMultiplier)
    drops[key] = (drops[key] || 0) + finalAmount
  }

  if (kind === 'common') {
    add('iron', 8, 12)
    if (chance(0.82, random)) add('copper', 4, 7)
  } else if (kind === 'metallic') {
    add(chance(0.5, random) ? 'iron' : 'copper', 12, 18)
    add(chance(0.65, random) ? 'nickel' : 'silicon', 1, 3)
  } else if (kind === 'rare' || kind === 'ice' || kind === 'crystal') {
    const primaryRare = chance(0.5, random) ? 'nickel' : 'silicon'
    const secondaryRare = primaryRare === 'nickel' ? 'silicon' : 'nickel'
    add(primaryRare, 1, 3)
    if (chance(kind === 'crystal' ? 0.75 : 0.55, random)) add(secondaryRare, 1, 3)
  } else if (kind === 'anomalous') {
    add('nickel', 1, 3)
    add('silicon', 1, 3)
  } else if (kind === 'volcanic') {
    add(chance(0.58, random) ? 'iron' : 'copper', 13, 20)
    add(chance(0.5, random) ? 'nickel' : 'silicon', 1, 3)
  }

  const resourceTypes = (Object.keys(drops) as ResourceKey[]).filter((key) => (drops[key] ?? 0) > 0)
  while (resourceTypes.length > 2) {
    const removed = resourceTypes.splice(Math.floor(random() * resourceTypes.length), 1)[0]
    delete drops[removed]
  }
  return drops
}

function updateQuestProgress(quests: MiniQuest[] | undefined, kind: AsteroidKind, destroyed: boolean): MiniQuest[] {
  const now = Date.now()
  return (quests ?? INITIAL_QUESTS).map((quest) => {
    if (quest.availableAt && now < quest.availableAt) return quest
    const activeQuest = quest.claimed || quest.availableAt ? { ...quest, progress: 0, claimed: false, availableAt: undefined } : quest
    if (activeQuest.progress >= activeQuest.target) return activeQuest
    const applies = activeQuest.kind === 'attacks' || (destroyed && (activeQuest.kind === 'asteroids' || activeQuest.asteroidKind === kind))
    return applies ? { ...activeQuest, progress: Math.min(activeQuest.target, activeQuest.progress + 1) } : activeQuest
  })
}

export function hitAsteroid(state: GameState, asteroid: Asteroid, random = Math.random): { state: GameState; result: MiningResult } {
  const condenserInterval = getCondenserClickInterval(state.inventory.condenser)
  const charge = state.inventory.condenser > 0 ? state.condenserCharge + 1 : 0
  const pulse = condenserInterval > 0 && charge >= condenserInterval
  const damage = 1 + state.inventory.drill + getEquippedMiningDamage(state) + Number(pulse)
  const hp = asteroid.hp - damage
  const nextState = { ...state, totalClicks: state.totalClicks + 1, condenserCharge: pulse ? 0 : charge }
  if (hp > 0) return { state: { ...nextState, quests: updateQuestProgress(state.quests, asteroid.kind, false) }, result: { asteroid: { ...asteroid, hp }, destroyed: false, drops: {}, damage, pulse, energy: 0 } }

  const drops = mineDrops(asteroid.kind, state, random)
  const planetEffects = getEquippedPlanetEffects(state)
  const sectorLootMultiplier = Math.pow(SECTOR_LOOT_GROWTH, Math.max(0, state.sectorsExplored - 1))
  const minedCount = state.mined + 1
  for (const effect of planetEffects) {
    if (effect.type === 'salvage' && minedCount % effect.every === 0) {
      drops[effect.resource] = (drops[effect.resource] ?? 0) + Math.ceil(effect.amount * sectorLootMultiplier)
    }
  }
  const doubleDropChance = Math.min(35, planetEffects.reduce((total, effect) => total + (effect.type === 'double-drops' ? effect.chance : 0), 0))
  if (chance(doubleDropChance / 100, random)) {
    for (const resource of Object.keys(drops) as ResourceKey[]) drops[resource] = (drops[resource] ?? 0) * 2
  }
  const energyValue = asteroid.kind === 'common' || asteroid.kind === 'metallic' ? 10 : asteroid.kind === 'anomalous' ? 20 : 15
  const relayEnergyBonus = Math.min(5, planetEffects.reduce((total, effect) => total + (effect.type === 'relay-energy' ? effect.amount : 0), 0))
  const energy = state.sectorsExplored === 4 && state.inventory.relay > 0
    ? Math.min(energyValue + relayEnergyBonus, Math.max(0, RELAY_ENERGY_REQUIRED - (state.relayEnergy ?? 0)))
    : 0
  const inventory: Inventory = { ...state.inventory }
  for (const [key, amount] of Object.entries(drops) as [ResourceKey, number][]) inventory[key] += amount
  let scannerActive = state.scannerActive
  let scannerDurability = scannerActive ? Math.max(0, state.scannerDurability - 1) : 0
  if (scannerActive && scannerDurability === 0) {
    inventory.scanner = Math.max(0, inventory.scanner - 1)
    scannerActive = inventory.scanner > 0
    if (scannerActive) scannerDurability = SCANNER_DURABILITY_MAX
  }
  return {
    state: { ...nextState, inventory, scannerActive, scannerDurability, relayEnergy: Math.min(RELAY_ENERGY_REQUIRED, (state.relayEnergy ?? 0) + energy), mined: state.mined + 1, destroyedAsteroidsByKind: { ...state.destroyedAsteroidsByKind, [asteroid.kind]: state.destroyedAsteroidsByKind[asteroid.kind] + 1 }, lastDrops: drops, quests: updateQuestProgress(state.quests, asteroid.kind, true) },
    result: { asteroid: null, destroyed: true, drops, damage, pulse, energy },
  }
}

export function canOpenBasicCase(state: GameState) {
  return Object.entries(CASE_COST).every(([key, amount]) => state.inventory[key as ResourceKey] >= amount)
}

export function canOpenAdvancedCase(state: GameState) {
  return Object.entries(ADVANCED_CASE_COST).every(([key, amount]) => state.inventory[key as ResourceKey] >= amount)
}

const DUPLICATE_COMPENSATION: Record<Rarity, Partial<Record<ResourceKey, number>>> = {
  Common: { iron: 25, copper: 12 },
  Uncommon: { iron: 40, copper: 20 },
  Rare: { nickel: 4 },
  Epic: { nickel: 5, silicon: 3 },
  Legendary: { nickel: 8, silicon: 5 },
  Anomalous: { nickel: 10, silicon: 8 },
}

export interface CaseOpenResult {
  state: GameState
  planet: CollectedPlanet
  duplicate: boolean
  compensation: Partial<Record<ResourceKey, number>>
}

function openCase(state: GameState, advanced: boolean, random: () => number): CaseOpenResult | null {
  const cost = advanced ? ADVANCED_CASE_COST : CASE_COST
  const canOpen = advanced ? canOpenAdvancedCase(state) : canOpenBasicCase(state)
  if (!canOpen) return null
  const rarityBias: Record<Rarity, number> = advanced
    ? { Common: 0.08, Uncommon: 0.85, Rare: 1.7, Epic: 2.4, Legendary: 3, Anomalous: 3.2 }
    : { Common: 1, Uncommon: 1, Rare: 1, Epic: 1, Legendary: 1, Anomalous: 1 }
  const rareDiscoveryChance = Math.min(100, getEquippedPlanetEffects(state).reduce((total, effect) => total + (effect.type === 'rare-case' ? effect.chance : 0), 0))
  const rareDiscoveryBoost = 1 + rareDiscoveryChance / 100
  const pool = PLANETS.map((planet) => ({ planet, weight: planet.weight * rarityBias[planet.rarity] * (state.scannerActive && ['Rare', 'Epic', 'Legendary', 'Anomalous'].includes(planet.rarity) ? 1.35 : 1) * (['Rare', 'Epic', 'Legendary', 'Anomalous'].includes(planet.rarity) ? rareDiscoveryBoost : 1) }))
  let total = pool.reduce((sum, entry) => sum + entry.weight, 0)
  let cursor = random() * total
  const selected = pool.find((entry) => (cursor -= entry.weight) < 0)?.planet ?? PLANETS[0]
  const existing = state.collection.find((item) => item.catalogKey === selected.key)
  const duplicate = Boolean(existing)
  const compensation = duplicate ? DUPLICATE_COMPENSATION[selected.rarity] : {}
  const number = state.nextPlanetNumber
  const planet: CollectedPlanet = existing ?? {
    uid: `${Date.now()}-${Math.floor(random() * 1_000_000)}`,
    catalogKey: selected.key,
    planetId: `PLANET #${String(number).padStart(6, '0')}`,
    discoveredAt: new Date().toISOString(),
    onChain: false,
  }
  const inventory = { ...state.inventory }
  for (const [key, amount] of Object.entries(cost) as [ResourceKey, number][]) inventory[key] -= amount
  for (const [key, amount] of Object.entries(compensation) as [ResourceKey, number][]) inventory[key] += amount
  return {
    planet,
    duplicate,
    compensation,
    state: {
      ...state,
      inventory,
      collection: duplicate ? state.collection : [planet, ...state.collection],
      casesOpened: state.casesOpened + 1,
      nextPlanetNumber: duplicate ? number : number + 1,
    },
  }
}

export function openBasicCase(state: GameState, random = Math.random) { return openCase(state, false, random) }
export function openAdvancedCase(state: GameState, random = Math.random) { return openCase(state, true, random) }

export function claimMiniQuest(state: GameState, id: string, now = Date.now()): GameState | null {
  const currentQuests = state.quests ?? INITIAL_QUESTS
  const quest = currentQuests.find((entry) => entry.id === id)
  if (!quest || quest.claimed || quest.progress < quest.target || (quest.availableAt && now < quest.availableAt)) return null
  const quests = currentQuests.map((entry) => entry.id === id ? { ...entry, progress: 0, claimed: true, claims: (entry.claims ?? 0) + 1, cooldownMs: QUEST_COOLDOWN_MS, availableAt: now + QUEST_COOLDOWN_MS } : entry)
  const inventory = { ...state.inventory }
  for (const [key, amount] of Object.entries(quest.reward) as [ResourceKey, number][]) inventory[key] += amount
  return { ...state, inventory, quests }
}

export function craftAlloy(state: GameState): GameState | null {
  const { iron, copper, silicon } = state.inventory
  if (iron < ALLOY_COST.iron || copper < ALLOY_COST.copper || silicon < ALLOY_COST.silicon) return null
  return { ...state, inventory: { ...state.inventory, iron: iron - ALLOY_COST.iron, copper: copper - ALLOY_COST.copper, silicon: silicon - ALLOY_COST.silicon, alloy: state.inventory.alloy + 1 } }
}

export function craftScanner(state: GameState): GameState | null {
  if (state.inventory.alloy < SCANNER_COST.alloy || state.inventory.nickel < SCANNER_COST.nickel) return null
  const scannerAlreadyActive = state.scannerActive && state.scannerDurability > 0
  return { ...state, inventory: { ...state.inventory, alloy: state.inventory.alloy - SCANNER_COST.alloy, nickel: state.inventory.nickel - SCANNER_COST.nickel, scanner: state.inventory.scanner + 1 }, scannerActive: true, scannerDurability: scannerAlreadyActive ? state.scannerDurability : SCANNER_DURABILITY_MAX }
}

export function canCraftRelay(state: GameState): boolean {
  return state.sectorsExplored === 4 && state.inventory.relay < 1 && canPay(state.inventory, RELAY_COST)
}

export function craftRelay(state: GameState): GameState | null {
  if (!canCraftRelay(state)) return null
  const inventory = pay(state.inventory, RELAY_COST)
  inventory.relay += 1
  return { ...state, inventory }
}

export function getDrillUpgradeCost(currentLevel: number) {
  const multiplier = Math.pow(1.7, Math.max(0, currentLevel))
  return {
    iron: Math.ceil(DRILL_COST.iron * multiplier),
    copper: Math.ceil(DRILL_COST.copper * multiplier),
    nickel: Math.ceil(DRILL_COST.nickel * multiplier),
    silicon: Math.ceil(DRILL_COST.silicon * multiplier),
  }
}

export function canCraftDrill(state: GameState): boolean {
  if (state.inventory.drill >= state.sectorsExplored) return false
  const cost = getDrillUpgradeCost(state.inventory.drill)
  return state.inventory.iron >= cost.iron && state.inventory.copper >= cost.copper && state.inventory.nickel >= cost.nickel && state.inventory.silicon >= cost.silicon
}

export function craftDrill(state: GameState): GameState | null {
  if (!canCraftDrill(state)) return null
  const { iron, copper, nickel, silicon, drill } = state.inventory
  const cost = getDrillUpgradeCost(drill)
  return {
    ...state,
    inventory: { ...state.inventory, iron: iron - cost.iron, copper: copper - cost.copper, nickel: nickel - cost.nickel, silicon: silicon - cost.silicon, drill: drill + 1 },
  }
}

type InventoryCost = Partial<Record<keyof Inventory, number>>

function canPay(inventory: Inventory, cost: InventoryCost) {
  return Object.entries(cost).every(([key, amount]) => inventory[key as keyof Inventory] >= (amount ?? 0))
}

function pay(inventory: Inventory, cost: InventoryCost): Inventory {
  const next = { ...inventory }
  for (const [key, amount] of Object.entries(cost) as [keyof Inventory, number][]) next[key] -= amount
  return next
}

export function getRecyclerUpgradeCost(level: number) {
  const multiplier = Math.pow(1.5, Math.max(0, level - 1))
  return {
    iron: Math.ceil(RECYCLER_UPGRADE_BASE_COST.iron * multiplier),
    copper: Math.ceil(RECYCLER_UPGRADE_BASE_COST.copper * multiplier),
    nickel: Math.ceil(RECYCLER_UPGRADE_BASE_COST.nickel * multiplier),
    silicon: Math.ceil(RECYCLER_UPGRADE_BASE_COST.silicon * multiplier),
  }
}

export function canBuildRecycler(state: GameState) {
  return state.inventory.recycler === 0 && canPay(state.inventory, RECYCLER_BUILD_COST)
}

export function buildRecycler(state: GameState): GameState | null {
  if (!canBuildRecycler(state)) return null
  return { ...state, inventory: { ...pay(state.inventory, RECYCLER_BUILD_COST), recycler: 1 } }
}

export function canUpgradeRecycler(state: GameState) {
  if (state.inventory.recycler < 1 || state.inventory.recycler >= state.sectorsExplored) return false
  return canPay(state.inventory, getRecyclerUpgradeCost(state.inventory.recycler))
}

export function upgradeRecycler(state: GameState): GameState | null {
  if (!canUpgradeRecycler(state)) return null
  const nextInventory = pay(state.inventory, getRecyclerUpgradeCost(state.inventory.recycler))
  return { ...state, inventory: { ...nextInventory, recycler: state.inventory.recycler + 1 } }
}

export function getRecyclerDiscount(level: number) {
  return Math.min(80, Math.max(0, (level - 1) * 20))
}

export function getRecycleCost(resource: 'nickel' | 'silicon', recyclerLevel: number) {
  const recipe = RECYCLER_RECIPES[resource]
  const multiplier = 1 - getRecyclerDiscount(recyclerLevel) / 100
  return { iron: Math.ceil(recipe.cost.iron * multiplier), copper: Math.ceil(recipe.cost.copper * multiplier) }
}

export function canRecycle(state: GameState, resource: 'nickel' | 'silicon') {
  return state.inventory.recycler > 0 && canPay(state.inventory, getRecycleCost(resource, state.inventory.recycler))
}

export function recycleResource(state: GameState, resource: 'nickel' | 'silicon'): GameState | null {
  if (!canRecycle(state, resource)) return null
  const inventory = pay(state.inventory, getRecycleCost(resource, state.inventory.recycler))
  inventory[resource] += RECYCLER_RECIPES[resource].output
  return { ...state, inventory }
}

export function getCondenserUpgradeCost(level: number) {
  const multiplier = Math.pow(1.6, Math.max(0, level - 1))
  return {
    iron: Math.ceil(CONDENSER_UPGRADE_BASE_COST.iron * multiplier),
    copper: Math.ceil(CONDENSER_UPGRADE_BASE_COST.copper * multiplier),
    nickel: Math.ceil(CONDENSER_UPGRADE_BASE_COST.nickel * multiplier),
    silicon: Math.ceil(CONDENSER_UPGRADE_BASE_COST.silicon * multiplier),
  }
}

export function canCraftCondenser(state: GameState) {
  if (state.inventory.condenser === 0) return canPay(state.inventory, CONDENSER_BUILD_COST)
  return state.inventory.condenser < state.sectorsExplored && canPay(state.inventory, getCondenserUpgradeCost(state.inventory.condenser))
}

export function craftOrUpgradeCondenser(state: GameState): GameState | null {
  if (!canCraftCondenser(state)) return null
  const level = state.inventory.condenser
  const cost = level === 0 ? CONDENSER_BUILD_COST : getCondenserUpgradeCost(level)
  const inventory = pay(state.inventory, cost)
  return { ...state, inventory: { ...inventory, condenser: level + 1 } }
}

export function getCondenserClickInterval(level: number) {
  return level < 1 ? 0 : Math.max(3, 8 - level)
}

export function getPlanetSlotCount(sectorsExplored: number) {
  return Math.min(3, Math.max(1, Math.floor(sectorsExplored)))
}

export function togglePlanetEquip(state: GameState, catalogKey: string): GameState | null {
  const equipped = state.equippedPlanetKeys ?? []
  if (!state.collection.some((planet) => planet.catalogKey === catalogKey)) return null
  if (equipped.includes(catalogKey)) return { ...state, equippedPlanetKeys: equipped.filter((key) => key !== catalogKey) }
  if (equipped.length >= getPlanetSlotCount(state.sectorsExplored)) return null
  return { ...state, equippedPlanetKeys: [...equipped, catalogKey] }
}

export type SectorUpgradeKey = 'drill' | 'recycler' | 'condenser'

export function getSectorUpgradeProgress(state: GameState) {
  const maxLevel = state.sectorsExplored
  const upgrades: { key: SectorUpgradeKey; level: number }[] = [
    { key: 'drill', level: state.inventory.drill },
    { key: 'recycler', level: state.inventory.recycler },
    { key: 'condenser', level: state.inventory.condenser },
  ]
  return upgrades.map((upgrade) => ({ ...upgrade, maxLevel, complete: upgrade.level >= maxLevel }))
}

export function canTravelToNextSector(state: GameState): boolean {
  const requirement = SECTOR_TRAVEL_REQUIREMENTS[state.sectorsExplored - 1]
  if (!requirement || state.sectorsExplored >= SECTORS.length) return false
  const hasResources = Object.entries(requirement.resources).every(([key, amount]) => state.inventory[key as ResourceKey] >= (amount ?? 0))
  const hasItems = Object.entries(requirement.items).every(([key, amount]) => state.inventory[key as keyof Inventory] >= (amount ?? 0))
  const hasMaxedSectorUpgrades = getSectorUpgradeProgress(state).every((upgrade) => upgrade.complete)
  const hasRelayCharge = state.sectorsExplored !== 4 || (state.relayEnergy ?? 0) >= RELAY_ENERGY_REQUIRED
  return hasResources && hasItems && hasMaxedSectorUpgrades && hasRelayCharge
}

export function travelToNextSector(state: GameState): GameState | null {
  if (!canTravelToNextSector(state)) return null
  const requirement = SECTOR_TRAVEL_REQUIREMENTS[state.sectorsExplored - 1]
  if (!requirement) return null
  const inventory: Inventory = { ...state.inventory }
  for (const [key, amount] of Object.entries(requirement.resources) as [ResourceKey, number][]) inventory[key] -= amount
  inventory.alloy -= requirement.items.alloy ?? 0
  return { ...state, inventory, relayEnergy: state.sectorsExplored === 4 ? 0 : state.relayEnergy, sectorsExplored: state.sectorsExplored + 1 }
}
