import { Check, LockKeyhole, Plus } from 'lucide-react'
import type { CollectedPlanet, PlanetTemplate, PlanetType } from '../game/types'
import { getPlanetBonusLabel } from '../game/planetBonuses'
import { t, type Language } from '../i18n'
import PlanetOrb from './PlanetOrb'

type PlanetCardProps = {
  planet: PlanetTemplate
  item?: CollectedPlanet
  onSelect: (item: CollectedPlanet) => void
  onToggleEquip: (catalogKey: string) => void
  equipped: boolean
  equipFull: boolean
  language: Language
}

const planetTypeLabels: Record<PlanetType, string> = {
  Rocky: 'Каменистая', Ocean: 'Океаническая', Desert: 'Пустынная', Ice: 'Ледяная',
  'Gas Giant': 'Газовый гигант', Volcanic: 'Вулканическая', Toxic: 'Токсичная', Anomalous: 'Аномальная',
}

export default function PlanetCard({ planet, item, onSelect, onToggleEquip, equipped, equipFull, language }: PlanetCardProps) {
  const discovered = Boolean(item)

  return <article className="planet-entry">
    <button
      type="button"
      aria-label={discovered ? `${planet.name}, ${t(language, planet.rarity)}, ${getPlanetBonusLabel(planet.effects, language)}` : `${t(language, 'Неизвестная планета')} ${planet.key}`}
      className={`planet-card ${discovered ? 'discovered' : 'undiscovered'}`}
      onClick={() => item && onSelect(item)}
      disabled={!item}
    >
      <div className="planet-card-orb"><PlanetOrb visual={planet.visual} /></div>
      <div className="planet-card-id">{item?.planetId ?? t(language, 'СИГНАТУРА ———')}</div>
      <div className="planet-card-name">{discovered ? planet.name : '???'}</div>
      <div className="planet-card-type">{discovered ? t(language, planetTypeLabels[planet.type]).toUpperCase() : t(language, 'НЕИЗВЕСТНАЯ ПЛАНЕТА')}</div>
      {discovered && <div className="planet-card-bonus" title={getPlanetBonusLabel(planet.effects, language)}>{getPlanetBonusLabel(planet.effects, language)}</div>}
      <div className="planet-card-foot">
        <span className={`rarity-${planet.rarity.toLowerCase()}`}>{t(language, planet.rarity)}</span>
        {!discovered && <span title={t(language, 'НЕ ОТКРЫТА')} aria-label={t(language, 'НЕ ОТКРЫТА')}><LockKeyhole size={12} /></span>}
      </div>
    </button>
    {item && <button type="button" className={`planet-equip-button ${equipped ? 'equipped' : ''}`} aria-pressed={equipped} disabled={!equipped && equipFull} onClick={() => onToggleEquip(planet.key)}>
      {equipped ? <Check size={13} /> : <Plus size={13} />}{t(language, equipped ? 'Снять усиление' : equipFull ? 'Слоты заняты' : 'Использовать')}
    </button>}
  </article>
}
