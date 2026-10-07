# FeNi · Cosmic Miner

A browser based space mining and planet collection game. The browser renders the game, while an authenticated Node API owns the authoritative progress and resource balances.

## Run locally

Requirements: Node.js 22.13+ (the API uses Node's built-in SQLite support).

```bash
npm install
npm run dev
```

`npm run dev` builds and starts both the Vite site and the game API. Open the local URL printed by Vite (usually `http://localhost:5173`); the game starts in guest mode without a wallet. Progress is stored on the server and identified by a secure browser cookie. The first dev launch generates a server-side signing secret in `data/.game-auth-secret`; later launches reuse it, so the same browser session survives a dev-server restart. This is an HMAC signing key for guest-session cookies, not a Solana wallet key and not a game balance. Keep the file, the SQLite database, and the browser cookie together. They are local development data and are ignored by Git. Deleting or moving them can make that guest save inaccessible. An explicitly configured `GAME_AUTH_SECRET` overrides the file and must also stay unchanged between launches. Connect and link a wallet only if you want to mint NFTs.

Run `npm run test:integration` to build the API and check this flow end to end: the check starts the API, creates a guest save, mines once, restarts the API, and verifies that the same cookie loads the saved state and asteroid. It uses a temporary database and removes it after the check.

For production, run `npm run build`, then run `npm start` with these runtime environment variables:

- `GAME_AUTH_SECRET`: a unique, persistent random secret of at least 32 characters. Never use a `VITE_` prefix.
- `GAME_SITE_ORIGIN`: the exact public HTTPS origin serving both the site and `/api` routes.
- `GAME_DATA_DIR`: a persistent writable directory for SQLite; defaults to `./data`.
- `GAME_BACKUP_DIR`: optional backup directory; defaults to `GAME_DATA_DIR/backups`. Point it at a separate persistent volume for protection against disk loss.
- `GAME_SOLANA_RPC_URL`: optional server-side Solana RPC endpoint; defaults to Devnet.
- `PORT`: optional hosting-platform port; defaults to `8787`.

The production Node process serves both `dist/` and the API. Put it behind a trusted HTTPS reverse proxy that overwrites `X-Forwarded-Proto`; when `GAME_SITE_ORIGIN` is HTTPS, the API rejects requests the proxy does not mark as HTTPS. Do not expose the app port directly to the internet or trust client-supplied proxy headers. Use one API instance with a persistent disk; ephemeral or multi-instance hosting needs a shared database such as PostgreSQL before deployment. The server creates a SQLite backup at startup, daily, and during graceful shutdown, and retains the latest seven files. For disaster recovery, use a separate persistent backup volume and periodically test restoring it. Vite preview is static and does not run the API.

## MVP loop

- Click the asteroid or **Strike asteroid** until its integrity reaches zero. Asteroid families have different durability and resource drops.
- Iron, Copper, Nickel, and Silicon are awarded by server-side mining rules. The browser cannot submit resource amounts or asteroid rewards.
- The Basic Case costs **220 Iron + 120 Copper** and reveals a world from the 31-planet Solar Fringe catalog.
- Discovered planets show their ID, rarity, mass, temperature, atmosphere, resources, and modest mining bonus. The Collection screen keeps undiscovered worlds sealed.
- In the lab, **100 Iron + 50 Copper + 20 Silicon** makes one Alloy. One Alloy + 5 Nickel makes an Advanced Scanner; while active, it improves rare asteroid and case odds.
- Unlock later sectors from the Star Map with the listed resources and equipment. Sector 1 equips one planet, sector 2 equips two, and sector 3 onward equips three.

## Solana status

Wallet Standard detects compatible wallets (such as Phantom and Solflare) and connects them to **Solana Devnet**. Wallets are optional: ordinary gameplay uses the server-managed guest save and does not send blockchain transactions. Signing a message only links the connected wallet to the current save; it is not an on-chain transaction.

After deploying the game to a public HTTPS URL, set `VITE_PUBLIC_URL` to that origin before building and set `GAME_SITE_ORIGIN` to the same origin at runtime. The build generates static planet metadata and SVG art under `public/nft/planets`. NFT minting is enabled only when the public URL is configured and the JSON and SVG files are reachable. To mint a discovered planet, connect and link a wallet, then use its collection card; each transaction uses test SOL on Devnet and is linked to Solana Explorer. The server waits for finalization, checks the linked wallet, one-token balance, Metaplex metadata and master edition, then records the claim in SQLite. The client cannot mark an NFT as claimed by itself. These are standard Metaplex Token Metadata NFTs with zero royalties. The metadata and art are hosted by the game site; use IPFS or Arweave before promising long-term permanence.

The game API issues `HttpOnly`/`Secure`/`SameSite` guest sessions and stores progress under a random server account ID, independent of any wallet. Wallet signatures only verify an optional wallet link for NFT actions. The API calculates mining drops, case results, costs, and upgrades on the server, so changing browser storage or client-side code cannot directly change the saved balance. Per-action server limits slow automated farming, but they do not make botting impossible. API and static responses include security headers. The optional NFT flow remains a Devnet prototype and does not make the game economy on-chain. No game token, paid advantage, or mainnet transaction is included.

The local dev runner persists its generated cookie-signing secret under `GAME_DATA_DIR` (by default `data/.game-auth-secret`). Production does not use that local secret file: configure `GAME_AUTH_SECRET` as a persistent server environment variable and keep it stable across deploys, or existing guest cookies will stop verifying.

Existing local-only saves are left untouched but are not imported into online saves, since their contents cannot be trusted. Existing server-side wallet saves are migrated to random account IDs and retain their wallet association.

Planet bonuses are active only while a planet is equipped. The equipment limit is one planet in sector 1, two in sector 2, and three from sector 3 onward.

The requested iDos deployment is not represented as complete. The linked Superteam page is a regional side-track listing, while iDos's Unity engine and public token launchpad have different integration paths. See [docs/IDOS-INTEGRATION.md](docs/IDOS-INTEGRATION.md) before choosing the route; no token or publish transaction has been created.

## Project structure

- `src/game/data.ts` — asteroid, drop, resource, case, and planet catalogs.
- `src/game/engine.ts` — pure mining, case, and crafting rules.
- `src/game/serverApi.ts` — guest save and optional wallet-link API client.
- `server/index.ts` — authoritative game API, guest sessions, optional wallet links, action limits, SQLite persistence/backups, and NFT claim records.
- `server/planetNft.ts` — server-side Devnet transaction, token ownership, and Metaplex account verification.
- `vite.server.config.ts` — bundles the Node API for production.
- `src/solana/client.ts` — Devnet Wallet Standard client.
- `src/solana/claims.ts` — Devnet NFT minting and public metadata URL checks.
- `scripts/generate-nft-metadata.mjs` — builds static JSON metadata and SVG art for the planet collection.
- `src/components/WalletButton.tsx` — connect/disconnect wallet UI.
- `src/App.tsx` and `src/App.css` — screens and presentation.
