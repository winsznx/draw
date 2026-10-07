# Track proof modality

This hackathon process record covers the track DRAW enters and what would undercut the entry. The product is in [PRODUCT.md](PRODUCT.md) and the proof in [PROOF.md](PROOF.md).

## The track

Track 3, Investment Infrastructure: Funds, DAOs & Governance Tools, confirmed by the owner on 2026-10-07. Track 1, Real-World Assets (RWA) & Business Workflows, was the fallback.

What Track 3 expects, item by item, and what DRAW offers for each is in [RUBRIC_ARTIFACT_MAP.md](RUBRIC_ARTIFACT_MAP.md#track-3-expected-output). The proof chain, from an issued call to the unpaid notice that stays unresolved, is in [PROOF.md](PROOF.md#the-proof-chain).

## What would undercut this entry

Each bullet names something that would weaken the entry, then says where DRAW stands on it today.

- The proof shrinks to "the tests passed" and never shows what changes for the fund. The README opens with the product and the problem, and the demo opens on the fund's question of how much of the call it can deploy.
- A notice shows as funded without a read-back receipt that passed all 14 checks. The app counts a notice as funded only with that receipt, and shows "Settled, verification pending" until it exists.
- The only payment that moves is the test token in the `draw-tests` package. That package never leaves Daml Script, and the ledger runs settle in Amulet on LocalNet and Canton Coin on DevNet.
- The README or the app says DevNet before a DevNet run exists. The DevNet runs are in [evidence/devnet/runs](../evidence/devnet/runs).
- Privacy rests on the app filtering one dataset the fund can see. Every query runs as the seat's own party, so the ledger decides what each LP gets back. On DevNet one backend client acts for every demo seat, so LP-from-LP credential separation is shown on LocalNet only.
