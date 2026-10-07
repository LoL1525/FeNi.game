import { useState } from 'react'
import { ArrowDown, ArrowUpRight, Atom, Box, Hammer, Layers3, LockKeyhole, Pickaxe, Radar, Recycle, Sparkles, Zap } from 'lucide-react'
import { ALLOY_COST, CONDENSER_BUILD_COST, RECYCLER_BUILD_COST, RECYCLER_RECIPES, RELAY_COST, SCANNER_COST, RESOURCES, SPECIAL_ITEMS } from '../game/data'
import { canBuildRecycler, canCraftCondenser, canCraftRelay, getCondenserClickInterval, getCondenserUpgradeCost, getDrillUpgradeCost, getRecycleCost, getRecyclerDiscount, getRecyclerUpgradeCost, RELAY_ENERGY_REQUIRED, SCANNER_DURABILITY_MAX } from '../game/engine'
import type { GameState, ResourceKey } from '../game/types'
import { t, translateTemplate, type Language } from '../i18n'
import CelestialStar, { CelestialStarShape } from './CelestialStar'
import ResourceIcon from './ResourceIcon'

type LabTab = 'workshop' | 'recycling'
type Cost = Record<string, number>

interface LabScreenProps {
  game: GameState
  language: Language
  onCraftAlloy: () => void
  onCraftScanner: () => void
  onCraftDrill: () => void
  onBuildRecycler: () => void
  onUpgradeRecycler: () => void
  onRecycleNickel: () => void
  onRecycleSilicon: () => void
  onCraftOrUpgradeCondenser: () => void
  onCraftRelay: () => void
}

function CostChips({ cost, language }: { cost: Cost; language: Language }) {
  return <div className="ingredients">{Object.entries(cost).map(([key, amount]) => {
    const isResource = key in RESOURCES
    const resource = key as ResourceKey
    const name = isResource ? t(language, RESOURCES[resource].name) : t(language, 'Сплав')
    return <span className="ingredient" key={key} title={name} aria-label={`${name}: ${amount}`}><b>{isResource ? <ResourceIcon resource={resource} size={17} /> : <Layers3 size={13} />}</b>{amount}</span>
  })}</div>
}

function RecipeCard({ icon, iconClass = '', cardClass = '', eyebrow, title, tag, description, cost, output, owned, button, disabled, onAction, language }: {
  icon: React.ReactNode
  iconClass?: string
  cardClass?: string
  eyebrow: string
  title: string
  tag: string
  description: string
  cost: Cost
  output: React.ReactNode
  owned: React.ReactNode
  button: string
  disabled: boolean
  onAction: () => void
  language: Language
}) {
  return <article className={`recipe-card ${cardClass}`}>
    <div className="recipe-top"><div className={`recipe-icon ${iconClass}`}>{icon}</div><div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2></div><span className="recipe-tag">{tag}</span></div>
    <p>{description}</p>
    <div className="recipe-flow"><CostChips cost={cost} language={language} /><ArrowUpRight size={18} /><div className="output-item">{output}</div></div>
    <div className="recipe-bottom"><span className="recipe-inventory">{owned}</span><button className="button craft-button" disabled={disabled} onClick={onAction}><Hammer size={14} /> {button}</button></div>
  </article>
}

function WorkshopBackdrop() {
  return <div className="workshop-page-backdrop" aria-hidden="true">
    <svg viewBox="0 0 1200 900" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="workshop-wall" x2="0" y2="1"><stop stopColor="#26364c" /><stop offset=".68" stopColor="#17253a" /><stop offset="1" stopColor="#332438" /></linearGradient>
        <linearGradient id="workshop-wood" x2="0" y2="1"><stop stopColor="#a7724b" /><stop offset="1" stopColor="#513642" /></linearGradient>
        <linearGradient id="workshop-metal" x2="0" y2="1"><stop stopColor="#b7c7d0" /><stop offset="1" stopColor="#53667c" /></linearGradient>
        <radialGradient id="workshop-lamp"><stop stopColor="#ffd990" stopOpacity=".8" /><stop offset="1" stopColor="#efa752" stopOpacity="0" /></radialGradient>
      </defs>
      <rect width="1200" height="900" fill="url(#workshop-wall)" />
      <path d="M0 79H1200M0 471H1200M0 727H1200" stroke="#101a2b" strokeWidth="18" opacity=".66" />
      <path d="M74 0V727M1118 0V727" stroke="#a16b49" strokeWidth="18" opacity=".52" />
      <path d="M0 82H1200M0 472H1200" stroke="#d09a62" strokeWidth="4" opacity=".5" />
      <g opacity=".48" stroke="#c08b59" strokeWidth="3">
        <path d="M715 108V407M1115 108V407M715 124H1115M715 408H1115" />
        <path d="M750 141V184M809 139V184M865 141V184M938 138V184M1002 142V184M1068 140V184" />
      </g>
      <g opacity=".8">
        <rect x="746" y="165" width="30" height="55" rx="6" fill="#3c788c" stroke="#8ccbd2" strokeWidth="4" />
        <rect x="805" y="157" width="36" height="63" rx="7" fill="#825e9c" stroke="#c7a5e7" strokeWidth="4" />
        <rect x="867" y="169" width="30" height="51" rx="5" fill="#9d633f" stroke="#e1b26e" strokeWidth="4" />
        <path d="M944 212L956 158H977L989 212Z" fill="#527e75" stroke="#9bd5b8" strokeWidth="4" />
        <rect x="1021" y="165" width="40" height="55" rx="4" fill="#425c7c" stroke="#8cb7df" strokeWidth="4" />
      </g>
      <g opacity=".7" fill="none" strokeLinecap="round">
        <path d="M744 251L781 310M781 251L744 310" stroke="#c99a68" strokeWidth="10" />
        <path d="M833 247V321M815 262H851M815 278H851" stroke="#b8c5cf" strokeWidth="8" />
        <path d="M920 252L962 310M962 252L920 310" stroke="#8ba2b7" strokeWidth="8" />
        <path d="M1027 256V310M1011 256H1043" stroke="#dfb466" strokeWidth="9" />
      </g>
      <circle cx="1060" cy="490" r="145" fill="url(#workshop-lamp)" />
      <path d="M1058 340L1035 383H1081Z" fill="#dfb669" stroke="#46374a" strokeWidth="8" />
      <path d="M1058 383V425" stroke="#46374a" strokeWidth="8" />
      <path d="M605 666H1200V900H605Z" fill="#422d3c" opacity=".75" />
      <path d="M548 664H1200V720H548Z" fill="url(#workshop-wood)" stroke="#32253a" strokeWidth="10" />
      <path d="M588 720V869M1159 720V869" stroke="#76503e" strokeWidth="28" />
      <path d="M558 746H1200" stroke="#dda46a" strokeWidth="5" opacity=".5" />
      <path d="M780 648L817 604H916L951 649L918 673H814Z" fill="url(#workshop-metal)" stroke="#293649" strokeWidth="9" />
      <path d="M837 671L849 713H887L899 671" fill="#596b7e" stroke="#293649" strokeWidth="8" />
      <path d="M1005 614L1050 552M1050 552L1082 562L1068 583L1041 574" stroke="#d6a16b" strokeWidth="13" strokeLinecap="round" />
      <path d="M738 622L762 571M762 571L788 579L782 596L759 590" stroke="#a9bdc9" strokeWidth="11" strokeLinecap="round" />
      <g fill="#e3bd7b" opacity=".8"><g className="celestial-star" data-tone="violet" transform="translate(636 572) scale(1.7)"><CelestialStarShape /></g><circle cx="1118" cy="295" r="5" /><circle cx="699" cy="341" r="4" /><circle cx="987" cy="447" r="4" /></g>
      <path d="M0 0H1200V900H0Z" fill="none" stroke="#0b0915" strokeWidth="70" opacity=".54" />
    </svg>
    <div className="workshop-page-stars"><CelestialStar className="workshop-star" tone="violet" /><CelestialStar className="workshop-star" tone="ice" /><CelestialStar className="workshop-star" tone="violet" /><CelestialStar className="workshop-star" tone="ice" /><CelestialStar className="workshop-star" tone="violet" /><CelestialStar className="workshop-star" tone="ice" /><CelestialStar className="workshop-star" tone="violet" /><CelestialStar className="workshop-star" tone="violet" /><CelestialStar className="workshop-star" tone="ice" /><CelestialStar className="workshop-star" tone="ice" /><CelestialStar className="workshop-star" tone="violet" /><CelestialStar className="workshop-star" tone="violet" /></div>
  </div>
}

export default function LabScreen({ game, language, onCraftAlloy, onCraftScanner, onCraftDrill, onBuildRecycler, onUpgradeRecycler, onRecycleNickel, onRecycleSilicon, onCraftOrUpgradeCondenser, onCraftRelay }: LabScreenProps) {
  const [tab, setTab] = useState<LabTab>('workshop')
  const tx = (text: string) => t(language, text)
  const inventory = game.inventory
  const scannerIsActive = game.scannerActive && game.scannerDurability > 0
  const scannerSpares = Math.max(0, inventory.scanner - 1)
  const drillCost = getDrillUpgradeCost(inventory.drill)
  const recyclerBuilt = inventory.recycler > 0
  const recyclerCost = recyclerBuilt ? getRecyclerUpgradeCost(inventory.recycler) : RECYCLER_BUILD_COST
  const recyclerDiscount = getRecyclerDiscount(inventory.recycler)
  const condenserCost = inventory.condenser === 0 ? CONDENSER_BUILD_COST : getCondenserUpgradeCost(inventory.condenser)
  const nextCondenserInterval = getCondenserClickInterval(inventory.condenser + 1)
  const condenserInterval = getCondenserClickInterval(inventory.condenser)
  return <div className="page-content secondary-page workshop-page">
    <WorkshopBackdrop />
    <div className="page-heading"><div><div className="eyebrow">{tx('МАСТЕРСКАЯ')} <span className="eyebrow-divider">/</span> {game.sectorsExplored < 2 ? 'SOLAR FRINGE' : `${tx('СЕКТОР')} ${String(game.sectorsExplored).padStart(2, '0')}`}</div><h1>{tx('Мастерская')}</h1><p>{tx('Создавай оборудование и перерабатывай добытые материалы.')}</p></div><span className="archive-count"><Hammer size={16} /> {inventory.alloy} {tx('СПЛАВ')} <span className="archive-separator">·</span> {inventory.scanner} {tx('СКАНЕРЫ')} <span className="archive-separator">·</span> {tx('БУР')} {inventory.drill} / {game.sectorsExplored}</span></div>

    <div className="workshop-tabs" role="tablist" aria-label={tx('Раздел мастерской')}>
      <button role="tab" aria-selected={tab === 'workshop'} className={tab === 'workshop' ? 'workshop-tab active' : 'workshop-tab'} onClick={() => setTab('workshop')}><Atom size={14} /> {tx('Станки и улучшения')}</button>
      <button role="tab" aria-selected={tab === 'recycling'} className={tab === 'recycling' ? 'workshop-tab active' : 'workshop-tab'} disabled={!recyclerBuilt} title={recyclerBuilt ? tx('Открыть переработку') : tx('Сначала собери переработчик в мастерской')} onClick={() => setTab('recycling')}><Recycle size={14} /> {tx('Переработка')} {!recyclerBuilt && <LockKeyhole size={12} />}</button>
    </div>

    {tab === 'workshop' ? <>
      <div className="lab-grid">
        <RecipeCard icon={<Layers3 size={21} />} iconClass="alloy-icon" eyebrow={tx('БАЗОВЫЙ РЕЦЕПТ')} title={tx('Минеральный сплав')} tag={tx('МАТЕРИАЛ')} description={tx('Объедини распространённые минералы в прочный сплав.')} cost={ALLOY_COST} output={<><Layers3 size={17} /><b>{tx('Сплав')} <span>×1</span></b></>} owned={<>{tx('В наличии')} <b>{inventory.alloy}</b></>} disabled={inventory.iron < ALLOY_COST.iron || inventory.copper < ALLOY_COST.copper || inventory.silicon < ALLOY_COST.silicon} onAction={onCraftAlloy} button={tx('Создать сплав')} language={language} />
        <RecipeCard icon={<Radar size={21} />} iconClass="scanner-icon" eyebrow={tx('УЛУЧШЕННЫЙ РЕЦЕПТ')} title={tx('Улучшенный сканер')} tag={tx('РЕДКИЙ ИНСТРУМЕНТ')} description={tx('Повышает шанс встретить редкие астероиды и планеты.')} cost={{ alloy: SCANNER_COST.alloy, nickel: SCANNER_COST.nickel }} output={<><Radar size={17} /><b>{tx('Сканер')} <span>×1</span></b></>} owned={<>{tx('В наличии')} <b>{inventory.scanner}</b></>} disabled={inventory.alloy < SCANNER_COST.alloy || inventory.nickel < SCANNER_COST.nickel} onAction={onCraftScanner} button={tx('Создать сканер')} language={language} />
        <RecipeCard icon={<Pickaxe size={21} />} iconClass="drill-icon" eyebrow={translateTemplate(language, 'БУР · УРОВЕНЬ {0}', inventory.drill + 1)} title={tx('Усилитель бура')} tag={tx('+1 СИЛА')} description={translateTemplate(language, 'Каждый уровень добавляет +1 к урону. В секторе доступно до {0} уровней.', game.sectorsExplored)} cost={drillCost} output={<><Pickaxe size={17} /><b>{tx('Сила удара')} <span>{1 + inventory.drill} → {2 + inventory.drill}</span></b></>} owned={<>{tx('Уровень')} <b>{inventory.drill}</b> · {tx('сила')} <b>{1 + inventory.drill}</b></>} disabled={inventory.drill >= game.sectorsExplored || inventory.iron < drillCost.iron || inventory.copper < drillCost.copper || inventory.nickel < drillCost.nickel || inventory.silicon < drillCost.silicon} onAction={onCraftDrill} button={tx(inventory.drill >= game.sectorsExplored ? 'Нужен новый сектор' : 'Улучшить бур')} language={language} />
        <RecipeCard icon={<Recycle size={21} />} iconClass="recycler-icon" eyebrow={recyclerBuilt ? translateTemplate(language, 'ПЕРЕРАБОТЧИК · УРОВЕНЬ {0}', inventory.recycler) : tx('СБОРКА СТАНКА')} title={tx('Переработчик')} tag={recyclerBuilt ? `${recyclerDiscount}% ${tx('СКИДКА')}` : tx('ОЧЕНЬ ДОРОГО')} description={recyclerBuilt ? translateTemplate(language, 'Снижает затраты на обработку материалов. Скидка {0}%, максимум 80%.', recyclerDiscount) : tx('Собери станок, чтобы открыть отдельную вкладку переработки. В первом секторе это дорого.')} cost={recyclerCost} output={<><Recycle size={17} /><b>{recyclerBuilt ? `${tx('Переработка')} · −${Math.min(80, recyclerDiscount + 20)}%` : tx('Переработка')}</b></>} owned={recyclerBuilt ? <>{tx('Уровень')} <b>{inventory.recycler} / {game.sectorsExplored}</b></> : tx('Требует редкие материалы и сплавы')} disabled={recyclerBuilt ? inventory.recycler >= game.sectorsExplored || inventory.iron < recyclerCost.iron || inventory.copper < recyclerCost.copper || inventory.nickel < recyclerCost.nickel || inventory.silicon < recyclerCost.silicon : !canBuildRecycler(game)} onAction={recyclerBuilt ? onUpgradeRecycler : onBuildRecycler} button={tx(recyclerBuilt ? inventory.recycler >= game.sectorsExplored ? 'Нужен новый сектор' : 'Улучшить станок' : 'Собрать станок')} language={language} />
        <RecipeCard icon={<Zap size={21} />} iconClass="condenser-icon" cardClass="condenser-recipe-card" eyebrow={inventory.condenser ? translateTemplate(language, 'КОНДЕНСАТОР · УРОВЕНЬ {0}', inventory.condenser) : tx('НОВОЕ ОБОРУДОВАНИЕ')} title={tx('Импульсный конденсатор')} tag={inventory.condenser ? translateTemplate(language, 'РАЗ В {0} УДАРОВ', condenserInterval) : tx('БОНУСНЫЙ УДАР')} description={inventory.condenser ? translateTemplate(language, 'Каждый {0}-й клик наносит +1 урон. Следующий уровень: раз в {1} кликов.', condenserInterval, nextCondenserInterval) : tx('Накопи клики: каждый 7-й удар получает +1 урон. Улучшение сокращает интервал на один клик.')} cost={condenserCost} output={<><Zap size={17} /><b>{tx('Бонусный удар')} <span>+1</span></b></>} owned={inventory.condenser ? <>{tx('Уровень')} <b>{inventory.condenser} / {game.sectorsExplored}</b> · {tx('заряд')} <b>{game.condenserCharge}/{condenserInterval}</b></> : tx('Не установлен')} disabled={!canCraftCondenser(game)} onAction={onCraftOrUpgradeCondenser} button={tx(inventory.condenser ? inventory.condenser >= game.sectorsExplored ? 'Нужен новый сектор' : 'Улучшить конденсатор' : 'Собрать конденсатор')} language={language} />
        {game.sectorsExplored === 4 && <RecipeCard icon={<Zap size={21} />} iconClass="relay-icon" eyebrow={tx('ТЕХНОЛОГИЯ ЗАБЫТЫХ СИСТЕМ')} title={tx(SPECIAL_ITEMS.relay.name)} tag={tx('НОВАЯ ФУНКЦИЯ · СЕКТОР 04')} description={tx('Обычные и металлические астероиды дают +10 энергии, редкие, ледяные, кристаллические и вулканические +15, аномальные +20. Для перехода нужно 250.')} cost={RELAY_COST} output={<><Zap size={17} /><b>{tx('Ретранслятор')} <span>×1</span></b></>} owned={inventory.relay > 0 ? <>{tx('Собран')} · {tx('Энергия')} <b>{game.relayEnergy ?? 0} / {RELAY_ENERGY_REQUIRED}</b></> : tx('Не собран')} disabled={!canCraftRelay(game)} onAction={onCraftRelay} button={tx(inventory.relay > 0 ? 'Уже собрано' : 'Собрать ретранслятор')} language={language} />}
      </div>
      <div className={`scanner-status ${scannerIsActive ? 'scanner-enabled' : ''}`}><span className="scanner-status-icon"><Radar size={17} /></span><span><b>{tx(scannerIsActive ? 'Сканер готов' : 'Сканер не установлен')}</b><small>{scannerIsActive ? translateTemplate(language, 'Осталось: {0}/{1} астероидов · запас: {2}', game.scannerDurability, SCANNER_DURABILITY_MAX, scannerSpares) : tx('Создай улучшенный сканер, чтобы чаще находить редкие объекты.')}</small>{scannerIsActive && <span className={`scanner-durability-track ${game.scannerDurability <= SCANNER_DURABILITY_MAX / 4 ? 'scanner-durability-low' : ''}`} role="progressbar" aria-label={tx('Прочность сканера')} aria-valuemin={0} aria-valuemax={SCANNER_DURABILITY_MAX} aria-valuenow={game.scannerDurability}><i style={{ width: `${game.scannerDurability / SCANNER_DURABILITY_MAX * 100}%` }} /></span>}</span><span className="scanner-status-end">{tx(scannerIsActive ? 'РАБОТАЕТ' : 'НЕ АКТИВЕН')}</span></div>
    </> : <div className="recycling-screen">
      <div className="recycler-overview"><span className="recycler-overview-icon"><Recycle size={19} /></span><div><span className="eyebrow">{tx('СТАНОК УРОВНЯ')} {inventory.recycler}</span><b>{tx('Скидка на переработку: {0}%').replace('{0}', String(recyclerDiscount))}</b></div><span className="recycler-discount">−{recyclerDiscount}%</span></div>
      <div className="recycle-recipes">
        {(['nickel', 'silicon'] as const).map((resource) => {
          const recipe = RECYCLER_RECIPES[resource]
          const cost = getRecycleCost(resource, inventory.recycler)
          const enough = inventory.iron >= cost.iron && inventory.copper >= cost.copper
          return <article className="recycle-card" key={resource}>
            <div className="recycle-card-heading"><div className={`recipe-icon ${resource === 'nickel' ? 'scanner-icon' : 'alloy-icon'}`}>{resource === 'nickel' ? <Sparkles size={20} /> : <Atom size={20} />}</div><div><span className="eyebrow">{tx('ПЕРЕРАБОТКА РУДЫ')}</span><h2>{tx(RESOURCES[resource].name)}</h2></div></div>
            <div className="recycle-flow"><CostChips cost={cost} language={language} /><ArrowDown size={18} /><span className="recycle-output"><b style={{ color: RESOURCES[resource].color }}><ResourceIcon resource={resource} size={19} /> +{recipe.output}</b><small>{tx('Сейчас:')} {inventory[resource]}</small></span></div>
            <div className="recycle-price"><span>{tx('ЗАТРАТЫ ЗА 1 ПАРТИЮ')}</span><b><span><ResourceIcon resource="iron" size={16} /> {cost.iron}</span><i>+</i><span><ResourceIcon resource="copper" size={16} /> {cost.copper}</span></b></div>
            <button className="button recycle-button" disabled={!enough} onClick={resource === 'nickel' ? onRecycleNickel : onRecycleSilicon}><Recycle size={15} /> {tx('Переработать в')} {tx(RESOURCES[resource].name)}</button>
          </article>
        })}
      </div>
      <div className="recycling-note"><Box size={15} /><span>{tx('В обычных астероидах редких материалов нет. Никель и кремний добываются из металлических, редких и аномальных астероидов или перерабатываются здесь.')}</span></div>
    </div>}
  </div>
}
