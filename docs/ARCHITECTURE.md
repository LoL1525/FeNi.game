# FeNi architecture

## Components

| Part | Technology | Responsibility |
| --- | --- | --- |
| Game client | React, TypeScript, Vite | Renders screens, collects input, displays server results, and connects an optional wallet. |
| Game API | Node.js, TypeScript | Authenticates guest sessions, validates actions, calculates authoritative game results, and exposes `/api` routes. |
| Save store | SQLite via `node:sqlite` | Stores player state, current asteroid, wallet associations, and verified planet NFT claims. |
| Solana client | Wallet Standard, `@solana/kit`, Metaplex Token Metadata Kit | Connects a wallet and supports the optional Devnet planet NFT flow. |
| Static NFT assets | JSON and SVG in `public/nft/planets` | Provides metadata and artwork for the planet catalog. |

## Save and action flow

1. A new browser receives a signed, `HttpOnly` guest-session cookie. Its random account ID is the key used for the server-side save.
2. The browser requests the current game state and sends an action such as mining, opening a case, crafting, or traveling.
3. The API validates the session and action, loads the save, and calculates costs and results using server code.
4. The API writes the updated state and asteroid back to SQLite and returns the result to the client.

The browser does not submit the final resource reward or case result. Editing local storage or changing the rendered UI does not by itself update the authoritative save. This reduces straightforward save tampering; it is not a complete bot or fraud prevention system. Mining has no per-click cooldown, while HTTP request limits and selected action guards still apply.

## Wallet and NFT flow

Wallet connection is optional and does not determine a player's save identity. The user signs a message to link a wallet to the active guest save. The signature is used as proof of wallet control and does not itself submit a blockchain transaction.

For a planet NFT, the user reviews and signs a Devnet mint transaction in their wallet. The API verifies the transaction, wallet, token ownership, Metaplex metadata, and master edition, then stores a claim record. The API does not treat a client-side “claimed” flag as proof. Planet JSON and SVG assets are currently served by this project, so their URLs depend on the game host remaining available.

No game resource balance, asteroid click, case opening, or achievement is written to Solana. The repository does not currently include a fungible game token or a deployed FeNi achievement program.

## Data at rest and secrets

The default local database is `data/feni-game.sqlite`; the development runner stores its generated cookie-signing key at `data/.game-auth-secret`. The `data/` directory is ignored by Git. For production, set a persistent `GAME_AUTH_SECRET` and keep it stable across restarts, and point `GAME_DATA_DIR` at persistent storage. A changed signing secret invalidates existing guest cookies.

The server creates SQLite backups at startup, daily, and during graceful shutdown, retaining the latest seven in the configured backup directory. A backup on the same disk does not protect against disk loss; production should use a separate persistent backup volume and periodically verify restores.

## Deployment shape and limits

The built Node process serves both the Vite output and API routes. Place it behind a trusted HTTPS reverse proxy that sets `X-Forwarded-Proto`; configure `GAME_SITE_ORIGIN` to the exact public HTTPS origin. Use one API process with persistent storage. SQLite is suitable for this single-instance prototype; horizontal scaling requires a shared database and a review of session, rate-limit, and backup behavior.

The NFT flow defaults to Solana Devnet and generated metadata must be available at the configured public origin. Before a production NFT launch, move metadata and artwork to durable storage, review the transaction flow, and explicitly configure the intended network. These steps have not been completed in this repository.
