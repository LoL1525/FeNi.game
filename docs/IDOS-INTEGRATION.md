# iDos publishing and integration notes

## Superteam Kazakhstan × iDos Games side track

The [side-track listing](https://superteam.fun/earn/listing/superteam-kazakhstan-x-idos-games-side-track/) describes a $5,000 USDG prize pool and eligibility for builders in Kazakhstan. It asks for a working game created using iDos Games AI, a meaningful Solana integration, and a hackathon submission. The listing asks projects to provide a playable product, demo, project link, and short description. Its judging categories include creativity, gameplay and UX, Solana integration, and execution.

The current FeNi repository is a React + TypeScript + Vite browser game with a Node API. It has an optional Solana Devnet wallet and planet NFT flow, but no documented iDos Games AI or iDos Unity Engine integration. Treat FeNi's existing code and Solana features as project status; do not describe the iDos requirement as completed until the submission route has been confirmed and the relevant integration exists.

## iDos Games Engine

The [iDos Games documentation](https://docs.idosgames.com/) describes a cross-platform engine with a Unity SDK and WebGL support. The [Unity quick start](https://docs.idosgames.com/start/quick-start-unity-sdk) describes configuring a Unity project. FeNi is not a Unity project, and this repository does not include iDos SDK configuration. The available documentation does not establish that an arbitrary React/Vite app can be uploaded as an iDos Engine title.

Before investing in a port, confirm with iDos whether the side track accepts an independently hosted web game or requires a game built in its engine/AI workflow. If a Unity project is required, FeNi needs a Unity implementation or a separately scoped integration; changing the app stack is not a documentation-only task.

## iDos public launchpad

The [iDos Games site](https://idosgames.com/) describes a public launch flow that includes a game token. That is separate from the engine and from hosting a conventional web game. FeNi currently has no fungible token, token sale, paid advantage, or mainnet transaction. No token has been created or published from this repository.

Do not treat token creation as a prerequisite for using Solana in FeNi: the existing optional Devnet NFT flow is a separate integration. Any decision to use a token launchpad would change the project's current product boundary and require an explicit design for the token and the wallet-signed transaction.

## Current deployment state

The game can be run locally with `npm run dev` and built with `npm run build`. Wallet and NFT flows target Solana Devnet. The project has not been uploaded to iDos or submitted to the side track by this repository. See [the README](../README.md) for setup and [the roadmap](ROADMAP.md) for proposed work.
