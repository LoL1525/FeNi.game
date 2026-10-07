import { address, generateKeyPairSigner, type Instruction } from '@solana/kit'
import { createNft } from '@metaplex-foundation/mpl-token-metadata-kit/dist/src/hooked/createHelpers.js'
import type { CollectedPlanet } from '../game/types'
import type { SolanaAppClient } from './client'

/** Mints a zero-decimal Metaplex Token Metadata NFT on Devnet with the connected wallet as owner and fee payer. */
export async function mintPlanetCollectible(
  client: SolanaAppClient,
  walletSigner: NonNullable<ReturnType<SolanaAppClient['wallet']['getState']>['connected']>['signer'],
  walletAddress: string,
  planet: CollectedPlanet,
  planetName: string,
  metadataUri: string,
): Promise<{ mintAddress: string; signature: string }> {
  if (!walletSigner) throw new Error('Кошелёк не поддерживает подпись транзакций.')
  const mint = await generateKeyPairSigner()
  let name = `${planet.planetId} ${planetName}`
  while (new TextEncoder().encode(name).length > 32) name = Array.from(name).slice(0, -1).join('')
  const input = {
    mint,
    authority: walletSigner,
    payer: walletSigner,
    tokenOwner: address(walletAddress),
    name,
    symbol: 'FENI',
    uri: metadataUri,
    sellerFeeBasisPoints: 0,
    isMutable: false,
  }

  // The published Metaplex Kit package currently declares Kit 6.x types while this app uses Kit 8.x.
  // Both SDKs create the same wire instructions; bridge only at this third-party package boundary.
  const instructions = await createNft(input as Parameters<typeof createNft>[0]) as unknown as Instruction[]
  const result = await client.sendTransaction(instructions)
  return { mintAddress: mint.address, signature: String(result.context.signature) }
}
