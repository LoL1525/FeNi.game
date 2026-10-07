# iDos: publishing and integration notes

## What the linked listing says

The [Superteam Kazakhstan × iDos Games Side Track](https://superteam.fun/earn/listing/superteam-kazakhstan-x-idos-games-side-track) is a Superteam Earn side-track listing. Its visible requirements are regional eligibility (Kazakhstan), a submission to the current Solana Global Hackathon side track, and a design skill focus. The page is not an iDos SDK setup guide and does not describe an upload API or deployment credentials. It lists the winner announcement for October 27, 2026.

## The two iDos paths are different

### iDos Games Engine

The [official iDos Games documentation](https://docs.idosgames.com/) describes a cross-platform game engine, a Unity SDK, and WebGL support. Its [Unity quick start](https://docs.idosgames.com/start/quick-start-unity-sdk) requires importing the iDos Unity SDK and configuring a title. The docs also say the engine's modules can be enabled or disabled.

This project is a React + TypeScript + Vite browser game. The published docs do not describe a native React SDK or a direct upload flow for an arbitrary Vite `dist` directory. A native engine integration therefore needs either an iDos-approved way to host a regular web app, or a Unity/WebGL port. Neither has been configured in the local project.

### iDos Games public launchpad

The [public iDos Games FAQ](https://idosgames.com/) describes creating a dApp by describing the game and its token, connecting a crypto wallet, then publishing. It says each game has its own tradable token on a bonding curve. That is a different path from simply hosting this static game.

Launching there would introduce a game token and require a wallet-signed publish action. The current game brief explicitly excludes a token, financial promises, and paid advantage, so no token was created and no publish transaction was initiated.

## Current local deliverable

The working game is in this folder and builds to `dist/` with `npm run build`. Gameplay and saves remain off-chain; the optional browser wallet is configured for Solana Devnet. The game has not been uploaded to iDos or submitted to the Superteam listing.

## Decision needed for a true iDos deployment

1. **Preserve the no-token requirement:** use the iDos Games Engine route, but first confirm whether iDos accepts this React/WebGL output. If it requires Unity, the game needs a Unity port and an iDos title/project configuration.
2. **Use the public launchpad:** explicitly authorize the platform's token-based publishing flow and provide/choose the publishing wallet. That changes the earlier no-token requirement and must include the wallet's review of the exact on-chain transaction.

The safer default is to preserve the no-token rule and verify the React/WebGL hosting path before changing the game stack.
