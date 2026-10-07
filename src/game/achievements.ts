import { PLANETS } from './data'
import type { GameState } from './types'

export type AchievementGroup = 'mining' | 'cases' | 'collection' | 'exploration'

export interface AchievementDefinition {
  id: string
  title: string
  description: string
  group: AchievementGroup
  target: number
  progress: (game: GameState) => number
}

const catalogByKey = new Map(PLANETS.map((planet) => [planet.key, planet]))
const achievements: AchievementDefinition[] = []

function addSteps(group: AchievementGroup, metric: (game: GameState) => number, steps: [number, string, string, string][]) {
  for (const [target, id, title, description] of steps) {
    achievements.push({ id, title, description, group, target, progress: metric })
  }
}

addSteps('mining', (game) => game.mined, [
  [1, 'first-rock', 'Первый раскол', 'Разрушь первый астероид.'],
  [10, 'rock-dust', 'Каменная пыль', 'Разрушь 10 астероидов.'],
  [25, 'belt-worker', 'Работа по поясу', 'Разрушь 25 астероидов.'],
  [50, 'ore-veteran', 'Рудный ветеран', 'Разрушь 50 астероидов.'],
  [100, 'rock-breaker', 'Разрушитель глыб', 'Разрушь 100 астероидов.'],
  [250, 'cosmic-miner', 'Космический шахтёр', 'Разрушь 250 астероидов.'],
  [500, 'asteroid-legend', 'Легенда пояса', 'Разрушь 500 астероидов.'],
])
addSteps('mining', (game) => game.totalClicks, [
  [100, 'steady-hand', 'Твёрдая рука', 'Нанеси 100 ударов.'],
  [1000, 'deep-driller', 'Глубокое бурение', 'Нанеси 1 000 ударов.'],
  [5000, 'tap-constellation', 'Созвездие ударов', 'Нанеси 5 000 ударов.'],
])
addSteps('cases', (game) => game.casesOpened, [
  [1, 'first-scan', 'Первое сканирование', 'Открой первый кейс.'],
  [5, 'case-curious', 'Любопытство', 'Открой 5 кейсов.'],
  [10, 'case-opener', 'Искатель миров', 'Открой 10 кейсов.'],
  [25, 'vault-reader', 'Читатель архива', 'Открой 25 кейсов.'],
])
addSteps('collection', (game) => game.collection.length, [
  [1, 'new-world', 'Новый мир', 'Найди первую планету.'],
  [5, 'small-atlas', 'Начало атласа', 'Собери 5 разных планет.'],
  [10, 'star-cartographer', 'Звёздный картограф', 'Собери 10 разных планет.'],
  [20, 'cosmic-archivist', 'Хранитель космоса', 'Собери 20 разных планет.'],
  [PLANETS.length, 'complete-catalog', 'Полный каталог', 'Собери все планеты сектора.'],
])
addSteps('collection', (game) => game.collection.filter((item) => catalogByKey.get(item.catalogKey)?.rarity === 'Rare').length, [
  [1, 'rare-signal', 'Редкий сигнал', 'Найди редкую планету.'],
])
addSteps('collection', (game) => game.collection.filter((item) => catalogByKey.get(item.catalogKey)?.rarity === 'Epic').length, [
  [1, 'violet-world', 'Фиолетовый мир', 'Найди эпическую планету.'],
])
addSteps('collection', (game) => game.collection.filter((item) => ['Legendary', 'Anomalous'].includes(catalogByKey.get(item.catalogKey)?.rarity ?? '')).length, [
  [1, 'impossible-orbit', 'Невозможная орбита', 'Найди легендарную или аномальную планету.'],
])
addSteps('exploration', (game) => game.sectorsExplored, [
  [2, 'red-nebula', 'Красная туманность', 'Открой второй сектор.'],
  [3, 'orion-field', 'Поле Ориона', 'Открой третий сектор.'],
  [5, 'void-walker', 'Путник Пустоты', 'Достигни пятого сектора.'],
])
addSteps('mining', (game) => game.destroyedAsteroidsByKind.metallic, [
  [10, 'metal-hunter', 'Охотник за металлом', 'Разруши 10 металлических астероидов.'],
])
addSteps('mining', (game) => game.destroyedAsteroidsByKind.rare, [
  [5, 'rare-rock-hunter', 'Охотник за редкостями', 'Разруши 5 редких астероидов.'],
])
addSteps('mining', (game) => game.destroyedAsteroidsByKind.anomalous, [
  [3, 'anomaly-tracker', 'Следопыт аномалий', 'Разруши 3 аномальных астероида.'],
])

export const ACHIEVEMENTS = achievements

export function getAchievementProgress(game: GameState) {
  return ACHIEVEMENTS.map((achievement) => {
    const value = Math.max(0, Math.floor(achievement.progress(game)))
    return { ...achievement, value: Math.min(achievement.target, value), unlocked: value >= achievement.target }
  })
}
