import { address } from '@solana/kit'
import {
  findMasterEditionPda,
  findMetadataPda,
  getMasterEditionDecoder,
  getMetadataDecoder,
  Key,
  MPL_TOKEN_METADATA_PROGRAM_ADDRESS,
  type MasterEdition,
  type Metadata,
} from '@metaplex-foundation/mpl-token-metadata-kit'

const rpcUrl = process.env.GAME_SOLANA_RPC_URL ?? 'https://api.devnet.solana.com'
const commitment = 'finalized'
const metadataProgram = String(MPL_TOKEN_METADATA_PROGRAM_ADDRESS)

export class PlanetNftVerificationError extends Error {
  constructor(readonly status: number, message: string) {
    super(message)
    this.name = 'PlanetNftVerificationError'
  }
}

type RpcEnvelope<T> = { result?: T; error?: { message?: string } }
type SignatureStatus = { err: unknown | null; confirmationStatus?: string | null } | null
type ConfirmedTransaction = {
  transaction?: {
    signatures?: string[]
    message?: {
      accountKeys?: (string | { pubkey?: string; signer?: boolean })[]
      instructions?: { programId?: string }[]
    }
  }
  meta?: {
    err?: unknown | null
    preTokenBalances?: { mint?: string; owner?: string; uiTokenAmount?: { amount?: string; decimals?: number } }[]
    postTokenBalances?: { mint?: string; owner?: string; uiTokenAmount?: { amount?: string; decimals?: number } }[]
  } | null
}
type AccountInfo = { owner?: string; data?: [string, string] } | null

function verificationError(status: number, message: string): never {
  throw new PlanetNftVerificationError(status, message)
}

async function solanaRpc<T>(method: string, params: unknown[]): Promise<T> {
  let response: Response
  try {
    response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
      signal: AbortSignal.timeout(10_000),
    })
  } catch {
    verificationError(503, 'Solana Devnet is temporarily unavailable. Retry the NFT verification shortly.')
  }
  if (!response.ok) verificationError(503, 'Solana Devnet is temporarily unavailable. Retry the NFT verification shortly.')
  let payload: RpcEnvelope<T>
  try { payload = await response.json() as RpcEnvelope<T> }
  catch { verificationError(503, 'Solana Devnet returned an invalid response. Retry the NFT verification shortly.') }
  if (payload.error || payload.result === undefined) {
    verificationError(503, 'Solana Devnet is temporarily unavailable. Retry the NFT verification shortly.')
  }
  return payload.result
}

async function waitForFinalizedTransaction(signature: string) {
  const deadline = Date.now() + 45_000
  while (Date.now() < deadline) {
    const response = await solanaRpc<{ value?: SignatureStatus[] }>('getSignatureStatuses', [
      [signature],
      { searchTransactionHistory: true },
    ])
    const status = response.value?.[0] ?? null
    if (status?.err) verificationError(400, 'The Solana transaction failed.')
    if (status?.confirmationStatus === 'finalized') return
    await new Promise((resolve) => setTimeout(resolve, 900))
  }
  verificationError(409, 'The transaction is not finalized yet. Retry verification in a moment; do not mint again.')
}

function trimMetadataString(value: string) {
  return value.replace(/\0+$/g, '').trim()
}

function expectedMintName(planetId: string, planetName: string) {
  let name = `${planetId} ${planetName}`
  while (new TextEncoder().encode(name).length > 32) name = Array.from(name).slice(0, -1).join('')
  return name
}

/** Confirms the Devnet mint and checks that its immutable Metaplex data matches this player's discovery. */
export async function verifyPlanetNftMint(input: {
  wallet: string
  mintAddress: string
  signature: string
  planetId: string
  planetName: string
  catalogKey: string
  expectedMetadataUri: string
}) {
  await waitForFinalizedTransaction(input.signature)

  const transaction = await solanaRpc<ConfirmedTransaction | null>('getTransaction', [input.signature, {
    commitment,
    maxSupportedTransactionVersion: 0,
    encoding: 'jsonParsed',
  }])
  if (!transaction?.transaction?.message || !transaction.meta) {
    verificationError(503, 'Solana Devnet could not load the confirmed transaction. Retry the NFT verification shortly.')
  }
  if (transaction.meta.err) verificationError(400, 'The Solana transaction failed.')
  if (!transaction.transaction.signatures?.includes(input.signature)) {
    verificationError(400, 'The transaction signature does not match the confirmed transaction.')
  }

  const mint = address(input.mintAddress)
  const [metadataAddress] = await findMetadataPda({ mint })
  const [editionAddress] = await findMasterEditionPda({ mint })
  const accountKeys = transaction.transaction.message.accountKeys ?? []
  const keyAddress = (key: string | { pubkey?: string }) => typeof key === 'string' ? key : key.pubkey
  const signedByWallet = transaction.transaction.message.accountKeys?.some((key) => typeof key !== 'string' && key.pubkey === input.wallet && key.signer === true)
  const mintWasInTransaction = accountKeys.some((key) => keyAddress(key) === input.mintAddress)
  const metadataPdaWasInTransaction = accountKeys.some((key) => keyAddress(key) === metadataAddress)
  const editionPdaWasInTransaction = accountKeys.some((key) => keyAddress(key) === editionAddress)
  const createdMetaplexMetadata = transaction.transaction.message.instructions?.some((instruction) => instruction.programId === metadataProgram)
  if (!signedByWallet || !mintWasInTransaction || !metadataPdaWasInTransaction || !editionPdaWasInTransaction || !createdMetaplexMetadata) {
    verificationError(400, 'The transaction was not signed by this wallet to create the submitted Metaplex NFT.')
  }

  const ownerBalance = (balances: NonNullable<typeof transaction.meta>['postTokenBalances']) => (balances ?? [])
    .filter((balance) => balance.mint === input.mintAddress && balance.owner === input.wallet && balance.uiTokenAmount?.decimals === 0)
    .reduce((sum, balance) => sum + BigInt(balance.uiTokenAmount?.amount ?? '0'), 0n)
  if (ownerBalance(transaction.meta.preTokenBalances) !== 0n || ownerBalance(transaction.meta.postTokenBalances) !== 1n) {
    verificationError(400, 'The transaction did not create exactly one NFT for the signed-in wallet.')
  }

  const [metadataResponse, editionResponse] = await Promise.all([
    solanaRpc<{ value: AccountInfo }>('getAccountInfo', [metadataAddress, { commitment, encoding: 'base64' }]),
    solanaRpc<{ value: AccountInfo }>('getAccountInfo', [editionAddress, { commitment, encoding: 'base64' }]),
  ])
  const metadataAccount = metadataResponse.value
  const editionAccount = editionResponse.value
  if (metadataAccount?.owner !== metadataProgram || !metadataAccount.data?.[0]) {
    verificationError(400, 'The submitted mint has no valid Metaplex NFT metadata.')
  }
  if (editionAccount?.owner !== metadataProgram || !editionAccount.data?.[0]) {
    verificationError(400, 'The submitted mint has no Metaplex master edition account.')
  }

  let metadata: Metadata
  let edition: MasterEdition
  try {
    metadata = getMetadataDecoder().decode(Buffer.from(metadataAccount.data[0], 'base64'))
    edition = getMasterEditionDecoder().decode(Buffer.from(editionAccount.data[0], 'base64'))
  } catch {
    verificationError(400, 'The submitted mint has invalid Metaplex account data.')
  }

  const validMetadata = metadata.key === Key.MetadataV1 &&
    metadata.mint === input.mintAddress &&
    metadata.updateAuthority === input.wallet &&
    trimMetadataString(metadata.name) === expectedMintName(input.planetId, input.planetName) &&
    trimMetadataString(metadata.symbol) === 'FENI' &&
    trimMetadataString(metadata.uri) === input.expectedMetadataUri &&
    metadata.sellerFeeBasisPoints === 0 &&
    metadata.isMutable === false
  if (!validMetadata || edition.key !== Key.MasterEditionV2) {
    verificationError(400, 'The NFT metadata does not match the discovered planet.')
  }

  return { walletAddress: input.wallet, mintAddress: input.mintAddress, transactionSignature: input.signature }
}
