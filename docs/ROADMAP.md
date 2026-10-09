# FeNi roadmap

This roadmap records candidate work for turning the current MVP into a more complete public game. Items below are proposals; they are not current features or delivery promises.

## 1. Public playable demo

- Deploy the web client and Node API together at a stable HTTPS origin.
- Use persistent storage for the SQLite database and a separate backup location.
- Add a public demo link and a short gameplay video to the repository after publishing them.
- Document the supported browser, wallet, and network setup.

## 2. Durable planet collectibles

- Move planet JSON metadata and SVG artwork to durable content-addressed storage.
- Confirm the public URLs and metadata remain available before enabling NFT minting on any network beyond Devnet.
- Document the mint transaction and show users which network and fees they are approving.

## 3. Trusted achievements

- Keep achievement progress server-authoritative before treating it as a reward.
- Implement and audit the proposed Solana program and verifier described in [ACHIEVEMENTS-SOLANA.md](ACHIEVEMENTS-SOLANA.md).
- Make claims idempotent and verify duplicate, wrong-wallet, and unauthorized-verifier cases before deployment.

## 4. Production scaling

- Evaluate PostgreSQL and shared session/rate-limit storage if the game needs multiple API instances.
- Add operational monitoring, restore drills, and a documented secret rotation procedure.
- Revisit rate limits and abuse controls using real gameplay data while keeping mining input responsive.

## Product boundaries

The current prototype has no fungible game token, paid advantage, or mainnet transaction. Any later token or paid feature would need a separate product, security, and legal review before implementation.
