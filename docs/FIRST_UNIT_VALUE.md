# First-unit value

The smallest useful deployment is one fund, run by its manager or its administrator, with two LPs, one call and one settlement instrument. It needs no other funds, marketplace, lenders or data network. This page says what that first fund gets, what its first LPs need, and what has been shown at that size.

## What the first fund gets

- A call issued once, producing a separate notice per LP, each a contract between the fund and that LP that no other LP or outsider can read.
- Payments that either match the notice exactly or are refused by the ledger with a stated reason. There is no "looks about right" match.
- A notice that turns funded in the same transaction that moves the money, plus a 14-check receipt from a read-back step.
- A deployable figure that is the sum of verified notices, and an explicit unresolved list of late, mismatched and in-review notices.
- A note on every review, reopen, release and waive decision, recorded on the ledger. Marking a notice overdue takes no note, and the ledger allows it only after the due time.

What that's worth to a fund in hours or errors hasn't been measured. It's a hypothesis until a pilot measures it.

## What it needs from the first LPs

- A Canton party, hosted by the LP or by a provider it trusts.
- Holdings in the settlement instrument. Today that's Canton Coin from the faucet on DevNet and Amulet on LocalNet. A real pilot needs an instrument the fund and LPs already accept, for example a tokenized dollar on Canton.

That second requirement is the real cold-start cost. A fund whose LPs only pay by wire still gets the private notices and the explicit unresolved list, but its notices can't turn funded with the payment ([PRODUCT.md](PRODUCT.md#lps-who-pay-by-wire)). [PILOT_PLAN.md](PILOT_PLAN.md) starts there on purpose: stage 1 shadows one real call with no money moving and needs no LP to hold a Canton party.

Each LP also accepts its commitment once and needs a wallet or participant whose validator has vetted DRAW's package. The full list is in [PRODUCT.md](PRODUCT.md#what-the-lp-needs).

## Evidence at this size

- The canonical scripted runs use one fund, three LPs, one call and one instrument, on two networks. On DevNet, HackCanton shared node, where DRAW's backend login signs for every demo seat, the run on package 0.3.0 passed 82 of 82 checks and settled in Canton Coin from the DevNet faucet. On LocalNet, with a separate ledger login per party, the runs on package 0.2.0 or earlier settled in Amulet.
- The newest live-site journey on DevNet called one LP, LP A, for $100,000 paid as 10 CC, and it ended verified funded.
- In the LocalNet campaign of 100 seeded calls, 40 cases call a single LP and 29 call two, and every case passed.

Dollar figures are the scenario, and neither coin has monetary value. Larger calls haven't been tested against transaction size limits, and campaign cases call at most three LPs.

Read next: [PILOT_PLAN.md](PILOT_PLAN.md) for the three pilot stages, and [PRODUCT.md](PRODUCT.md) for the call step by step.
