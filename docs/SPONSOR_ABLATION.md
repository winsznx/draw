# Token Standard ablation

This hackathon process record covers one removal test: what DRAW would lose if its CIP-0056 Token Standard settlement were replaced by an application-level paid flag. The product is in [PRODUCT.md](PRODUCT.md), the full comparison in [CANTON_ABLATION.md](CANTON_ABLATION.md) and the proof in [PROOF.md](PROOF.md).

## The question

If the Token Standard integration were replaced by an application-level `paid=true`, would the product be just as convincing?

No, because with Token Standard settlement the payment carries the notice's reference in fields the Daml contract reads (`settlementRef.id` and `transferLegId`), the notice turns funded in the same transaction that moves the money, and a settled allocation is consumed, so it can't fund a second notice. With a paid flag each of those checks is application code that can be skipped, and on LocalNet an attacker with write access to the paid-flag database, as an operator or a compromised app server would have, marked a notice funded with no money moved and reused one payment for another notice, and DRAW stopped both. The money shows it too: in the canonical runs on LocalNet and on DevNet the fund received exactly the 75 units it counted as funded, LP A's balance fell by 40, LP B's by 35, and LP C's didn't change.

The six-row table of what disappears without the Token Standard is in [CANTON_ABLATION.md](CANTON_ABLATION.md#what-disappears-without-the-token-standard).

## Where the integration is still thin

- The fund clicks Settle. Automatic settlement of exact matches is written behind `DRAW_AUTO_SETTLE=true` and hasn't run against a ledger, and even then someone has to hold the fund's submission rights.
- Settlement has run with Amulet on LocalNet and Canton Coin on DevNet. For a production asset, DRAW uses the Token Standard allocation interface, which the USDCx registry supports. Not run with USDCx.
- The LP creates its allocation through the registry's factory, with contracts disclosed by Scan. If the registry is down, no payment can be made. That's the safe way to fail, and there's no fallback.
- Since package 0.3.0 each LP's call also reaches it as a CIP-0056 AllocationRequest. On DevNet LP A paid from it in the scripted runs, through the backend client in the newest run and the shared login before. The node's Canton Coin wallet lists the request and pays it with Accept, shown for an LP signed in with the team's own login. That LP's wallet party sits on the fund's own node, which has DRAW's package. A wallet on another validator would need DRAW's package vetted there first, because every participant that confirms a DRAW transaction must have vetted it.
