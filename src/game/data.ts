import type { AsteroidKind, PlanetTemplate, ResourceKey } from './types'

export const RESOURCES: Record<ResourceKey, { name: string; color: string; description: string }> = {
  iron: { name: 'Железо', color: '#b6c7d5', description: 'Обычный · прочный металл' },
  copper: { name: 'Медь', color: '#e9985e', description: 'Обычный · проводящий металл' },
  nickel: { name: 'Никель', color: '#bacb9d', description: 'Необычный · плотный металл' },
  silicon: { name: 'Кремний', color: '#b69be6', description: 'Обычный · кристаллический минерал' },
}

export const SECTORS = [
  { key: 'solar-fringe', name: 'Solar Fringe', description: 'Спокойный пояс астероидов на границе изученного космоса.', left: '14%', top: '54%' },
  { key: 'red-nebula', name: 'Red Nebula', description: 'Пурпурные туманности и богатые медью обломки.', left: '36%', top: '27%' },
  { key: 'orion-field', name: 'Orion Field', description: 'Плотное поле металлических астероидов и редких сигналов.', left: '50%', top: '65%' },
  { key: 'forgotten-systems', name: 'Forgotten Systems', description: 'Старая сеть миров, скрытая в космической пыли.', left: '72%', top: '32%' },
  { key: 'the-void', name: 'The Void', description: 'Край карты с аномальными находками.', left: '87%', top: '61%' },
] as const

export type SpecialItemKey = 'alloy' | 'scanner' | 'drill' | 'recycler' | 'condenser' | 'relay'
export const SPECIAL_ITEMS: Record<SpecialItemKey, { name: string; symbol: string }> = {
  alloy: { name: 'Минеральный сплав', symbol: 'Сплав' },
  scanner: { name: 'Улучшенный сканер', symbol: 'Сканер' },
  drill: { name: 'Бур', symbol: 'Бур' },
  recycler: { name: 'Переработчик', symbol: 'Переработчик' },
  condenser: { name: 'Импульсный конденсатор', symbol: 'Конденсатор' },
  relay: { name: 'Древний ретранслятор', symbol: 'Ретранслятор' },
}

export const RELAY_COST = { iron: 560, copper: 320, nickel: 180, silicon: 160, alloy: 2 } as const

export const SECTOR_TRAVEL_REQUIREMENTS: {
  resources: Partial<Record<ResourceKey, number>>
  items: Partial<Record<SpecialItemKey, number>>
}[] = [
  { resources: { iron: 120, copper: 60, silicon: 20 }, items: { alloy: 1 } },
  { resources: { iron: 360, copper: 180, nickel: 100 }, items: { alloy: 1, scanner: 1 } },
  { resources: { iron: 360, copper: 200, nickel: 120, silicon: 80 }, items: { alloy: 1, drill: 2 } },
  { resources: {}, items: { alloy: 1, relay: 1 } },
]

export const ASTEROIDS: Record<AsteroidKind, { name: string; label: string; minHp: number; maxHp: number; accent: string; drop: string }> = {
  common: { name: 'Каменный фрагмент', label: 'ОБЫЧНЫЙ', minHp: 7, maxHp: 11, accent: '#9a9eab', drop: 'Сбалансированный набор минералов' },
  metallic: { name: 'Железная глыба', label: 'МЕТАЛЛИЧЕСКИЙ', minHp: 10, maxHp: 15, accent: '#d49a72', drop: 'Больше металлических ресурсов' },
  rare: { name: 'Холодный обломок', label: 'РЕДКИЙ', minHp: 15, maxHp: 22, accent: '#9e91d3', drop: 'Повышенный шанс на никель' },
  anomalous: { name: 'Аномальный фрагмент', label: 'АНОМАЛЬНЫЙ', minHp: 18, maxHp: 36, accent: '#72c4c2', drop: 'Редкие ресурсы, но астероид прочнее' },
  crystal: { name: 'Кристаллический осколок', label: 'КРИСТАЛЛИЧЕСКИЙ', minHp: 13, maxHp: 20, accent: '#b59af1', drop: 'Небольшая россыпь кремния и никеля' },
  volcanic: { name: 'Вулканическое ядро', label: 'ВУЛКАНИЧЕСКИЙ', minHp: 17, maxHp: 27, accent: '#ee896f', drop: 'Железо и редкие примеси' },
  ice: { name: 'Ледяной метеорит', label: 'ЛЕДЯНОЙ', minHp: 12, maxHp: 19, accent: '#7bd2df', drop: 'Никель и кремний из ледяной породы' },
}

export const PLANETS: PlanetTemplate[] = [
  { key: 'vespera', name: 'Vespera', type: 'Rocky', rarity: 'Common', mass: 0.62, temperature: 244, atmosphere: 'CO₂ / Ar', resources: ['Iron', 'Silicon'], sector: 'Solar Fringe', effects: [{ type: 'salvage', resource: 'iron', amount: 1, every: 4 }], weight: 18, visual: 'rocky' },
  { key: 'marea', name: 'Marea', type: 'Ocean', rarity: 'Common', mass: 0.73, temperature: 287, atmosphere: 'N₂ / O₂', resources: ['Water', 'Silicon'], sector: 'Solar Fringe', effects: [{ type: 'double-drops', chance: 5 }], weight: 16, visual: 'ocean' },
  { key: 'khepri', name: 'Khepri', type: 'Desert', rarity: 'Common', mass: 0.48, temperature: 331, atmosphere: 'CO₂ / Ne', resources: ['Copper', 'Silicon'], sector: 'Solar Fringe', effects: [{ type: 'salvage', resource: 'silicon', amount: 1, every: 4 }], weight: 15, visual: 'desert' },
  { key: 'nival', name: 'Nival', type: 'Ice', rarity: 'Uncommon', mass: 0.81, temperature: 176, atmosphere: 'N₂ / CH₄', resources: ['Nickel', 'Ice'], sector: 'Solar Fringe', effects: [{ type: 'salvage', resource: 'nickel', amount: 1, every: 3 }], weight: 12, visual: 'ice' },
  { key: 'thallos', name: 'Thallos', type: 'Volcanic', rarity: 'Uncommon', mass: 1.13, temperature: 491, atmosphere: 'SO₂ / CO₂', resources: ['Iron', 'Sulfur'], sector: 'Solar Fringe', effects: [{ type: 'double-drops', chance: 8 }], weight: 11, visual: 'volcanic' },
  { key: 'orison', name: 'Orison-4', type: 'Gas Giant', rarity: 'Rare', mass: 8.4, temperature: 218, atmosphere: 'H₂ / He', resources: ['Hydrogen', 'Helium'], sector: 'Solar Fringe', effects: [{ type: 'rare-case', chance: 25 }], weight: 8, visual: 'gas' },
  { key: 'umbra', name: 'Umbra', type: 'Toxic', rarity: 'Rare', mass: 1.52, temperature: 265, atmosphere: 'Cl₂ / N₂', resources: ['Nickel', 'Silicon'], sector: 'Solar Fringe', effects: [{ type: 'rare-asteroid', chance: 25 }], weight: 7, visual: 'toxic' },
  { key: 'pelagos', name: 'Pelagos', type: 'Ocean', rarity: 'Epic', mass: 1.08, temperature: 276, atmosphere: 'N₂ / O₂ / H₂O', resources: ['Water', 'Crystal'], sector: 'Solar Fringe', effects: [{ type: 'double-drops', chance: 12 }], weight: 5, visual: 'ocean' },
  { key: 'heliograph', name: 'Heliograph', type: 'Gas Giant', rarity: 'Epic', mass: 14.7, temperature: 156, atmosphere: 'H₂ / He / Ne', resources: ['Helium', 'Silicon'], sector: 'Solar Fringe', effects: [{ type: 'mining-damage', amount: 1 }], weight: 4, visual: 'gas' },
  { key: 'null-bloom', name: 'Null Bloom', type: 'Anomalous', rarity: 'Anomalous', mass: 0.01, temperature: -273, atmosphere: 'UNKNOWN', resources: ['Unknown'], sector: 'Solar Fringe', effects: [{ type: 'rare-case', chance: 55 }, { type: 'double-drops', chance: 12 }], weight: 1, visual: 'anomaly' },
  { key: 'cinder', name: 'Cinderwake', type: 'Volcanic', rarity: 'Legendary', mass: 2.41, temperature: 613, atmosphere: 'SO₂ / Ar', resources: ['Gold', 'Sulfur'], sector: 'Solar Fringe', effects: [{ type: 'mining-damage', amount: 1 }], weight: 2, visual: 'volcanic' },
  { key: 'mirage', name: 'Mirage-9', type: 'Desert', rarity: 'Uncommon', mass: 0.91, temperature: 304, atmosphere: 'N₂ / CO₂', resources: ['Copper', 'Crystal'], sector: 'Solar Fringe', effects: [{ type: 'rare-asteroid', chance: 20 }], weight: 9, visual: 'desert' },
  { key: 'aurelia', name: 'Aurelia', type: 'Ocean', rarity: 'Common', mass: 0.69, temperature: 291, atmosphere: 'N₂ / O₂', resources: ['Water', 'Copper'], sector: 'Solar Fringe', effects: [{ type: 'salvage', resource: 'copper', amount: 1, every: 4 }], weight: 14, visual: 'tide' },
  { key: 'brontes', name: 'Brontes', type: 'Gas Giant', rarity: 'Common', mass: 6.2, temperature: 203, atmosphere: 'H₂ / He', resources: ['Helium', 'Iron'], sector: 'Solar Fringe', effects: [{ type: 'salvage', resource: 'iron', amount: 1, every: 4 }], weight: 13, visual: 'storm' },
  { key: 'silvara', name: 'Silvara', type: 'Rocky', rarity: 'Uncommon', mass: 0.88, temperature: 259, atmosphere: 'Ar / O₂', resources: ['Silicon', 'Nickel'], sector: 'Solar Fringe', effects: [{ type: 'salvage', resource: 'silicon', amount: 1, every: 3 }], weight: 10, visual: 'crystal' },
  { key: 'noctis', name: 'Noctis', type: 'Toxic', rarity: 'Uncommon', mass: 1.26, temperature: 238, atmosphere: 'CH₄ / N₂', resources: ['Nickel', 'Sulfur'], sector: 'Solar Fringe', effects: [{ type: 'rare-asteroid', chance: 30 }], weight: 9, visual: 'aurora' },
  { key: 'velorum', name: 'Velorum', type: 'Ice', rarity: 'Rare', mass: 1.02, temperature: 164, atmosphere: 'N₂ / H₂O', resources: ['Ice', 'Silicon'], sector: 'Solar Fringe', effects: [{ type: 'rare-asteroid', chance: 45 }], weight: 6, visual: 'luminous' },
  { key: 'emberfall', name: 'Emberfall', type: 'Volcanic', rarity: 'Rare', mass: 1.77, temperature: 478, atmosphere: 'SO₂ / CO₂', resources: ['Iron', 'Sulfur'], sector: 'Solar Fringe', effects: [{ type: 'double-drops', chance: 10 }], weight: 5, visual: 'ember' },
  { key: 'caelune', name: 'Caelune', type: 'Desert', rarity: 'Epic', mass: 0.94, temperature: 279, atmosphere: 'Ne / Ar', resources: ['Crystal', 'Silicon'], sector: 'Solar Fringe', effects: [{ type: 'salvage', resource: 'silicon', amount: 1, every: 2 }], weight: 4, visual: 'ringed' },
  { key: 'mirrorglass', name: 'Mirrorglass', type: 'Rocky', rarity: 'Epic', mass: 1.31, temperature: 222, atmosphere: 'Ar / N₂', resources: ['Nickel', 'Crystal'], sector: 'Solar Fringe', effects: [{ type: 'rare-case', chance: 45 }], weight: 3, visual: 'crystal' },
  { key: 'solenne', name: 'Solenne', type: 'Ocean', rarity: 'Legendary', mass: 1.46, temperature: 299, atmosphere: 'N₂ / O₂ / H₂O', resources: ['Water', 'Gold'], sector: 'Solar Fringe', effects: [{ type: 'salvage', resource: 'copper', amount: 2, every: 2 }], weight: 2, visual: 'tide' },
  { key: 'afterglow', name: 'Afterglow', type: 'Anomalous', rarity: 'Anomalous', mass: 0.03, temperature: -181, atmosphere: 'IONIZED', resources: ['Unknown', 'Crystal'], sector: 'Solar Fringe', effects: [{ type: 'rare-asteroid', chance: 65 }, { type: 'relay-energy', amount: 2 }], weight: 1, visual: 'luminous' },
  { key: 'starpond', name: 'Starpond', type: 'Ocean', rarity: 'Common', mass: 0.58, temperature: 281, atmosphere: 'N₂ / O₂ / Ar', resources: ['Water', 'Copper'], sector: 'Solar Fringe', effects: [{ type: 'double-drops', chance: 5 }], weight: 13, visual: 'coral' },
  { key: 'redvault', name: 'Redvault', type: 'Rocky', rarity: 'Common', mass: 0.93, temperature: 267, atmosphere: 'CO₂ / Ar', resources: ['Iron', 'Gold'], sector: 'Solar Fringe', effects: [{ type: 'salvage', resource: 'iron', amount: 1, every: 3 }], weight: 12, visual: 'canyon' },
  { key: 'blue-kite', name: 'Blue Kite', type: 'Ice', rarity: 'Uncommon', mass: 0.72, temperature: 153, atmosphere: 'N₂ / Ne', resources: ['Ice', 'Nickel'], sector: 'Solar Fringe', effects: [{ type: 'salvage', resource: 'nickel', amount: 1, every: 3 }], weight: 8, visual: 'comet' },
  { key: 'aureate', name: 'Aureate', type: 'Gas Giant', rarity: 'Rare', mass: 11.3, temperature: 187, atmosphere: 'H₂ / He / Kr', resources: ['Helium', 'Crystal'], sector: 'Solar Fringe', effects: [{ type: 'rare-case', chance: 35 }], weight: 4, visual: 'ribbon' },
  { key: 'verdigris', name: 'Verdigris', type: 'Toxic', rarity: 'Uncommon', mass: 1.18, temperature: 230, atmosphere: 'CH₄ / Cl₂', resources: ['Silicon', 'Sulfur'], sector: 'Solar Fringe', effects: [{ type: 'double-drops', chance: 8 }], weight: 7, visual: 'moss' },
  { key: 'opal-choir', name: 'Opal Choir', type: 'Rocky', rarity: 'Rare', mass: 1.34, temperature: 248, atmosphere: 'Ar / O₂', resources: ['Crystal', 'Nickel'], sector: 'Solar Fringe', effects: [{ type: 'rare-asteroid', chance: 45 }], weight: 4, visual: 'geode' },
  { key: 'clockwork-reef', name: 'Clockwork Reef', type: 'Volcanic', rarity: 'Epic', mass: 1.92, temperature: 422, atmosphere: 'SO₂ / Ar', resources: ['Iron', 'Crystal'], sector: 'Solar Fringe', effects: [{ type: 'relay-energy', amount: 2 }], weight: 2, visual: 'clockwork' },
  { key: 'ecliptica', name: 'Ecliptica', type: 'Gas Giant', rarity: 'Legendary', mass: 18.6, temperature: 119, atmosphere: 'H₂ / He / Xe', resources: ['Gold', 'Helium'], sector: 'Solar Fringe', effects: [{ type: 'double-drops', chance: 18 }], weight: 1, visual: 'eclipse' },
  { key: 'tiny-maelstrom', name: 'Tiny Maelstrom', type: 'Anomalous', rarity: 'Anomalous', mass: 0.02, temperature: -226, atmosphere: 'UNSTABLE', resources: ['Unknown', 'Crystal'], sector: 'Solar Fringe', effects: [{ type: 'mining-damage', amount: 1 }, { type: 'rare-case', chance: 35 }], weight: 1, visual: 'anomaly' },
]

export const CASE_COST = { iron: 220, nickel: 120 } as const
export const ADVANCED_CASE_COST = { iron: 520, copper: 280, nickel: 55, silicon: 35 } as const
export const ALLOY_COST = { iron: 200, copper: 100, silicon: 40 } as const
export const SCANNER_COST = { alloy: 2, nickel: 20 } as const
export const DRILL_COST = { iron: 150, copper: 80, nickel: 18, silicon: 25 } as const
export const RECYCLER_BUILD_COST = { iron: 700, copper: 500, nickel: 40, silicon: 80, alloy: 2 } as const
export const RECYCLER_UPGRADE_BASE_COST = { iron: 300, copper: 200, nickel: 15, silicon: 25 } as const
export const RECYCLER_RECIPES = {
  nickel: { cost: { iron: 250, copper: 150 }, output: 3 },
  silicon: { cost: { iron: 220, copper: 180 }, output: 3 },
} as const
export const CONDENSER_BUILD_COST = { iron: 450, copper: 300, nickel: 20, silicon: 30 } as const
export const CONDENSER_UPGRADE_BASE_COST = { iron: 250, copper: 180, nickel: 12, silicon: 20 } as const

export const ASTEROID_ODDS: Record<AsteroidKind, number> = {
  common: 0.52,
  metallic: 0.22,
  rare: 0.08,
  anomalous: 0.02,
  crystal: 0.07,
  volcanic: 0.05,
  ice: 0.04,
}

export function rollAsteroid(random = Math.random, scannerActive = false, sector = 1, id = Date.now(), rareAsteroidBonusPercent = 0): { id: number; kind: AsteroidKind; hp: number; maxHp: number } {
  const rareAsteroidMultiplier = 1 + Math.max(0, rareAsteroidBonusPercent) / 100
  const weights: Record<AsteroidKind, number> = {
    common: ASTEROID_ODDS.common,
    metallic: ASTEROID_ODDS.metallic,
    rare: (scannerActive ? 0.12 : ASTEROID_ODDS.rare) * rareAsteroidMultiplier,
    anomalous: scannerActive ? 0.04 : ASTEROID_ODDS.anomalous,
    crystal: ASTEROID_ODDS.crystal,
    volcanic: ASTEROID_ODDS.volcanic,
    ice: ASTEROID_ODDS.ice,
  }
  const total = Object.values(weights).reduce((sum, weight) => sum + weight, 0)
  let cursor = random() * total
  const kind = (Object.entries(weights).find(([, weight]) => (cursor -= weight) < 0)?.[0] ?? 'common') as AsteroidKind
  const sectorMultiplier = Math.pow(1.5, Math.max(0, sector - 1))
  const minHp = Math.round(ASTEROIDS[kind].minHp * sectorMultiplier)
  const maxHp = Math.round(ASTEROIDS[kind].maxHp * sectorMultiplier)
  const hp = minHp + Math.floor(random() * (maxHp - minHp + 1))
  return { id, kind, hp, maxHp: hp }
}
