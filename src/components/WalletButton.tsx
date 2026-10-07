import { useClient } from '@solana/react'
import { useConnect, useConnectedWallet, useDisconnect, useIsWalletReady, useWallets } from '@solana/kit-plugin-wallet/react'
import { ChevronDown, CircleHelp, Wallet } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { SolanaAppClient } from '../solana/client'
import { t, type Language } from '../i18n'

function shortAddress(address: string) {
  return `${address.slice(0, 4)}…${address.slice(-4)}`
}

export default function WalletButton({ language, linkedWallets, linking, onLinkWallet }: { language: Language; linkedWallets: string[]; linking: boolean; onLinkWallet: () => void }) {
  const client = useClient<SolanaAppClient>()
  const wallets = useWallets(client)
  const walletReady = useIsWalletReady(client)
  const connected = useConnectedWallet(client)
  const { dispatch: connectWallet, isRunning, isError, reset } = useConnect(client)
  const disconnect = useDisconnect(client)
  const [menuOpen, setMenuOpen] = useState(false)
  const [walletHintOpen, setWalletHintOpen] = useState(false)
  const [connectTimedOut, setConnectTimedOut] = useState(false)

  useEffect(() => {
    if (!isRunning) return
    const timeout = window.setTimeout(() => {
      reset()
      setConnectTimedOut(true)
    }, 20_000)
    return () => window.clearTimeout(timeout)
  }, [isRunning, reset])

  const startConnect = (wallet: (typeof wallets)[number]) => {
    setConnectTimedOut(false)
    reset()
    connectWallet(wallet)
  }

  if (!walletReady) {
    return <div className="wallet-connected-wrap"><button className="wallet-button wallet-discovering" disabled><CircleHelp size={14} /> {t(language, 'Поиск кошелька…')}</button></div>
  }

  if (connected) {
    const isLinked = linkedWallets.includes(connected.account.address)
    return (
      <div className="wallet-connected-wrap">
        <button className="wallet-button connected" onClick={() => setMenuOpen((open) => !open)}>
          <span className="wallet-dot" />
          <span>{shortAddress(connected.account.address)}</span>
          <ChevronDown size={14} />
        </button>
        {menuOpen && <div className="wallet-popover"><b>Solana Devnet</b><span className="muted small">{connected.wallet.name}</span>{isLinked ? <span className="muted small">{t(language, 'Кошелёк привязан к сохранению')}</span> : <button className="wallet-choice" disabled={linking} onClick={() => { onLinkWallet(); setMenuOpen(false) }}>{t(language, linking ? 'Привязываем…' : 'Привязать к сохранению')}</button>}{wallets.filter((wallet) => wallet.name !== connected.wallet.name).map((wallet) => <button className="wallet-choice" key={wallet.name} disabled={isRunning} onClick={() => { startConnect(wallet); setMenuOpen(false) }}>{t(language, 'Подключить')} {wallet.name}</button>)}<button onClick={() => { disconnect.dispatch(); setMenuOpen(false) }}>{t(language, 'Отключить кошелёк')}</button></div>}
      </div>
    )
  }

  return (
    <div className="wallet-connected-wrap">
      <button className="wallet-button" aria-expanded={wallets.length > 1 ? menuOpen : wallets.length === 0 ? walletHintOpen : undefined} disabled={isRunning} onClick={() => wallets.length === 1 ? startConnect(wallets[0]) : wallets.length > 1 ? setMenuOpen((open) => !open) : setWalletHintOpen((open) => !open)}>
        <Wallet size={15} />
        {isRunning ? t(language, 'Подключаем…') : wallets.length ? t(language, 'Подключить кошелёк') : t(language, 'Кошелёк не найден')}
      </button>
      {menuOpen && wallets.length > 1 && <div className="wallet-popover wallet-picker"><b>{t(language, 'Выбери кошелёк')}</b>{wallets.map((wallet) => <button className="wallet-choice" key={wallet.name} disabled={isRunning} onClick={() => { startConnect(wallet); setMenuOpen(false) }}><Wallet size={13} /> {t(language, 'Подключить')} {wallet.name}</button>)}</div>}
      {wallets.length === 0 && <span className={`wallet-hint ${walletHintOpen ? 'hint-open' : ''}`}>{t(language, 'Открой игру в браузере с установленным и разблокированным кошельком, например Phantom.')}</span>}
      {connectTimedOut && <span className="wallet-hint error-hint hint-open" role="alert">{t(language, 'Кошелёк не ответил за 20 секунд. Открой расширение, разблокируй его и попробуй снова.')}</span>}
      {isError && <span className="wallet-hint error-hint hint-open" role="alert">{t(language, 'Не удалось подключить кошелёк. Проверь запрос в расширении и попробуй снова.')}</span>}
    </div>
  )
}
