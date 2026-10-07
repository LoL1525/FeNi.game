import { useEffect, useState } from 'react'
import { Check, Clock3, Target } from 'lucide-react'
import type { GameState, ResourceKey } from '../game/types'
import { RESOURCES } from '../game/data'
import { t, type Language } from '../i18n'
import ResourceIcon from './ResourceIcon'

type Props = { game: GameState; onClaim: (id: string) => void; language: Language }

function formatRemaining(milliseconds: number, language: Language) {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000))
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const rest = seconds % 60
  if (language === 'en') return hours ? `${hours}h ${String(minutes).padStart(2, '0')}m` : `${minutes}m ${String(rest).padStart(2, '0')}s`
  return hours ? `${hours}ч ${String(minutes).padStart(2, '0')}м` : `${minutes}м ${String(rest).padStart(2, '0')}с`
}

export default function MiniQuests({ game, onClaim, language }: Props) {
  const [now, setNow] = useState(Date.now())
  const quests = game.quests ?? []
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])
  return <section className="panel mini-quests-panel">
    <div className="panel-title"><span>{t(language, 'ЗАДАНИЯ')}</span><span className="quest-count">{quests.filter((quest) => !quest.availableAt || quest.availableAt <= now).length} {t(language, 'активны')}</span></div>
    <div className="mini-quest-list">{quests.map((quest) => {
      const cooling = Boolean(quest.availableAt && quest.availableAt > now)
      const progress = quest.availableAt && quest.availableAt <= now ? 0 : quest.progress
      const complete = !cooling && progress >= quest.target
      const reward = Object.entries(quest.reward) as [ResourceKey, number][]
      return <article className={`mini-quest ${complete ? 'quest-complete' : ''} ${cooling ? 'quest-cooldown' : ''}`} key={quest.id}>
        <div className="quest-icon">{cooling ? <Clock3 size={14} /> : complete ? <Check size={14} /> : <Target size={14} />}</div>
        <div className="quest-body"><div className="quest-heading"><b>{t(language, quest.title)}</b><span>{Math.min(progress, quest.target)} / {quest.target}</span></div><p>{t(language, quest.description)}</p><div className="quest-progress"><i style={{ width: `${Math.min(100, progress / quest.target * 100)}%` }} /></div><div className="quest-reward">{reward.map(([key, amount]) => <span key={key} title={t(language, RESOURCES[key].name)}><ResourceIcon resource={key} size={17} /> +{amount}</span>)}</div></div>
        {cooling && <div className="quest-timer">{t(language, 'Осталось')} {formatRemaining(quest.availableAt! - now, language)}</div>}
        {complete && <button className="quest-claim" onClick={() => onClaim(quest.id)}>{t(language, 'Забрать')}</button>}
      </article>
    })}</div>
  </section>
}
