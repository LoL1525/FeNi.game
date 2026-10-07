import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { useClient } from '@solana/react'
import { useConnectedWallet, useSignMessage } from '@solana/kit-plugin-wallet/react'
import { ArrowUpRight, Atom, Award, Box, Check, ChevronRight, Compass, Languages, Layers3, LockKeyhole, Orbit, Pickaxe, Plus, Radar, Recycle, Sparkles, WalletCards, X, MoreHorizontal, Zap } from 'lucide-react'
import { ADVANCED_CASE_COST, ASTEROIDS, CASE_COST, PLANETS, RESOURCES, rollAsteroid, SECTORS, SECTOR_TRAVEL_REQUIREMENTS, SPECIAL_ITEMS } from './game/data'
import { canOpenAdvancedCase, canOpenBasicCase, canTravelToNextSector, getEquippedMiningDamage, getEquippedRareAsteroidChance, getPlanetSlotCount, getSectorUpgradeProgress, RELAY_ENERGY_REQUIRED, INITIAL_GAME_STATE } from './game/engine'
import { getPlanetBonusLabel } from './game/planetBonuses'
import { GameApiError, linkWalletToGame, loadGuestGame, sendGameAction, submitPlanetNftClaim, type ActionSnapshot, type ServerAction } from './game/serverApi'
import type { Asteroid, AsteroidKind, CollectedPlanet, GameState, PlanetType, ResourceKey, Screen } from './game/types'
import WalletButton from './components/WalletButton'
import PlanetCard from './components/PlanetCard'
import PlanetOrb from './components/PlanetOrb'
import ResourceIcon from './components/ResourceIcon'
import LabScreen from './components/LabScreen'
import AchievementsScreen from './components/AchievementsScreen'
import MiniQuests from './components/MiniQuests'
import AsteroidSprite from './components/AsteroidSprite'
import SectorMapArtwork from './components/SectorMapArtwork'
import CelestialStar from './components/CelestialStar'
import { getNftMetadataUri } from './solana/metadata'
import type { SolanaAppClient } from './solana/client'
import { t, type Language } from './i18n'
import './App.css'

const NAV: { id: Screen; label: string; icon: typeof Pickaxe }[] = [
  { id: 'mining', label: 'Добыча', icon: Pickaxe },
  { id: 'cases', label: 'Кейсы', icon: Box },
  { id: 'collection', label: 'Коллекция', icon: Orbit },
]
const MORE_NAV: { id: Screen; label: string; icon: typeof Pickaxe }[] = [
  { id: 'lab', label: 'Мастерская', icon: Atom },
  { id: 'map', label: 'Карта космоса', icon: Compass },
  { id: 'achievements', label: 'Достижения', icon: Award },
]
const SECTOR_ROUTES = [[0, 1], [1, 2], [2, 3], [3, 4]] as const
const MAP_PLANET_MARKERS = [
  { visual: 'ice', left: '28%', top: '14%' },
  { visual: 'rocky', left: '23%', top: '69%' },
  { visual: 'gas', left: '60%', top: '76%' },
  { visual: 'ocean', left: '61%', top: '15%' },
  { visual: 'desert', left: '80%', top: '16%' },
  { visual: 'volcanic', left: '94%', top: '77%' },
] as const
type CaseReveal = { planet: CollectedPlanet; duplicate: boolean; compensation: Partial<Record<ResourceKey, number>> }
type PlanetFilter = 'all' | 'lessRare' | 'rare' | 'owned'

function rarityClass(rarity: string) { return `rarity-${rarity.toLowerCase()}` }

function pendingPlanetMintKey(wallet: string, planetUid: string) { return `feni-pending-planet-nft-v1:${wallet}:${planetUid}` }

function readPendingPlanetMint(wallet: string, planetUid: string) {
  try {
    const value = JSON.parse(sessionStorage.getItem(pendingPlanetMintKey(wallet, planetUid)) ?? 'null') as { mintAddress?: unknown; signature?: unknown } | null
    return value && typeof value.mintAddress === 'string' && typeof value.signature === 'string'
      ? { mintAddress: value.mintAddress, signature: value.signature }
      : null
  } catch { return null }
}

const GLOBAL_STAR_TONES = ['ice', 'violet', 'ice', 'violet', 'ice', 'violet', 'violet', 'ice', 'ice', 'violet', 'violet', 'ice'] as const
function GlobalStarfield() {
  return <div className="global-starfield" aria-hidden="true">{GLOBAL_STAR_TONES.map((tone, index) => <CelestialStar key={index} className={'global-star global-star-' + (index + 1)} tone={tone} />)}</div>
}

const PLANET_TYPE_LABELS: Record<PlanetType, string> = {
  Rocky: 'Каменистая', Ocean: 'Океаническая', Desert: 'Пустынная', Ice: 'Ледяная',
  'Gas Giant': 'Газовый гигант', Volcanic: 'Вулканическая', Toxic: 'Токсичная', Anomalous: 'Аномальная',
}
const PLANET_RESOURCE_LABELS: Record<string, string> = {
  Iron: 'Железо', Copper: 'Медь', Nickel: 'Никель', Silicon: 'Кремний', Water: 'Вода',
  Ice: 'Лёд', Sulfur: 'Сера', Hydrogen: 'Водород', Helium: 'Гелий', Gold: 'Золото', Crystal: 'Кристалл', Unknown: 'Неизвестный материал',
}
function planetTypeLabel(type: PlanetType, language: Language) { return t(language, PLANET_TYPE_LABELS[type]) }
function planetResourceLabel(resource: string, language: Language) { return t(language, PLANET_RESOURCE_LABELS[resource] ?? resource) }

function ResourcePill({ resource, amount, language }: { resource: ResourceKey; amount: number; language: Language }) {
  const detail = RESOURCES[resource]
  return <div className="resource-pill" title={`${t(language, detail.name)}: ${amount.toLocaleString()}`} aria-label={`${t(language, detail.name)}, ${amount.toLocaleString()}`}><ResourceIcon resource={resource} size={28} /><span className="resource-name">{t(language, detail.name)}</span><strong>{amount.toLocaleString()}</strong></div>
}

function AsteroidArt({ kind, hp, damage, hit, active, language }: { kind: AsteroidKind; hp: number; damage: number; hit: () => number; active: boolean; language: Language }) {
  const [hitFlash, setHitFlash] = useState(false)
  const [hitCount, setHitCount] = useState(0)
  const [hitDamage, setHitDamage] = useState(damage)
  const [pulseFlash, setPulseFlash] = useState(false)
  const flashTimeout = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(flashTimeout.current), [])
  const onHit = () => {
    if (!active) return
    const actualDamage = hit()
    setHitDamage(actualDamage)
    setPulseFlash(actualDamage > damage)
    setHitCount((count) => count + 1)
    setHitFlash(true)
    window.clearTimeout(flashTimeout.current)
    flashTimeout.current = window.setTimeout(() => { setHitFlash(false); setPulseFlash(false) }, 350)
  }
  return <button aria-label={`${t(language, 'Добыть астероид')}: ${t(language, ASTEROIDS[kind].name)}. ${t(language, 'ПРОЧНОСТЬ')}: ${hp}`} className={`asteroid-hit ${hitFlash ? 'hit-flash' : ''} asteroid-${kind}`} onClick={onHit} disabled={!active}>
    <span className={`hit-feedback ${pulseFlash ? 'pulse-feedback' : ''}`} key={hitCount}>{pulseFlash && '⚡ '}−{hitDamage}</span>
    {hitCount > 0 && <span className="asteroid-hit-burst" key={`burst-${hitCount}`} aria-hidden="true">{Array.from({ length: 8 }, (_, index) => <i className={`ore-shard shard-${index + 1}`} key={index} style={{ '--shard-angle': `${index * 45 + hitCount * 11}deg` } as CSSProperties} />)}<CelestialStar className="burst-star star-a" tone="violet" /><CelestialStar className="burst-star star-b" tone="ice" /><CelestialStar className="burst-star star-c" tone="violet" /></span>}
    <span className="asteroid-glow" />
    <AsteroidSprite kind={kind} />
    <span className="asteroid-ring ring-a" /><span className="asteroid-ring ring-b" />
  </button>
}

function CaseChest({ advanced, opening }: { advanced: boolean; opening: boolean }) {
  return <div className={`case-chest ${advanced ? 'case-chest-advanced' : ''} ${opening ? 'is-opening' : ''}`} aria-hidden="true">
    <span className="case-chest-aura" />
    <CelestialStar className="case-chest-spark spark-one" tone="violet" /><CelestialStar className="case-chest-spark spark-two" tone="violet" /><CelestialStar className="case-chest-spark spark-three" tone="violet" />
    <span className="case-chest-shadow" />
    <div className="case-chest-lid"><i /><b /></div>
    <div className="case-chest-body"><span className="case-chest-band" /><span className="case-chest-lock"><i /></span><span className="case-chest-rivet rivet-left" /><span className="case-chest-rivet rivet-right" /></div>
  </div>
}

function App() {
  const solanaClient = useClient<SolanaAppClient>()
  const connectedWallet = useConnectedWallet(solanaClient)
  const signMessage = useSignMessage(solanaClient)
  const signMessageRef = useRef(signMessage.dispatchAsync)
  signMessageRef.current = signMessage.dispatchAsync
  const [game, setGame] = useState<GameState>(() => structuredClone(INITIAL_GAME_STATE))
  const [language, setLanguage] = useState<Language>(() => localStorage.getItem('feni-language') === 'en' ? 'en' : 'ru')
  const tx = (text: string) => t(language, text)
  const [screen, setScreen] = useState<Screen>('mining')
  const [asteroid, setAsteroid] = useState<Asteroid>(() => rollAsteroid(Math.random, game.scannerActive, game.sectorsExplored, Date.now(), getEquippedRareAsteroidChance(game)))
  const [asteroidVisible, setAsteroidVisible] = useState(true)
  const asteroidRef = useRef(asteroid)
  const asteroidVisibleRef = useRef(asteroidVisible)
  const [searching, setSearching] = useState(false)
  const [toast, setToast] = useState('')
  const [lootPopup, setLootPopup] = useState<{ id: number; drops: Partial<Record<ResourceKey, number>>; energy: number } | null>(null)
  const [reveal, setReveal] = useState<CaseReveal | null>(null)
  const [selectedPlanet, setSelectedPlanet] = useState<CollectedPlanet | null>(null)
  const [caseOpening, setCaseOpening] = useState(false)
  const [selectedCase, setSelectedCase] = useState<'basic' | 'advanced'>('basic')
  const [planetFilter, setPlanetFilter] = useState<PlanetFilter>('all')
  const [moreOpen, setMoreOpen] = useState(false)
  const [claimingPlanetUid, setClaimingPlanetUid] = useState('')
  const [claimError, setClaimError] = useState('')
  const [gameReady, setGameReady] = useState(false)
  const [authPending, setAuthPending] = useState(true)
  const [authError, setAuthError] = useState('')
  const [authRetry, setAuthRetry] = useState(0)
  const [linkedWallets, setLinkedWallets] = useState<string[]>([])
  const [linkingWallet, setLinkingWallet] = useState(false)
  const [actionBusy, setActionBusy] = useState(false)
  const resetTimer = useRef<number | undefined>(undefined)
  const toastTimer = useRef<number | undefined>(undefined)
  const lootPopupTimer = useRef<number | undefined>(undefined)
  const actionLock = useRef(false)
  const mineClickQueue = useRef<number[]>([])
  const mineQueueRunning = useRef(false)
  const drainMineQueueRef = useRef<() => void>(() => {})

  useEffect(() => { localStorage.setItem('feni-language', language); document.documentElement.lang = language }, [language])
  useEffect(() => () => { window.clearTimeout(resetTimer.current); window.clearTimeout(toastTimer.current); window.clearTimeout(lootPopupTimer.current) }, [])

  const notify = useCallback((message: string) => {
    setToast(message)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(''), 2600)
  }, [])

  const walletAddress = connectedWallet?.account.address ?? ''
  useEffect(() => {
    let cancelled = false
    setGameReady(false)
    setAuthError('')
    setReveal(null)
    setSelectedPlanet(null)
    setMoreOpen(false)
    setGame(structuredClone(INITIAL_GAME_STATE))
    const startingAsteroid = rollAsteroid(Math.random, false, 1)
    asteroidRef.current = startingAsteroid
    setAsteroid(startingAsteroid)
    asteroidVisibleRef.current = true
    setAsteroidVisible(true)
    setAuthPending(true)
    void loadGuestGame().then((snapshot) => {
      if (cancelled) return
      setGame(snapshot.state)
      asteroidRef.current = snapshot.asteroid
      setAsteroid(snapshot.asteroid)
      setLinkedWallets(snapshot.wallets ?? [])
      setGameReady(true)
    }).catch((error: unknown) => {
      if (!cancelled) setAuthError(error instanceof Error ? error.message : String(error))
    }).finally(() => {
      if (!cancelled) setAuthPending(false)
    })
    return () => { cancelled = true }
  }, [authRetry])

  const linkCurrentWallet = async () => {
    if (!walletAddress || linkingWallet) return
    setLinkingWallet(true)
    try {
      const snapshot = await linkWalletToGame(walletAddress, async (message) => new Uint8Array(await signMessageRef.current(message)))
      setGame(snapshot.state)
      asteroidRef.current = snapshot.asteroid
      setAsteroid(snapshot.asteroid)
      setLinkedWallets(snapshot.wallets ?? [])
      notify(language === 'en' ? 'Wallet linked to this game save' : 'Кошелёк привязан к этому сохранению')
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      notify(language === 'en' ? `Could not link wallet: ${message}` : `Не удалось привязать кошелёк: ${message}`)
    } finally {
      setLinkingWallet(false)
    }
  }

  const drainMineQueue = async () => {
    if (mineQueueRunning.current || actionLock.current || !gameReady) return
    mineQueueRunning.current = true
    try {
      while (mineClickQueue.current.length > 0) {
        const targetAsteroidId = mineClickQueue.current[0]
        if (actionLock.current) break
        if (!asteroidVisibleRef.current || targetAsteroidId !== asteroidRef.current.id) {
          mineClickQueue.current = []
          break
        }
        mineClickQueue.current.shift()
        actionLock.current = true
        setActionBusy(true)
        try {
          const snapshot = await sendGameAction('mine')
          setGame(snapshot.state)
          asteroidRef.current = snapshot.asteroid
          setAsteroid(snapshot.asteroid)
          if (!snapshot.result?.destroyed) continue

          // Any remaining queued clicks were aimed at the asteroid just destroyed.
          mineClickQueue.current = []
          if (game.scannerActive && !snapshot.state.scannerActive) notify(language === 'en' ? 'Scanner worn out · craft another in the workshop' : 'Сканер износился · собери новый в мастерской')
          asteroidVisibleRef.current = false
          setAsteroidVisible(false)
          window.clearTimeout(lootPopupTimer.current)
          setLootPopup((current) => ({ id: (current?.id ?? 0) + 1, drops: snapshot.result?.drops ?? {}, energy: snapshot.result?.energy ?? 0 }))
          lootPopupTimer.current = window.setTimeout(() => setLootPopup(null), 2800)
          window.clearTimeout(resetTimer.current)
          resetTimer.current = window.setTimeout(() => {
            setSearching(true)
            resetTimer.current = window.setTimeout(() => {
              setSearching(false)
              asteroidVisibleRef.current = true
              setAsteroidVisible(true)
            }, 850)
          }, 650)
          break
        } catch (error) {
          mineClickQueue.current = []
          const message = error instanceof Error ? error.message : String(error)
          if (error instanceof GameApiError && error.status === 401) {
            setGameReady(false)
            setAuthRetry((retry) => retry + 1)
          } else {
            notify(language === 'en' ? `Game server error: ${message}` : `Ошибка игрового сервера: ${message}`)
          }
          break
        } finally {
          actionLock.current = false
          setActionBusy(false)
        }
      }
    } finally {
      mineQueueRunning.current = false
      if (mineClickQueue.current.length > 0 && !actionLock.current && gameReady) void drainMineQueueRef.current()
    }
  }
  drainMineQueueRef.current = () => { void drainMineQueue() }

  const performServerAction = async (action: ServerAction, args: Record<string, string> = {}): Promise<ActionSnapshot | null> => {
    if (!gameReady || actionLock.current) return null
    actionLock.current = true
    setActionBusy(true)
    try {
      const snapshot = await sendGameAction(action, args)
      setGame(snapshot.state)
      asteroidRef.current = snapshot.asteroid
      setAsteroid(snapshot.asteroid)
      return snapshot
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (error instanceof GameApiError && error.status === 401) {
        setGameReady(false)
        setAuthRetry((retry) => retry + 1)
        return null
      }
      notify(language === 'en' ? `Game server error: ${message}` : `Ошибка игрового сервера: ${message}`)
      return null
    } finally {
      actionLock.current = false
      setActionBusy(false)
      if (mineClickQueue.current.length > 0) void drainMineQueueRef.current()
    }
  }

  const mine = () => {
    if (!asteroidVisibleRef.current || !gameReady) return 0
    mineClickQueue.current.push(asteroidRef.current.id)
    void drainMineQueueRef.current()
    const estimatedDamage = miningPower + Number(game.inventory.condenser > 0 && game.condenserCharge + 1 >= Math.max(3, 8 - game.inventory.condenser))
    return estimatedDamage
  }

  const openCase = async () => {
    if (caseOpening || actionBusy) return
    const snapshot = await performServerAction(selectedCase === 'basic' ? 'open-basic-case' : 'open-advanced-case')
    if (!snapshot?.result?.planet) return
    setCaseOpening(true)
    window.setTimeout(() => { setReveal({ planet: snapshot.result!.planet!, duplicate: Boolean(snapshot.result?.duplicate), compensation: snapshot.result?.compensation ?? {} }); setCaseOpening(false) }, 1250)
  }

  const claimQuest = async (id: string) => {
    const quest = game.quests.find((entry) => entry.id === id)
    const snapshot = await performServerAction('claim-quest', { id })
    if (!snapshot || !quest) return
    const rewardText = Object.entries(quest?.reward ?? {}).map(([key, amount]) => `+${amount} ${tx(RESOURCES[key as ResourceKey].name)}`).join(' · ')
    notify(language === 'en' ? `Contract complete · ${rewardText}` : `Задание выполнено · ${rewardText}`)
  }

  const doCraftAlloy = async () => {
    const snapshot = await performServerAction('craft-alloy')
    if (!snapshot) return
    notify(language === 'en' ? 'Alloy crafted · ready in the lab' : 'Сплав создан · готов к использованию в лаборатории')
  }
  const doCraftScanner = async () => {
    if (!await performServerAction('craft-scanner')) return
    notify(language === 'en' ? 'Scanner calibrated · rare finds are more likely' : 'Сканер откалиброван · шанс редких находок повышен')
  }

  const doCraftDrill = async () => {
    const snapshot = await performServerAction('craft-drill')
    if (!snapshot) return
    notify(language === 'en' ? `Drill upgraded to level ${snapshot.state.inventory.drill} · power ${snapshot.state.inventory.drill + 1}` : `Бур улучшен до уровня ${snapshot.state.inventory.drill} · сила удара ${snapshot.state.inventory.drill + 1}`)
  }

  const doBuildRecycler = async () => {
    if (!await performServerAction('build-recycler')) return
    notify(language === 'en' ? 'Recycler built · refining unlocked' : 'Переработчик собран · вкладка переработки открыта')
  }

  const doUpgradeRecycler = async () => {
    const snapshot = await performServerAction('upgrade-recycler')
    if (!snapshot) return
    notify(language === 'en' ? `Recycler upgraded · ${Math.min(80, (snapshot.state.inventory.recycler - 1) * 20)}% discount` : `Переработчик улучшен · скидка теперь ${Math.min(80, (snapshot.state.inventory.recycler - 1) * 20)}%`)
  }

  const doRecycle = async (resource: 'nickel' | 'silicon') => {
    if (!await performServerAction(resource === 'nickel' ? 'recycle-nickel' : 'recycle-silicon')) return
    notify(language === 'en' ? `Refined · +3 ${tx(RESOURCES[resource].name)}` : `Переработка завершена · +3 ${tx(RESOURCES[resource].name)}`)
  }

  const doCraftOrUpgradeCondenser = async () => {
    const snapshot = await performServerAction('craft-condenser')
    if (!snapshot) return
    const interval = Math.max(3, 8 - snapshot.state.inventory.condenser)
    notify(language === 'en' ? `Condenser Lv. ${snapshot.state.inventory.condenser} · pulse every ${interval} hits` : `Конденсатор · уровень ${snapshot.state.inventory.condenser} · импульс раз в ${interval} кликов`)
  }

  const doCraftRelay = async () => {
    if (!await performServerAction('craft-relay')) return
    notify(language === 'en' ? 'Ancient relay assembled · destroy asteroids in sector 4 to charge it' : 'Древний ретранслятор собран · разрушай астероиды в секторе 4, чтобы накопить энергию')
  }

  const doTravelToNextSector = async () => {
    const snapshot = await performServerAction('travel')
    if (!snapshot) return
    window.clearTimeout(resetTimer.current)
    setSearching(false)
    asteroidVisibleRef.current = true
    setAsteroidVisible(true)
    notify(language === 'en' ? `Sector unlocked · ${SECTORS[snapshot.state.sectorsExplored - 1].name}` : `Новый сектор открыт · ${SECTORS[snapshot.state.sectorsExplored - 1].name}`)
  }

  const doTogglePlanetEquip = async (catalogKey: string) => {
    const snapshot = await performServerAction('toggle-planet', { catalogKey })
    if (!snapshot) return
    const isEquipped = snapshot.state.equippedPlanetKeys.includes(catalogKey)
    const planetName = PLANETS.find((planet) => planet.key === catalogKey)?.name ?? catalogKey
    notify(language === 'en' ? `${planetName} ${isEquipped ? 'equipped · bonus active' : 'unequipped'}` : `${planetName} ${isEquipped ? 'установлена · бонус активен' : 'снята'}`)
  }

  const doClaimPlanet = async (item: CollectedPlanet, planetName: string) => {
    if (item.onChain || !connectedWallet?.signer || claimingPlanetUid) return
    const claimWallet = connectedWallet.account.address
    if (!linkedWallets.includes(claimWallet)) {
      notify(language === 'en' ? 'Link this wallet to your guest save first' : 'Сначала привяжи кошелёк к гостевому сохранению')
      return
    }
    const metadataUri = getNftMetadataUri(item.catalogKey)
    if (!metadataUri) {
      setClaimError(tx('Для NFT сначала опубликуй сайт и укажи VITE_PUBLIC_URL в .env.'))
      return
    }
    setClaimingPlanetUid(item.uid)
    setClaimError('')
    try {
      let minted = readPendingPlanetMint(claimWallet, item.uid)
      if (!minted) {
        const { mintPlanetCollectible } = await import('./solana/claims')
        minted = await mintPlanetCollectible(solanaClient, connectedWallet.signer, claimWallet, item, planetName, metadataUri)
        sessionStorage.setItem(pendingPlanetMintKey(claimWallet, item.uid), JSON.stringify(minted))
      }
      const snapshot = await submitPlanetNftClaim(claimWallet, item.uid, minted.mintAddress, minted.signature)
      const claimedPlanet = snapshot.state.collection.find((planet) => planet.uid === item.uid)
      if (!claimedPlanet?.onChain) throw new Error('The server did not confirm the NFT claim.')
      setGame(snapshot.state)
      setSelectedPlanet(claimedPlanet)
      sessionStorage.removeItem(pendingPlanetMintKey(claimWallet, item.uid))
      notify(language === 'en' ? 'Planet NFT minted on Solana Devnet' : 'NFT планеты выпущен в Solana Devnet')
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      setClaimError(message.length > 180 ? `${message.slice(0, 177)}…` : message)
    } finally {
      setClaimingPlanetUid('')
    }
  }

  const collectionCount = game.collection.length
  const ownedPlanetKeys = new Set(game.collection.map((item) => item.catalogKey))
  const filteredPlanets = PLANETS.filter((planet) => {
    if (planetFilter === 'lessRare') return planet.rarity === 'Common' || planet.rarity === 'Uncommon'
    if (planetFilter === 'rare') return ['Rare', 'Epic', 'Legendary', 'Anomalous'].includes(planet.rarity)
    if (planetFilter === 'owned') return ownedPlanetKeys.has(planet.key)
    return true
  })
  const activeSectorIndex = Math.min(Math.max(game.sectorsExplored - 1, 0), SECTORS.length - 1)
  const activeSector = SECTORS[activeSectorIndex]
  const nextSector = SECTORS[activeSectorIndex + 1]
  const travelRequirement = SECTOR_TRAVEL_REQUIREMENTS[activeSectorIndex]
  const isRelayGate = activeSectorIndex === 3
  const relayEnergy = Math.min(RELAY_ENERGY_REQUIRED, game.relayEnergy ?? 0)
  const sectorUpgrades = getSectorUpgradeProgress(game)
  const sectorUpgradesComplete = sectorUpgrades.every((upgrade) => upgrade.complete)
  const miningPower = 1 + game.inventory.drill + getEquippedMiningDamage(game)
  const caseCost = selectedCase === 'basic' ? CASE_COST : ADVANCED_CASE_COST
  const caseCanOpen = selectedCase === 'basic' ? canOpenBasicCase(game) : canOpenAdvancedCase(game)
  const planetSlotCount = getPlanetSlotCount(game.sectorsExplored)
  const equippedPlanets = (game.equippedPlanetKeys ?? []).map((key) => PLANETS.find((planet) => planet.key === key)).filter((planet) => planet !== undefined)

  return <div className={`app-shell screen-${screen}`}>
    <GlobalStarfield />
    <aside className="sidebar">
      <a className="brand" aria-label="FeNi" href="#home" onClick={(event) => { event.preventDefault(); setScreen('mining') }}><img className="brand-logo" src="/favicon.svg" alt="" /><span className="brand-wordmark"><span>Fe</span><span>Ni</span></span></a>
      <div className="side-caption">{tx('РАЗДЕЛЫ')}</div>
      <nav className="primary-nav">{NAV.map(({ id, label, icon: Icon }) => <button aria-label={tx(label)} title={tx(label)} className={screen === id ? 'nav-link active' : 'nav-link'} key={id} onClick={() => { setScreen(id); setMoreOpen(false) }}><Icon size={18} strokeWidth={1.8} /><span>{tx(label)}</span>{id === 'collection' && collectionCount > 0 && <i>{collectionCount}</i>}</button>)}<button className="nav-link mobile-more-button" aria-label={tx('Дополнительно')} aria-expanded={moreOpen} onClick={() => setMoreOpen((open) => !open)}><MoreHorizontal size={19} /><span>{tx('Ещё')}</span></button></nav>
      <div className="side-caption tools-caption">{tx('ИНСТРУМЕНТЫ')}</div>
      <nav className="secondary-nav">{MORE_NAV.map(({ id, label, icon: Icon }) => <button aria-label={tx(label)} title={tx(label)} className={screen === id ? 'nav-link active' : 'nav-link'} key={id} onClick={() => setScreen(id)}><Icon size={17} strokeWidth={1.8} /><span>{tx(label)}</span></button>)}</nav>
      <div className="side-sector"><div className="sector-mark" aria-hidden="true">{String(activeSectorIndex + 1).padStart(2, '0')}</div><div><span className="side-caption">{tx('ТЕКУЩИЙ СЕКТОР')}</span><strong>{activeSector.name}</strong></div></div>
      <div className="side-bottom"><div className="sync-label" title={tx('Гостевой прогресс хранится на сервере и привязан к cookie этого браузера.')}><span className="sync-dot" />{tx('ГОСТЕВОЕ СОХРАНЕНИЕ')}</div><div className="version">FeNi <span>v0.1.0</span></div></div>
    </aside>

    <main className="main-area">
      <header className="topbar"><button className="topbar-mobile-logo" aria-label="FeNi" onClick={() => setScreen('mining')}><img src="/favicon.svg" alt="" /></button><section className="resource-strip" aria-label={tx('Ресурсы')}>{(['iron', 'copper', 'nickel', 'silicon'] as ResourceKey[]).map((key) => <ResourcePill key={key} resource={key} amount={game.inventory[key]} language={language} />)}</section><div className="topbar-actions"><button className="language-toggle" onClick={() => setLanguage(language === 'ru' ? 'en' : 'ru')} aria-label={tx('Сменить язык')} title={tx('Сменить язык')}><Languages size={14} /><span>{language === 'ru' ? 'RU' : 'EN'}</span></button><WalletButton language={language} linkedWallets={linkedWallets} linking={linkingWallet} onLinkWallet={linkCurrentWallet} /></div></header>

      {gameReady ? <>

      {screen === 'mining' && <div className="page-content mining-page">
        <div className="mining-layout">
          <section className="mining-column">
            <div className={`space-stage sector-${activeSector.key}`}>
              <div className="stage-grid" /><div className="stage-stars" aria-hidden="true"><CelestialStar className="stage-star stage-star-1" tone="ice" /><CelestialStar className="stage-star stage-star-2" tone="violet" /><CelestialStar className="stage-star stage-star-3" tone="violet" /><CelestialStar className="stage-star stage-star-4" tone="ice" /><CelestialStar className="stage-star stage-star-5" tone="ice" /><CelestialStar className="stage-star stage-star-6" tone="violet" /><CelestialStar className="stage-star stage-star-7" tone="violet" /><CelestialStar className="stage-star stage-star-8" tone="ice" /></div>
              <div className="stage-topline"><span><span className="recording-dot" /> {searching ? tx('ПОИСК') : tx('ГОТОВ К ДОБЫЧЕ')}</span></div>
              {asteroidVisible && <div className="asteroid-target"><AsteroidArt kind={asteroid.kind} hp={asteroid.hp} damage={miningPower} hit={mine} active={gameReady && asteroidVisible} language={language} /></div>}
              {searching && <div className="asteroid-searching"><Radar size={16} /><span>{tx('СКАНИРУЕМ')}</span><i /></div>}
              {lootPopup && (Object.values(lootPopup.drops).some((amount) => (amount ?? 0) > 0) || lootPopup.energy > 0) && <div className="loot-popup" key={lootPopup.id} role="status" aria-live="polite">{Object.entries(lootPopup.drops).map(([key, amount]) => amount ? <span className="loot-popup-item" key={key} title={tx(RESOURCES[key as ResourceKey].name)} style={{ '--loot-color': RESOURCES[key as ResourceKey].color } as CSSProperties}><ResourceIcon resource={key as ResourceKey} size={24} /><b>+{amount}</b></span> : null)}{lootPopup.energy > 0 && <span className="loot-popup-item relay-energy-loot"><Zap size={20} /><b>+{lootPopup.energy}</b><small>{tx('ЭНЕРГИЯ')}</small></span>}</div>}
              <div className="stage-dock">
                <div className="stage-asteroid-info"><span className={`stage-kind-icon kind-${asteroid.kind}`}><AsteroidSprite kind={asteroid.kind} /></span><div className="stage-asteroid-name"><span className="eyebrow">{tx('ТИП АСТЕРОИДА')}</span><b>{tx(ASTEROIDS[asteroid.kind].name)}</b><small>{tx(ASTEROIDS[asteroid.kind].drop)}</small><small className="stage-mining-power">{tx('СИЛА')} {miningPower}{game.inventory.condenser > 0 && ` · ${tx('ИМПУЛЬС')} ${game.condenserCharge}/${Math.max(3, 8 - game.inventory.condenser)}`}</small></div><div className="stage-durability"><div><span>{tx('ПРОЧНОСТЬ')}</span><b>{asteroidVisible ? asteroid.hp : 0}<small> / {asteroid.maxHp}</small></b></div><div className="health-track"><i style={{ width: `${asteroidVisible ? asteroid.hp / asteroid.maxHp * 100 : 0}%` }} /></div></div></div>
              </div>
            </div>
            {game.sectorsExplored === 4 && <section className={`relay-energy-panel ${game.inventory.relay > 0 ? 'relay-online' : ''}`} aria-label={tx('Энергия ретранслятора')}>
              <div className="relay-energy-heading"><span><Zap size={14} /> {tx('ЭНЕРГИЯ РЕТРАНСЛЯТОРА')}</span><b>{relayEnergy} / {RELAY_ENERGY_REQUIRED}</b></div>
              <div className="relay-energy-track"><i style={{ width: `${relayEnergy / RELAY_ENERGY_REQUIRED * 100}%` }} /></div>
              <small>{tx(game.inventory.relay > 0 ? 'Разрушай астероиды, чтобы заряжать ретранслятор.' : 'Собери ретранслятор в мастерской, чтобы начать накопление энергии.')}</small>
            </section>}
            <MiniQuests game={game} onClaim={claimQuest} language={language} />
          </section>
    {moreOpen && <div className="more-backdrop" onClick={() => setMoreOpen(false)}><div className="more-sheet" onClick={(event) => event.stopPropagation()}><div className="more-sheet-heading"><b>{tx('Дополнительно')}</b><button aria-label={tx('Закрыть')} onClick={() => setMoreOpen(false)}><X size={18} /></button></div>{MORE_NAV.map(({ id, label, icon: Icon }) => <button className="more-sheet-link" key={id} onClick={() => { setScreen(id); setMoreOpen(false) }}><span><Icon size={19} /></span><b>{tx(label)}</b><ChevronRight size={16} /></button>)}</div></div>}
        </div>
      </div>}


      {screen === 'cases' && <div className="page-content secondary-page cases-page">
        <div className="case-layout">
          <div className={`case-feature ${caseOpening ? 'opening' : ''}`}>
            <div className="case-tabs"><button className={selectedCase === 'basic' ? 'active' : ''} onClick={() => setSelectedCase('basic')}>{tx('Базовый')}</button><button className={selectedCase === 'advanced' ? 'active' : ''} onClick={() => setSelectedCase('advanced')}>{tx('Продвинутый')}</button></div>
            <div className="case-feature-art"><CaseChest advanced={selectedCase === 'advanced'} opening={caseOpening} /></div>
            <div className="case-feature-title">{selectedCase === 'basic' ? tx('Базовый кейс') : tx('Продвинутый кейс')}</div>
            <p>{tx(selectedCase === 'basic' ? 'Обычный скан планет.' : 'Выше шанс редких находок.')}</p>
            <button className="button case-open-button" disabled={!caseCanOpen || caseOpening} onClick={openCase}>{caseOpening ? <><Radar size={16} className="spin-icon" /> {tx('Сканируем…')}</> : <><Box size={16} /> {tx('Открыть кейс')} <ArrowUpRight size={14} /></>}</button>
            <div className="case-cost-inline">
              <div className="case-cost-heading"><span>{tx('ЦЕНА КЕЙСА')}</span><small>{tx('ЗА 1 КЕЙС')}</small></div>
              <div className="case-cost-items">{(Object.entries(caseCost) as [ResourceKey, number][]).map(([resource, needed]) => { const current = game.inventory[resource]; return <div className={`case-cost-item ${current < needed ? 'cost-missing' : ''}`} key={resource}>
                <ResourceIcon resource={resource} size={22} />
                <span className="case-cost-name">{tx(RESOURCES[resource].name)}</span>
                <b><strong className="case-cost-current">{current.toLocaleString()}</strong><i>/ {needed.toLocaleString()}</i></b>
              </div> })}</div>
            </div>
          </div>
        </div>
        <div className="case-history"><div><span className="eyebrow">{tx('ТВОИ НАХОДКИ')}</span><h2>{tx('Недавние находки')}</h2></div><button className="text-link" onClick={() => setScreen('collection')}>{tx('Открыть коллекцию')} <ArrowUpRight size={13} /></button><div className="mini-worlds">{game.collection.slice(0, 5).map((item) => { const planet = PLANETS.find((entry) => entry.key === item.catalogKey)!; return <button className="mini-world" key={item.uid} onClick={() => setReveal({ planet: item, duplicate: false, compensation: {} })}><PlanetOrb visual={planet.visual} /><span>{planet.name}</span><small className={rarityClass(planet.rarity)}>{tx(planet.rarity)}</small></button> })}{game.collection.length === 0 && <p className="muted small">{tx('Найденные планеты появятся здесь.')}</p>}</div></div>
      </div>}

      {screen === 'collection' && <div className="page-content secondary-page collection-page">
        <section className="planet-loadout" aria-label={tx('Усиления планет')}><div className="planet-loadout-heading"><span><Sparkles size={14} /> {tx('Усиления планет')}</span><b>{equippedPlanets.length} / {planetSlotCount}</b></div><p>{tx('Эффекты планет усиливают разные части экспедиции. Лимит слотов растёт с секторами.')}</p><div className="planet-loadout-slots">{Array.from({ length: planetSlotCount }, (_, index) => { const planet = equippedPlanets[index]; return <div className={`planet-loadout-slot ${planet ? 'filled' : ''}`} key={index}>{planet ? <><PlanetOrb visual={planet.visual} /><span>{planet.name}</span><small>{getPlanetBonusLabel(planet.effects, language)}</small></> : <><Plus size={16} /><span>{tx('Свободный слот')}</span></>}</div> })}</div></section>
        <div className="collection-filter-row"><div className="planet-filters" role="group" aria-label={tx('Фильтр коллекции')}>
          {([['all', 'Все', PLANETS.length], ['lessRare', 'Менее редкие', PLANETS.filter((planet) => ['Common', 'Uncommon'].includes(planet.rarity)).length], ['rare', 'Более редкие', PLANETS.filter((planet) => ['Rare', 'Epic', 'Legendary', 'Anomalous'].includes(planet.rarity)).length], ['owned', 'Есть в инвентаре', collectionCount]] as [PlanetFilter, string, number][]).map(([filter, label, amount]) => <button key={filter} className={planetFilter === filter ? 'planet-filter active' : 'planet-filter'} aria-pressed={planetFilter === filter} onClick={() => setPlanetFilter(filter)}>{tx(label)} <b>{amount}</b></button>)}
        </div><span className="archive-count"><Orbit size={16} /> {collectionCount} / {PLANETS.length} {tx('НАЙДЕНО')}</span></div>
        {filteredPlanets.length ? <div className="planet-grid">{filteredPlanets.map((planet) => { const item = game.collection.find((entry) => entry.catalogKey === planet.key); const equipped = (game.equippedPlanetKeys ?? []).includes(planet.key); return <PlanetCard key={planet.key} planet={planet} item={item} equipped={equipped} equipFull={!equipped && (game.equippedPlanetKeys ?? []).length >= planetSlotCount} onToggleEquip={doTogglePlanetEquip} onSelect={setSelectedPlanet} language={language} /> })}</div> : <div className="panel collection-empty">{tx('Пока нет открытых планет')}</div>}
      </div>}
      {screen === 'lab' && <LabScreen game={game} language={language} onCraftAlloy={doCraftAlloy} onCraftScanner={doCraftScanner} onCraftDrill={doCraftDrill} onBuildRecycler={doBuildRecycler} onUpgradeRecycler={doUpgradeRecycler} onRecycleNickel={() => doRecycle('nickel')} onRecycleSilicon={() => doRecycle('silicon')} onCraftOrUpgradeCondenser={doCraftOrUpgradeCondenser} onCraftRelay={doCraftRelay} />}
      {screen === 'achievements' && <AchievementsScreen game={game} language={language} />}

      {screen === 'map' && <div className="page-content secondary-page map-page">
        <div className="page-heading"><div><h1>{tx('Карта космоса')}</h1><p>{tx('Исследуй сектора и открывай новые уголки Вселенной.')}</p></div><span className="archive-count"><Compass size={16} /> {game.sectorsExplored} / {SECTORS.length} {tx('СЕКТОРОВ')}</span></div>
        <div className="map-board"><div className="map-nebula map-nebula-a" /><div className="map-nebula map-nebula-b" /><div className="map-grid" />
          <div className="map-starfield" aria-hidden="true"><CelestialStar className="map-star map-star-1" tone="ice" /><CelestialStar className="map-star map-star-2" tone="violet" /><CelestialStar className="map-star map-star-3" tone="ice" /><CelestialStar className="map-star map-star-4" tone="violet" /><CelestialStar className="map-star map-star-5" tone="ice" /><CelestialStar className="map-star map-star-6" tone="violet" /><CelestialStar className="map-star map-star-7" tone="ice" /><CelestialStar className="map-star map-star-8" tone="violet" /><CelestialStar className="map-star map-star-9" tone="ice" /></div>
          <div className="map-planets" aria-hidden="true">{MAP_PLANET_MARKERS.map((planet, index) => <span className="map-floating-planet" key={`${planet.visual}-${index}`} style={{ left: planet.left, top: planet.top }}><PlanetOrb visual={planet.visual} size="tiny" /></span>)}</div>
          <div className="map-current-title"><span>{tx('ТЕКУЩИЙ СЕКТОР')}</span><b>{String(activeSectorIndex + 1).padStart(2, '0')} · {activeSector.name}</b></div>
          <svg className="map-routes" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">{SECTOR_ROUTES.map(([from, to]) => <line key={`${from}-${to}`} x1={Number.parseFloat(SECTORS[from].left)} y1={Number.parseFloat(SECTORS[from].top)} x2={Number.parseFloat(SECTORS[to].left)} y2={Number.parseFloat(SECTORS[to].top)} />)}</svg>
          {SECTORS.map((sector, index) => { const isUnlocked = index < game.sectorsExplored; const isCurrent = index === activeSectorIndex; return <div className={`map-sector ${isUnlocked ? 'explored-sector' : 'locked-sector'} ${isCurrent ? 'current-sector' : ''}`} data-sector={sector.key} key={sector.key} style={{ left: sector.left, top: sector.top }}><div className="map-region"><SectorMapArtwork sectorKey={sector.key} kind="region" /></div><div className="sector-node"><SectorMapArtwork sectorKey={sector.key} />{!isUnlocked && <span className="sector-locked-badge"><LockKeyhole size={10} /></span>}</div><span>{String(index + 1).padStart(2, '0')}</span><b>{sector.name}</b><small>{isCurrent ? tx('ТЕКУЩИЙ СЕКТОР') : isUnlocked ? tx('ИССЛЕДОВАН') : tx('ЗАКРЫТО')}</small></div> })}
          <div className="map-caption"><span>{tx('КОСМИЧЕСКИЕ КООРДИНАТЫ')}</span></div>
        </div>
        {nextSector && travelRequirement ? <section className="sector-travel-card">
          <div className="sector-travel-heading"><span className="travel-gate-icon"><Compass size={19} /></span><div><span className="eyebrow">{tx('СЛЕДУЮЩИЙ СЕКТОР')}</span><h2>{nextSector.name}</h2></div></div>
          <div className={`travel-requirement-groups ${isRelayGate ? 'relay-gate-requirements' : ''}`}>
            {Object.keys(travelRequirement.resources).length > 0 && <div className="travel-requirement-group"><span className="travel-group-title">{tx('МАТЕРИАЛЫ')}</span><div className="travel-resource-list">{(Object.entries(travelRequirement.resources) as [ResourceKey, number][]).map(([key, required]) => <div className={`travel-resource ${game.inventory[key] >= required ? 'requirement-met' : ''}`} key={key}><ResourceIcon resource={key} size={25} /><span><b>{tx(RESOURCES[key].name)}</b><small>{game.inventory[key]} / {required}</small></span></div>)}</div></div>}
            <div className="travel-requirement-group"><span className="travel-group-title">{tx('ОСОБЫЕ ПРЕДМЕТЫ')}</span><div className="travel-item-list">{(Object.entries(travelRequirement.items) as [keyof typeof SPECIAL_ITEMS, number][]).map(([key, required]) => <div className={`travel-item ${game.inventory[key] >= required ? 'requirement-met' : ''}`} key={key}><span className="travel-item-icon">{key === 'relay' || key === 'condenser' ? <Zap size={16} /> : key === 'alloy' ? <Layers3 size={16} /> : key === 'scanner' ? <Radar size={16} /> : <Pickaxe size={16} />}</span><span><b>{key === 'drill' ? `${tx('Бур')} · ${required}` : tx(SPECIAL_ITEMS[key].name)}</b><small>{tx('Есть:')} {game.inventory[key]} · {tx('Нужно:')} {required}</small></span></div>)}</div></div>
          </div>
          {isRelayGate && <div className="relay-travel-energy"><div className="relay-energy-heading"><span><Zap size={14} /> {tx('ЗАРЯД ДЛЯ ПЕРЕЛЁТА')}</span><b>{relayEnergy} / {RELAY_ENERGY_REQUIRED}</b></div><div className="relay-energy-track"><i style={{ width: `${relayEnergy / RELAY_ENERGY_REQUIRED * 100}%` }} /></div><small>{tx('Энергия начисляется при разрушении астероидов после сборки ретранслятора.')}</small></div>}
          <div className="sector-upgrade-checklist">
            <div className="sector-upgrade-heading"><span className="travel-group-title">{tx('УЛУЧШЕНИЯ СЕКТОРА')}</span><b>{sectorUpgrades.filter((upgrade) => upgrade.complete).length} / {sectorUpgrades.length}</b></div>
            <div className="sector-upgrade-list">{sectorUpgrades.map((upgrade) => <div className={`sector-upgrade ${upgrade.complete ? 'requirement-met' : ''}`} key={upgrade.key}>
              <span className="sector-upgrade-icon">{upgrade.key === 'drill' ? <Pickaxe size={15} /> : upgrade.key === 'recycler' ? <Recycle size={15} /> : <Zap size={15} />}</span>
              <span><b>{tx(upgrade.key === 'drill' ? 'Бур' : upgrade.key === 'recycler' ? 'Переработчик' : 'Импульсный конденсатор')}</b><small>{upgrade.level} / {upgrade.maxLevel}</small></span>
              {upgrade.complete ? <Check size={15} /> : <LockKeyhole size={14} />}
            </div>)}</div>
          </div>
          <div className="sector-travel-footer"><span><LockKeyhole size={13} /> {tx(isRelayGate ? !sectorUpgradesComplete ? 'Улучши оборудование до максимума сектора.' : game.inventory.relay < 1 ? 'Собери ретранслятор и накопи 250 энергии.' : relayEnergy < RELAY_ENERGY_REQUIRED ? 'Накопи 250 энергии для ретранслятора.' : 'Энергия будет потрачена при перелёте, ретранслятор останется.' : sectorUpgradesComplete ? 'Особые предметы останутся, материалы будут потрачены.' : 'Улучшите оборудование')}</span><button className="button travel-button" disabled={!canTravelToNextSector(game)} onClick={doTravelToNextSector}><Compass size={15} /> {tx('Перейти в')} {nextSector.name} <ArrowUpRight size={14} /></button></div>
        </section> : <div className="sector-travel-card sector-frontier"><span>{tx('Достигнут край карты.')}</span></div>}
      </div>}
      </> : <section className="server-auth-gate" role="status">
        <LockKeyhole size={25} />
        <h1>{authPending ? (language === 'en' ? 'Loading your game save' : 'Загружаем сохранение') : language === 'en' ? 'Could not load the game' : 'Не удалось загрузить игру'}</h1>
        <p>{authPending ? (language === 'en' ? 'Starting a guest save on this browser. No wallet is needed.' : 'Создаём гостевое сохранение в этом браузере. Кошелёк не нужен.') : authError}</p>
        {!authPending && <button className="button" onClick={() => setAuthRetry((retry) => retry + 1)}>{language === 'en' ? 'Try again' : 'Повторить'}</button>}
      </section>}
    </main>

    {toast && <div className="toast"><span className="toast-mark"><Sparkles size={14} /></span>{toast}</div>}
    {(reveal || selectedPlanet) && (() => {
      const item = reveal?.planet ?? selectedPlanet!
      const p = PLANETS.find((planet) => planet.key === item.catalogKey)!
      const compensation = reveal?.duplicate ? Object.entries(reveal.compensation) as [ResourceKey, number][] : []
      const dateLocale = language === 'ru' ? 'ru-RU' : 'en-US'
      return <div className="modal-backdrop" onClick={() => { setReveal(null); setSelectedPlanet(null) }}><div className="discovery-modal" onClick={(event) => event.stopPropagation()}>
        <button className="modal-close" onClick={() => { setReveal(null); setSelectedPlanet(null) }} aria-label={tx('Закрыть')}><X size={17} /></button>
        <div className={`modal-eyebrow ${reveal?.duplicate ? 'duplicate-eyebrow' : ''}`}><span className="pulse-dot" /> {reveal?.duplicate ? tx('ПОВТОРНАЯ НАХОДКА') : tx('ПЛАНЕТА НАЙДЕНА')}</div>
        <div className="modal-orb"><PlanetOrb visual={p.visual} size="large" /></div><span className={`modal-rarity ${rarityClass(p.rarity)}`}>{tx(p.rarity).toUpperCase()} · {tx('РЕДКОСТЬ')}</span>
        <h2>{p.name}</h2><p className="modal-type">{planetTypeLabel(p.type, language)} · {p.sector}</p><div className="modal-id">{item.planetId} <span>·</span> {new Date(item.discoveredAt).toLocaleDateString(dateLocale)}</div>
        <div className="planet-stats"><div><span>{tx('МАССА')}</span><b>{p.mass} <small>{tx('Земли')}</small></b></div><div><span>{tx('ТЕМПЕРАТУРА')}</span><b>{p.temperature} <small>K</small></b></div><div><span>{tx('АТМОСФЕРА')}</span><b>{p.atmosphere}</b></div><div><span>{tx('МАТЕРИАЛЫ')}</span><b>{p.resources.map((resource) => planetResourceLabel(resource, language)).join(' · ')}</b></div></div>
        <div className="planet-bonus"><Sparkles size={15} /><span><b>{tx('Бонус планеты')}</b><small>{getPlanetBonusLabel(p.effects, language)}</small></span></div>
        {reveal?.duplicate && <div className="duplicate-reward"><b>{tx('Планета уже есть в коллекции')}</b><span>{tx('Компенсация за повтор:')}</span><div>{compensation.map(([key, amount]) => <span key={key} title={tx(RESOURCES[key].name)}><ResourceIcon resource={key} size={20} /> +{amount}</span>)}</div></div>}
        {item.onChain ? <div className="nft-claimed-panel"><Check size={15} /><span><b>{tx('NFT находится в Devnet-кошельке')}</b><small>{item.mintAddress}</small></span>{item.mintAddress && <a href={`https://explorer.solana.com/address/${item.mintAddress}?cluster=devnet`} target="_blank" rel="noreferrer" aria-label={tx('Открыть NFT в обозревателе')}><ArrowUpRight size={14} /></a>}</div> : <button className="button claim-button" disabled={!connectedWallet?.signer || !linkedWallets.includes(connectedWallet.account.address) || Boolean(claimingPlanetUid) || !getNftMetadataUri(item.catalogKey)} onClick={() => void doClaimPlanet(item, p.name)} title={!connectedWallet?.signer ? tx('Сначала подключи кошелёк Solana Devnet') : !linkedWallets.includes(connectedWallet.account.address) ? tx('Привяжи кошелёк к сохранению') : undefined}>{claimingPlanetUid === item.uid ? <><Radar size={15} className="spin-icon" /> {tx('Выпускаем и проверяем NFT…')}</> : readPendingPlanetMint(connectedWallet?.account.address ?? '', item.uid) ? <><Check size={15} /> {tx('Проверить выпуск NFT')} <ArrowUpRight size={13} /></> : <><WalletCards size={15} /> {tx('Выпустить NFT на Solana')} <ArrowUpRight size={13} /></>}</button>}
        {item.onChain && item.transactionSignature && <a className="nft-signature-link" href={`https://explorer.solana.com/tx/${item.transactionSignature}?cluster=devnet`} target="_blank" rel="noreferrer">{tx('Посмотреть транзакцию')} <ArrowUpRight size={12} /></a>}
        {!item.onChain && !connectedWallet?.signer && <p className="claim-note">{tx('Подключи кошелёк и привяжи его к сохранению, чтобы выпустить NFT.')}</p>}
        {!item.onChain && connectedWallet?.signer && !linkedWallets.includes(connectedWallet.account.address) && <p className="claim-note">{tx('Привяжи кошелёк к сохранению')}</p>}
        {!item.onChain && !getNftMetadataUri(item.catalogKey) && <p className="claim-note">{tx('Для NFT сначала опубликуй сайт и укажи VITE_PUBLIC_URL в .env.')}</p>}
        {claimError && <p className="claim-error" role="alert">{claimError}</p>}
        {item.onChain && <p className="claim-note">{tx('Минт и сетевые комиссии оплачиваются тестовыми SOL в Devnet.')}</p>}
      </div></div>
    })()}
  </div>
}

export default App
