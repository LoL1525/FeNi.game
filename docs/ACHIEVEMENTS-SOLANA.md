# FeNi achievement proofs on Solana

## Current state

The game now has 28 achievement definitions and a progress journal. Progress is calculated from the browser save, so it is useful for the prototype but is **not trustworthy**: a player can edit local storage or call the client logic directly. The UI marks these unlocks as local and does not present them as Solana proofs.

## Proof model for Devnet

Use a small FeNi achievement program that creates one program-owned account for each `(player wallet, achievement id)` pair. Derive the account as a PDA with seeds such as `achievement`, the player's public key, and the one-byte achievement id. Store the wallet, id, and award slot in the account. The deterministic address makes a second account for the same achievement impossible under that program.

The program must require both the player's signature and a signer recorded as the authorized verifier in program configuration. The browser must never hold the verifier key. The verifier runs on the game backend, authenticates the wallet with a signed one-time nonce, keeps canonical player progress server-side, and checks the achievement conditions before authorizing a claim. The player signs the final transaction; gameplay clicks and resource changes remain off-chain.

When displaying a proof, the client checks that the account is owned by the FeNi program, exists at the expected PDA, and contains the expected wallet and achievement id. A random account, a client-side badge, or an arbitrary NFT with similar metadata is not proof.

## Required before enabling claims

1. Implement and review the Anchor program and its verifier/config initialization.
2. Deploy it to Devnet and record the resulting program id.
3. Run the game API with durable account storage and rate-limited, server-authoritative progress updates.
4. Store the verifier key only in the API's secret manager; never in Vite variables or browser code.
5. Add the program id and API origin to deployment configuration, then test duplicate claims, wrong-wallet accounts, unknown ids, and unauthorized verifiers on Devnet.

Until those pieces are deployed, the achievement screen intentionally offers no “claim” action that could be mistaken for a genuine on-chain proof.
