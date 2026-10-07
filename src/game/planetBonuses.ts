import { PLANETS } from './data'
import type { GameState, PlanetEffect, ResourceKey } from './types'

const RESOURCE_LABELS: Record<ResourceKey, { ru: string; en: string }> = {
  iron: { ru: 'железа', en: 'iron' },
  copper: { ru: 'меди', en: 'copper' },
  nickel: { ru: 'никеля', en: 'nickel' },
  silicon: { ru: 'кремния', en: 'silicon' },
}

export function getEquippedPlanetEffects(state: Pick<GameState, 'equippedPlanetKeys'>): PlanetEffect[] {
  return (state.equippedPlanetKeys ?? []).flatMap((key) => PLANETS.find((planet) => planet.key === key)?.effects ?? [])
}

export function getPlanetBonusLabel(effects: PlanetEffect[], language: 'ru' | 'en') {
  return effects.map((effect) => {
    if (effect.type === 'salvage') {
      return language === 'en'
        ? `+${effect.amount} ${RESOURCE_LABELS[effect.resource].en} every ${effect.every} asteroids`
        : `+${effect.amount} ${RESOURCE_LABELS[effect.resource].ru} каждые ${effect.every} астероида`
    }
    if (effect.type === 'double-drops') return language === 'en' ? `${effect.chance}% chance to double loot` : `Шанс удвоить добычу: ${effect.chance}%`
    if (effect.type === 'rare-asteroid') return language === 'en' ? `Rare asteroid odds +${effect.chance}%` : `Шанс редких астероидов +${effect.chance}%`
    if (effect.type === 'rare-case') return language === 'en' ? `Rare planet weight in cases +${effect.chance}%` : `Вес редких планет в кейсах +${effect.chance}%`
    if (effect.type === 'mining-damage') return language === 'en' ? `+${effect.amount} mining damage per click` : `+${effect.amount} урона за клик`
    return language === 'en' ? `+${effect.amount} relay energy per asteroid` : `+${effect.amount} энергии за астероид с ретранслятором`
  }).join(' · ')
}
