import { createClient } from '@solana/kit'
import { solanaRpc } from '@solana/kit-plugin-rpc'
import { walletSigner } from '@solana/kit-plugin-wallet'

// Wallet Standard discovery is browser-only; gameplay itself never needs this client.
export const solanaClient = createClient()
  .use(walletSigner({ chain: 'solana:devnet' }))
  .use(solanaRpc({ rpcUrl: 'https://api.devnet.solana.com' }))

export type SolanaAppClient = typeof solanaClient
