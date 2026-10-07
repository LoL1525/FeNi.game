import { createHmac, createPublicKey, randomBytes, timingSafeEqual, verify } from 'node:crypto'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { DatabaseSync } from 'node:sqlite'
import { copyFileSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs'
import { mkdir, readFile, stat } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'
import { hitAsteroid, openBasicCase, openAdvancedCase, claimMiniQuest, craftAlloy, craftScanner, craftDrill, buildRecycler, upgradeRecycler, recycleResource, craftOrUpgradeCondenser, craftRelay, travelToNextSector, togglePlanetEquip, getEquippedRareAsteroidChance, INITIAL_GAME_STATE } from '../src/game/engine'
import { PLANETS, rollAsteroid } from '../src/game/data'
import type { Asteroid, GameState } from '../src/game/types'
import { PlanetNftVerificationError, verifyPlanetNftMint } from './planetNft'

const port = Number(process.env.PORT ?? process.env.GAME_PORT ?? 8787)
const secret = process.env.GAME_AUTH_SECRET ?? ''
const dataDirectory = resolve(process.env.GAME_DATA_DIR ?? './data')
const backupDirectory = resolve(process.env.GAME_BACKUP_DIR ?? resolve(dataDirectory, 'backups'))
const siteOrigin = process.env.GAME_SITE_ORIGIN ?? ''
const sessionLifetimeMs = 30 * 24 * 60 * 60 * 1000
const allowedOrigin = siteOrigin ? new URL(siteOrigin).origin : ''
const secureCookie = allowedOrigin.startsWith('https://')
const sessionCookieName = secureCookie ? '__Host-feni-game-session' : 'feni-game-session'
const requireForwardedHttps = secureCookie && process.env.GAME_REQUIRE_HTTPS !== 'false'
const challenges = new Map<string, { accountId: string; nonce: string; message: string; expiresAt: number }>()
const requestWindows = new Map<string, { start: number; count: number }>()
const actionBuckets = new Map<string, { tokens: number; updatedAt: number }>()
const gameActions = new Set([
  'mine', 'open-basic-case', 'open-advanced-case', 'claim-quest', 'craft-alloy', 'craft-scanner', 'craft-drill',
  'build-recycler', 'upgrade-recycler', 'recycle-nickel', 'recycle-silicon', 'craft-condenser', 'craft-relay', 'travel', 'toggle-planet',
])

if (secret.length < 32) throw new Error('GAME_AUTH_SECRET must contain at least 32 characters. Set a persistent random secret before starting the server.')

await mkdir(dataDirectory, { recursive: true })
const databasePath = resolve(dataDirectory, 'feni-game.sqlite')
const database = new DatabaseSync(databasePath)
database.exec(`PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;`)
const existingPlayerColumns = database.prepare('PRAGMA table_info(players)').all() as { name: string; pk: number }[]
if (existingPlayerColumns.length > 0 && existingPlayerColumns.some((column) => column.name === 'wallet') && !existingPlayerColumns.some((column) => column.name === 'account_id')) {
  database.exec('BEGIN IMMEDIATE')
  try {
    database.exec(`ALTER TABLE players RENAME TO players_wallet_legacy_backup;
      CREATE TABLE players (account_id TEXT PRIMARY KEY, state_json TEXT NOT NULL, asteroid_json TEXT NOT NULL, updated_at INTEGER NOT NULL);
      CREATE TABLE wallet_accounts (wallet TEXT PRIMARY KEY, account_id TEXT NOT NULL);`)
    const legacyRows = database.prepare('SELECT wallet, state_json, asteroid_json, updated_at FROM players_wallet_legacy_backup').all() as { wallet: string; state_json: string; asteroid_json: string; updated_at: number }[]
    const insertMigratedPlayer = database.prepare('INSERT INTO players(account_id,state_json,asteroid_json,updated_at) VALUES(?,?,?,?)')
    const insertMigratedWallet = database.prepare('INSERT INTO wallet_accounts(wallet,account_id) VALUES(?,?)')
    for (const row of legacyRows) {
      const accountId = newAccountId()
      insertMigratedPlayer.run(accountId, row.state_json, row.asteroid_json, row.updated_at)
      insertMigratedWallet.run(row.wallet, accountId)
    }
    database.exec('COMMIT')
  } catch (error) {
    database.exec('ROLLBACK')
    throw error
  }
} else {
  database.exec(`CREATE TABLE IF NOT EXISTS players (account_id TEXT PRIMARY KEY, state_json TEXT NOT NULL, asteroid_json TEXT NOT NULL, updated_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS wallet_accounts (wallet TEXT PRIMARY KEY, account_id TEXT NOT NULL);`)
}
database.exec('CREATE INDEX IF NOT EXISTS wallet_accounts_account_id ON wallet_accounts(account_id)')
database.exec(`CREATE TABLE IF NOT EXISTS planet_nft_claims (
  wallet TEXT NOT NULL,
  catalog_key TEXT NOT NULL,
  planet_uid TEXT NOT NULL,
  mint_address TEXT NOT NULL UNIQUE,
  transaction_signature TEXT NOT NULL UNIQUE,
  claimed_at INTEGER NOT NULL,
  PRIMARY KEY (wallet, catalog_key)
);`)
const selectPlayer = database.prepare('SELECT state_json, asteroid_json FROM players WHERE account_id = ?')
const upsertPlayer = database.prepare('INSERT INTO players(account_id,state_json,asteroid_json,updated_at) VALUES(?,?,?,?) ON CONFLICT(account_id) DO UPDATE SET state_json=excluded.state_json, asteroid_json=excluded.asteroid_json, updated_at=excluded.updated_at')
const selectWalletsForAccount = database.prepare('SELECT wallet FROM wallet_accounts WHERE account_id = ?')
const selectWalletAccount = database.prepare('SELECT account_id FROM wallet_accounts WHERE wallet = ?')
const insertWalletAccount = database.prepare('INSERT INTO wallet_accounts(wallet,account_id) VALUES(?,?)')
const selectPlanetNftClaims = database.prepare('SELECT c.wallet, c.catalog_key, c.planet_uid, c.mint_address, c.transaction_signature FROM planet_nft_claims c JOIN wallet_accounts w ON w.wallet = c.wallet WHERE w.account_id = ?')
const selectPlanetNftClaim = database.prepare('SELECT c.wallet, c.planet_uid, c.mint_address, c.transaction_signature FROM planet_nft_claims c JOIN wallet_accounts w ON w.wallet = c.wallet WHERE w.account_id = ? AND c.catalog_key = ? LIMIT 1')
const insertPlanetNftClaim = database.prepare('INSERT INTO planet_nft_claims(wallet,catalog_key,planet_uid,mint_address,transaction_signature,claimed_at) VALUES(?,?,?,?,?,?)')

type PlayerRow = { state_json: string; asteroid_json: string }
type PlayerRecord = { state: GameState; asteroid: Asteroid }
type ActionResult = { state: GameState; asteroid: Asteroid; result?: Record<string, unknown> }
type PlanetNftClaimRow = { wallet: string; catalog_key: string; planet_uid: string; mint_address: string; transaction_signature: string }

const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
function decodeBase58(value: string) {
  let number = 0n
  for (const character of value) {
    const digit = alphabet.indexOf(character)
    if (digit < 0) throw new Error('Invalid wallet address.')
    number = number * 58n + BigInt(digit)
  }
  const bytes: number[] = []
  while (number > 0n) { bytes.unshift(Number(number & 255n)); number >>= 8n }
  for (const character of value) { if (character !== '1') break; bytes.unshift(0) }
  return Buffer.from(bytes)
}

function isWalletAddress(value: unknown): value is string {
  if (typeof value !== 'string' || value.length < 32 || value.length > 44) return false
  try { return decodeBase58(value).length === 32 } catch { return false }
}

function isTransactionSignature(value: unknown): value is string {
  if (typeof value !== 'string' || value.length < 80 || value.length > 90) return false
  try { return decodeBase58(value).length === 64 } catch { return false }
}

function verifyWalletSignature(wallet: string, message: string, signatureBase64: string) {
  const signature = Buffer.from(signatureBase64, 'base64')
  if (signature.length !== 64 || signature.toString('base64') !== signatureBase64) return false
  const publicKeyDer = Buffer.concat([Buffer.from('302a300506032b6570032100', 'hex'), decodeBase58(wallet)])
  const publicKey = createPublicKey({ key: publicKeyDer, format: 'der', type: 'spki' })
  return verify(null, Buffer.from(message), publicKey, signature)
}

function issueToken(accountId: string) {
  const payload = Buffer.from(JSON.stringify({ sub: accountId, exp: Date.now() + sessionLifetimeMs })).toString('base64url')
  const signature = createHmac('sha256', secret).update(payload).digest('base64url')
  return `${payload}.${signature}`
}

type SessionIdentity = { accountId: string; setCookie?: string }
function isAccountId(value: unknown): value is string { return typeof value === 'string' && /^acct_[A-Za-z0-9_-]{32}$/.test(value) }
function newAccountId() { return `acct_${randomBytes(24).toString('base64url')}` }

function getSession(request: IncomingMessage): SessionIdentity | null {
  const token = request.headers.cookie?.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${sessionCookieName}=`))?.slice(sessionCookieName.length + 1)
  if (!token) return null
  const [payload, signature, ...extra] = token.split('.')
  if (!payload || !signature || extra.length) return null
  const expected = createHmac('sha256', secret).update(payload).digest()
  let actual: Buffer
  try { actual = Buffer.from(signature, 'base64url') } catch { return null }
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null
  try {
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString()) as { sub?: unknown; exp?: unknown }
    if (typeof claims.exp !== 'number' || claims.exp <= Date.now()) return null
    if (isAccountId(claims.sub)) return { accountId: claims.sub }
    // Upgrade existing wallet sessions without losing their server-side save.
    if (!isWalletAddress(claims.sub)) return null
    const linked = selectWalletAccount.get(claims.sub) as { account_id: string } | undefined
    const accountId = linked?.account_id ?? newAccountId()
    if (!linked) insertWalletAccount.run(claims.sub, accountId)
    return { accountId, setCookie: makeSessionCookie(issueToken(accountId)) }
  } catch { return null }
}

function enforceOrigin(request: IncomingMessage) {
  const origin = request.headers.origin
  if (!origin) return request.method === 'GET' || request.method === 'HEAD'
  if (allowedOrigin) return origin === allowedOrigin
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
}

function enforceHttps(request: IncomingMessage) {
  if (!requireForwardedHttps || process.env.NODE_ENV === 'development') return true
  const forwardedHeader = request.headers['x-forwarded-proto']
  const forwardedProtocol = (Array.isArray(forwardedHeader) ? forwardedHeader[0] : forwardedHeader)?.split(',')[0]?.trim().toLowerCase()
  return forwardedProtocol === 'https'
}

function rateLimit(request: IncomingMessage, key: string, limit = 900) {
  const now = Date.now()
  const ip = request.socket.remoteAddress || 'unknown'
  const bucketKey = `${ip}:${key}`
  const entry = requestWindows.get(bucketKey)
  if (!entry || now - entry.start >= 60_000) requestWindows.set(bucketKey, { start: now, count: 1 })
  else if (++entry.count > limit) return false
  if (requestWindows.size > 5000) for (const [entryKey, value] of requestWindows) if (now - value.start >= 60_000) requestWindows.delete(entryKey)
  return true
}

function allowGameAction(accountId: string, action: unknown) {
  if (typeof action !== 'string' || !gameActions.has(action)) return false
  if (action === 'mine') return true
  const { capacity, refillPerSecond } = action === 'open-basic-case' || action === 'open-advanced-case'
    ? { capacity: 2, refillPerSecond: 0.65 }
    : { capacity: 3, refillPerSecond: 0.8 }
  const now = Date.now()
  const key = `${accountId}:${action}`
  const bucket = actionBuckets.get(key) ?? { tokens: capacity, updatedAt: now }
  bucket.tokens = Math.min(capacity, bucket.tokens + ((now - bucket.updatedAt) / 1000) * refillPerSecond)
  bucket.updatedAt = now
  if (bucket.tokens < 1) { actionBuckets.set(key, bucket); return false }
  bucket.tokens -= 1
  actionBuckets.set(key, bucket)
  if (actionBuckets.size > 10_000) {
    for (const [bucketKey, value] of actionBuckets) if (now - value.updatedAt > 10 * 60_000) actionBuckets.delete(bucketKey)
  }
  return true
}

async function readJson(request: IncomingMessage) {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of request) {
    size += chunk.length
    if (size > 16_384) throw Object.assign(new Error('Request body is too large.'), { status: 413 })
    chunks.push(chunk)
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<string, unknown> }
  catch { throw Object.assign(new Error('Invalid JSON body.'), { status: 400 }) }
}

function securityHeaders(): Record<string, string> {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob:; connect-src 'self' https://api.devnet.solana.com; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'",
    ...(secureCookie ? { 'Strict-Transport-Security': 'max-age=31536000' } : {}),
  }
}

function respond(response: ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}) {
  response.writeHead(status, { ...securityHeaders(), 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers })
  response.end(JSON.stringify(body))
}

function makeSessionCookie(token: string, maxAgeSeconds = sessionLifetimeMs / 1000) {
  return `${sessionCookieName}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAgeSeconds}${secureCookie ? '; Secure' : ''}`
}

function clearSessionCookie() {
  return `${sessionCookieName}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secureCookie ? '; Secure' : ''}`
}

function refreshSessionCookie(session: SessionIdentity) {
  return { 'Set-Cookie': session.setCookie ?? makeSessionCookie(issueToken(session.accountId)) }
}

function withPlanetNftClaims(accountId: string, state: GameState): GameState {
  const claims = selectPlanetNftClaims.all(accountId) as PlanetNftClaimRow[]
  const byCatalogKey = new Map(claims.map((claim) => [claim.catalog_key, claim]))
  return {
    ...state,
    collection: state.collection.map((planet) => {
      const claim = byCatalogKey.get(planet.catalogKey)
      return claim
        ? { uid: planet.uid, catalogKey: planet.catalogKey, planetId: planet.planetId, discoveredAt: planet.discoveredAt, onChain: true, mintAddress: claim.mint_address, walletAddress: claim.wallet, transactionSignature: claim.transaction_signature }
        : { uid: planet.uid, catalogKey: planet.catalogKey, planetId: planet.planetId, discoveredAt: planet.discoveredAt, onChain: false }
    }),
  }
}

function getOrCreatePlayer(accountId: string): PlayerRecord {
  const row = selectPlayer.get(accountId) as PlayerRow | undefined
  if (row) return { state: withPlanetNftClaims(accountId, JSON.parse(row.state_json) as GameState), asteroid: JSON.parse(row.asteroid_json) as Asteroid }
  const state = structuredClone(INITIAL_GAME_STATE)
  const asteroid = rollAsteroid(Math.random, state.scannerActive, state.sectorsExplored, Date.now(), getEquippedRareAsteroidChance(state))
  return { state: withPlanetNftClaims(accountId, state), asteroid }
}

function persistPlayer(accountId: string, record: PlayerRecord) {
  const state = {
    ...record.state,
    collection: record.state.collection.map((planet) => ({ uid: planet.uid, catalogKey: planet.catalogKey, planetId: planet.planetId, discoveredAt: planet.discoveredAt, onChain: false })),
  }
  upsertPlayer.run(accountId, JSON.stringify(state), JSON.stringify(record.asteroid), Date.now())
}

function backupDatabase() {
  mkdirSync(backupDirectory, { recursive: true })
  const checkpoint = database.prepare('PRAGMA wal_checkpoint(FULL)').get() as { busy?: number } | undefined
  if (checkpoint?.busy) throw new Error('SQLite checkpoint is busy; backup was skipped.')
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const filename = `feni-game-${stamp}.sqlite`
  copyFileSync(databasePath, resolve(backupDirectory, filename))
  const backups = readdirSync(backupDirectory)
    .filter((entry) => /^feni-game-.*\.sqlite$/.test(entry))
    .sort()
    .reverse()
  for (const stale of backups.slice(7)) unlinkSync(resolve(backupDirectory, stale))
}

function applyAction(record: PlayerRecord, action: unknown, args: Record<string, unknown>): ActionResult | null {
  let state = record.state
  let asteroid = record.asteroid
  let result: Record<string, unknown> | undefined
  const accept = (next: GameState | null) => { if (!next) return false; state = next; return true }
  if (action === 'mine') {
    const mined = hitAsteroid(state, asteroid)
    state = mined.state
    result = { damage: mined.result.damage, destroyed: mined.result.destroyed, drops: mined.result.drops, energy: mined.result.energy, pulse: mined.result.pulse }
    if (mined.result.asteroid) asteroid = mined.result.asteroid
    else asteroid = rollAsteroid(Math.random, state.scannerActive, state.sectorsExplored, Date.now(), getEquippedRareAsteroidChance(state))
  } else if (action === 'open-basic-case' || action === 'open-advanced-case') {
    const opened = action === 'open-basic-case' ? openBasicCase(state) : openAdvancedCase(state)
    if (!opened) return null
    state = opened.state
    result = { planet: opened.planet, duplicate: opened.duplicate, compensation: opened.compensation }
  } else if (action === 'claim-quest') { if (!accept(claimMiniQuest(state, typeof args.id === 'string' ? args.id : ''))) return null }
  else if (action === 'craft-alloy') { if (!accept(craftAlloy(state))) return null }
  else if (action === 'craft-scanner') { if (!accept(craftScanner(state))) return null }
  else if (action === 'craft-drill') { if (!accept(craftDrill(state))) return null }
  else if (action === 'build-recycler') { if (!accept(buildRecycler(state))) return null }
  else if (action === 'upgrade-recycler') { if (!accept(upgradeRecycler(state))) return null }
  else if (action === 'recycle-nickel') { if (!accept(recycleResource(state, 'nickel'))) return null }
  else if (action === 'recycle-silicon') { if (!accept(recycleResource(state, 'silicon'))) return null }
  else if (action === 'craft-condenser') { if (!accept(craftOrUpgradeCondenser(state))) return null }
  else if (action === 'craft-relay') { if (!accept(craftRelay(state))) return null }
  else if (action === 'travel') {
    const next = travelToNextSector(state)
    if (!next) return null
    state = next
    asteroid = rollAsteroid(Math.random, state.scannerActive, state.sectorsExplored, Date.now(), getEquippedRareAsteroidChance(state))
  } else if (action === 'toggle-planet') { if (!accept(togglePlanetEquip(state, typeof args.catalogKey === 'string' ? args.catalogKey : ''))) return null }
  else return null
  return { state, asteroid, result }
}

async function serveStatic(pathname: string, response: ServerResponse) {
  const root = resolve(process.cwd(), 'dist')
  let filePath: string
  try { filePath = resolve(root, `.${decodeURIComponent(pathname)}`) }
  catch { respond(response, 400, { error: 'Invalid path.' }); return }
  if (filePath !== root && !filePath.startsWith(root + sep)) filePath = resolve(root, 'index.html')
  try { if ((await stat(filePath)).isDirectory()) filePath = resolve(filePath, 'index.html') }
  catch { filePath = resolve(root, 'index.html') }
  try {
    const body = await readFile(filePath)
    const mime: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json; charset=utf-8', '.ico': 'image/x-icon', '.woff2': 'font/woff2' }
    response.writeHead(200, { ...securityHeaders(), 'Content-Type': mime[extname(filePath)] ?? 'application/octet-stream' })
    response.end(body)
  } catch { respond(response, 404, { error: 'Not found.' }) }
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`)
  if (url.pathname === '/api/health' && request.method === 'GET') { respond(response, 200, { ok: true }); return }
  if (!enforceHttps(request)) { respond(response, 400, { error: 'HTTPS is required. Check the trusted reverse proxy configuration.' }); return }
  if (!enforceOrigin(request)) { respond(response, 403, { error: 'Origin not allowed.' }); return }
  if (url.pathname === '/api/auth/challenge' && request.method === 'POST') {
    if (!rateLimit(request, 'auth', 30)) { respond(response, 429, { error: 'Too many wallet-link attempts.' }); return }
    try {
      const session = getSession(request)
      if (!session) { respond(response, 401, { error: 'Load the guest game save before linking a wallet.' }); return }
      const body = await readJson(request)
      if (!isWalletAddress(body.address)) { respond(response, 400, { error: 'Invalid Solana wallet address.' }); return }
      const nonce = randomBytes(24).toString('base64url')
      const message = `Link wallet to FeNi Cosmic Miner\nWallet: ${body.address}\nNonce: ${nonce}\nThis links the wallet to the current browser save and does not trigger a blockchain transaction.`
      for (const [key, pending] of challenges) if (pending.expiresAt < Date.now()) challenges.delete(key)
      if (challenges.size >= 10_000) challenges.delete(challenges.keys().next().value!)
      challenges.set(`${session.accountId}:${body.address}`, { accountId: session.accountId, nonce, message, expiresAt: Date.now() + 5 * 60_000 })
      respond(response, 200, { message }, refreshSessionCookie(session))
    } catch (error) { respond(response, Number((error as { status?: number }).status ?? 400), { error: error instanceof Error ? error.message : 'Request failed.' }) }
    return
  }
  if (url.pathname === '/api/auth/verify' && request.method === 'POST') {
    if (!rateLimit(request, 'auth-verify', 30)) { respond(response, 429, { error: 'Too many wallet-link attempts.' }); return }
    try {
      const session = getSession(request)
      if (!session) { respond(response, 401, { error: 'The guest save session expired. Reload the game and try again.' }); return }
      const body = await readJson(request)
      if (!isWalletAddress(body.address) || typeof body.signature !== 'string') { respond(response, 400, { error: 'Wallet signature is required.' }); return }
      const challengeKey = `${session.accountId}:${body.address}`
      const challenge = challenges.get(challengeKey)
      challenges.delete(challengeKey)
      if (!challenge || challenge.accountId !== session.accountId || challenge.expiresAt < Date.now() || !verifyWalletSignature(body.address, challenge.message, body.signature)) { respond(response, 401, { error: 'Wallet signature is invalid or expired.' }); return }
      const existing = selectWalletAccount.get(body.address) as { account_id: string } | undefined
      if (existing && existing.account_id !== session.accountId) { respond(response, 409, { error: 'This wallet is already linked to a different game save.' }); return }
      if (!existing) insertWalletAccount.run(body.address, session.accountId)
      const record = getOrCreatePlayer(session.accountId)
      const linkedWallets = (selectWalletsForAccount.all(session.accountId) as { wallet: string }[]).map((entry) => entry.wallet)
      respond(response, 200, { ok: true, state: record.state, asteroid: record.asteroid, wallets: linkedWallets }, refreshSessionCookie(session))
    } catch (error) { respond(response, 400, { error: error instanceof Error ? error.message : 'Wallet linking failed.' }) }
    return
  }
  if (url.pathname === '/api/auth/logout' && request.method === 'POST') {
    respond(response, 200, { ok: true }, { 'Set-Cookie': clearSessionCookie() })
    return
  }
  if (!url.pathname.startsWith('/api/')) {
    if (process.env.NODE_ENV !== 'development') { await serveStatic(url.pathname, response); return }
    respond(response, 404, { error: 'Not found.' })
    return
  }
  let session = getSession(request)
  if (!session && url.pathname === '/api/game' && request.method === 'GET') {
    if (!rateLimit(request, 'guest-bootstrap', 30)) { respond(response, 429, { error: 'Too many guest sessions from this network. Try again shortly.' }); return }
    session = { accountId: newAccountId() }
  }
  if (!session) { respond(response, 401, { error: 'The guest game session is missing. Reload the game.' }); return }
  const accountId = session.accountId
  if (url.pathname === '/api/game' && request.method === 'GET') {
    if (!rateLimit(request, `player:${accountId}`, 900)) { respond(response, 429, { error: 'Too many game actions. Slow down and try again.' }); return }
    database.exec('BEGIN IMMEDIATE')
    let record: PlayerRecord
    try { record = getOrCreatePlayer(accountId); persistPlayer(accountId, record); database.exec('COMMIT') }
    catch (error) { database.exec('ROLLBACK'); throw error }
    const wallets = (selectWalletsForAccount.all(accountId) as { wallet: string }[]).map((entry) => entry.wallet)
    respond(response, 200, { state: record.state, asteroid: record.asteroid, wallets }, refreshSessionCookie(session))
    return
  }
  if (url.pathname === '/api/game/nft/claim' && request.method === 'POST') {
    if (!rateLimit(request, `player:${accountId}`, 900)) { respond(response, 429, { error: 'Too many game actions. Slow down and try again.' }); return }
    if (!rateLimit(request, `planet-nft-claim:${accountId}`, 5)) { respond(response, 429, { error: 'Too many NFT verification requests. Retry shortly.' }); return }
    try {
      const body = await readJson(request)
      const planetUid = typeof body.planetUid === 'string' && body.planetUid.length <= 96 ? body.planetUid : ''
      const wallet = body.walletAddress
      const mintAddress = body.mintAddress
      const signature = body.signature
      if (!planetUid || !isWalletAddress(wallet) || !isWalletAddress(mintAddress) || !isTransactionSignature(signature)) {
        respond(response, 400, { error: 'Planet, mint address, and Solana transaction signature are required.' }); return
      }
      const linkedWallet = selectWalletAccount.get(wallet) as { account_id: string } | undefined
      if (linkedWallet?.account_id !== accountId) { respond(response, 403, { error: 'Link this wallet to the guest save before claiming a planet NFT.' }); return }

      let record = getOrCreatePlayer(accountId)
      let discovered = record.state.collection.find((planet) => planet.uid === planetUid)
      if (!discovered) { respond(response, 409, { error: 'This planet is not in the guest save collection.' }); return }
      const existing = selectPlanetNftClaim.get(accountId, discovered.catalogKey) as { wallet: string; planet_uid: string; mint_address: string; transaction_signature: string } | undefined
      if (existing) {
        if (existing.wallet === wallet && existing.planet_uid === planetUid && existing.mint_address === mintAddress && existing.transaction_signature === signature) {
          respond(response, 200, { state: record.state, asteroid: record.asteroid, wallets: [wallet] }, refreshSessionCookie(session)); return
        }
        respond(response, 409, { error: 'An NFT has already been claimed for this planet.' }); return
      }

      const catalogPlanet = PLANETS.find((planet) => planet.key === discovered!.catalogKey)
      if (!catalogPlanet || !allowedOrigin) { respond(response, 503, { error: 'NFT claim verification is not configured for this site.' }); return }
      const expectedMetadataUri = new URL(`/nft/planets/${catalogPlanet.key}.json`, allowedOrigin).toString()
      await verifyPlanetNftMint({
        wallet,
        mintAddress,
        signature,
        planetId: discovered.planetId,
        planetName: catalogPlanet.name,
        catalogKey: catalogPlanet.key,
        expectedMetadataUri,
      })

      database.exec('BEGIN IMMEDIATE')
      try {
        record = getOrCreatePlayer(accountId)
        discovered = record.state.collection.find((planet) => planet.uid === planetUid)
        if (!discovered) {
          database.exec('ROLLBACK')
          respond(response, 409, { error: 'This planet is no longer in the player collection.' }); return
        }
        const latestClaim = selectPlanetNftClaim.get(accountId, discovered.catalogKey) as { wallet: string; planet_uid: string; mint_address: string; transaction_signature: string } | undefined
        if (latestClaim) {
          database.exec('ROLLBACK')
          if (latestClaim.wallet === wallet && latestClaim.planet_uid === planetUid && latestClaim.mint_address === mintAddress && latestClaim.transaction_signature === signature) {
            const current = getOrCreatePlayer(accountId)
            respond(response, 200, { state: current.state, asteroid: current.asteroid, wallets: [wallet] }, refreshSessionCookie(session)); return
          }
          respond(response, 409, { error: 'An NFT has already been claimed for this planet.' }); return
        }
        insertPlanetNftClaim.run(wallet, discovered.catalogKey, planetUid, mintAddress, signature, Date.now())
        const updated = { state: withPlanetNftClaims(accountId, record.state), asteroid: record.asteroid }
        persistPlayer(accountId, updated)
        database.exec('COMMIT')
        const wallets = (selectWalletsForAccount.all(accountId) as { wallet: string }[]).map((entry) => entry.wallet)
        respond(response, 200, { state: updated.state, asteroid: updated.asteroid, wallets }, refreshSessionCookie(session))
      } catch (error) {
        database.exec('ROLLBACK')
        if (error instanceof Error && /UNIQUE constraint failed|PRIMARY KEY constraint failed/.test(error.message)) {
          respond(response, 409, { error: 'This NFT or transaction has already been claimed.' }); return
        }
        throw error
      }
    } catch (error) {
      const status = error instanceof PlanetNftVerificationError ? error.status : Number((error as { status?: number }).status ?? 400)
      respond(response, status, { error: error instanceof Error ? error.message : 'NFT verification failed.' })
    }
    return
  }
  if (url.pathname === '/api/game/action' && request.method === 'POST') {
    try {
      const body = await readJson(request)
      if (typeof body.action !== 'string' || !gameActions.has(body.action)) { respond(response, 400, { error: 'Unknown game action.' }); return }
      if (body.action !== 'mine' && !rateLimit(request, `player:${accountId}`, 900)) { respond(response, 429, { error: 'Too many game actions. Slow down and try again.' }); return }
      if (!allowGameAction(accountId, body.action)) { respond(response, 429, { error: 'This game action is being requested too quickly. Slow down and try again.' }); return }
      const args = body.args && typeof body.args === 'object' && !Array.isArray(body.args) ? body.args as Record<string, unknown> : {}
      database.exec('BEGIN IMMEDIATE')
      try {
        const current = getOrCreatePlayer(accountId)
        const update = applyAction(current, body.action, args)
        if (!update) { database.exec('ROLLBACK'); respond(response, 409, { error: 'Action is not available with the current game progress.' }); return }
        persistPlayer(accountId, update)
        database.exec('COMMIT')
        respond(response, 200, update, refreshSessionCookie(session))
      } catch (error) { database.exec('ROLLBACK'); throw error }
    } catch (error) { respond(response, Number((error as { status?: number }).status ?? 400), { error: error instanceof Error ? error.message : 'Game action failed.' }) }
    return
  }
  if (url.pathname.startsWith('/api/')) { respond(response, 404, { error: 'API route not found.' }); return }
})

try { backupDatabase() } catch { console.error('Initial SQLite backup failed; check GAME_BACKUP_DIR and disk permissions.') }
const backupTimer = setInterval(() => {
  try { backupDatabase() }
  catch { console.error('Scheduled SQLite backup failed; check backup disk capacity and permissions.') }
}, 24 * 60 * 60_000)
backupTimer.unref()

let shuttingDown = false
function shutdown() {
  if (shuttingDown) return
  shuttingDown = true
  clearInterval(backupTimer)
  server.close(() => {
    try { backupDatabase() }
    catch { console.error('Final SQLite backup failed; check backup disk capacity and permissions.') }
    database.close()
    process.exit(0)
  })
}

server.listen(port, '0.0.0.0', () => console.log(`FeNi game server listening on http://localhost:${port}`))
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
