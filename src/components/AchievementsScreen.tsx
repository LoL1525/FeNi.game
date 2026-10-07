import { Award, Check, LockKeyhole } from 'lucide-react'
import { ACHIEVEMENTS, getAchievementProgress, type AchievementGroup } from '../game/achievements'
import type { GameState } from '../game/types'
import { t, type Language } from '../i18n'

const GROUPS: { id: AchievementGroup; label: string }[] = [
  { id: 'mining', label: 'ДОБЫЧА' },
  { id: 'cases', label: 'КЕЙСЫ' },
  { id: 'collection', label: 'КОЛЛЕКЦИЯ' },
  { id: 'exploration', label: 'ИССЛЕДОВАНИЕ' },
]

export default function AchievementsScreen({ game, language }: { game: GameState; language: Language }) {
  const tx = (text: string) => t(language, text)
  const progress = getAchievementProgress(game)
  const unlocked = progress.filter((achievement) => achievement.unlocked).length

  return <div className="page-content secondary-page achievements-page">
    <div className="page-heading"><div><h1>{tx('Достижения')}</h1><p>{tx('Отмечай важные открытия и этапы своего пути.')}</p></div><span className="archive-count"><Award size={16} /> {unlocked} / {ACHIEVEMENTS.length} {tx('ОТКРЫТО')}</span></div>
    <div className="achievement-progress-summary"><div><span>{tx('Прогресс журнала')}</span><b>{unlocked} / {ACHIEVEMENTS.length}</b></div><div className="achievement-progress-track"><i style={{ width: `${unlocked / ACHIEVEMENTS.length * 100}%` }} /></div></div>
    {GROUPS.map((group) => {
      const entries = progress.filter((achievement) => achievement.group === group.id)
      return <section className={`achievement-group achievement-group-${group.id}`} key={group.id}>
        <div className="achievement-group-heading"><span>{tx(group.label)}</span><small>{entries.filter((achievement) => achievement.unlocked).length} / {entries.length}</small></div>
        <div className="achievement-grid">{entries.map((achievement) => <article className={`achievement-card ${achievement.unlocked ? 'achievement-unlocked' : ''}`} key={achievement.id}>
          <span className="achievement-card-icon">{achievement.unlocked ? <Check size={19} /> : <Award size={19} />}</span>
          <div className="achievement-card-copy"><h2>{tx(achievement.title)}</h2><p>{tx(achievement.description)}</p></div>
          <span className="achievement-lock" title={achievement.unlocked ? tx('Открыто') : tx('Пока закрыто')}>{achievement.unlocked ? <Check size={14} /> : <LockKeyhole size={13} />}</span>
          <div className="achievement-card-progress"><i style={{ width: `${achievement.value / achievement.target * 100}%` }} /></div>
          <span className="achievement-card-count">{achievement.value.toLocaleString(language === 'ru' ? 'ru-RU' : 'en-US')} / {achievement.target.toLocaleString(language === 'ru' ? 'ru-RU' : 'en-US')}</span>
          <span className="achievement-proof-tag">{tx(achievement.unlocked ? 'ОТКРЫТО · ЛОКАЛЬНО' : 'ЕЩЁ НЕ ОТКРЫТО')}</span>
        </article>)}</div>
      </section>
    })}
  </div>
}
