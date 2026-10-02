# First-unit value

The smallest useful deployment is one fund administrator, two LPs, one call, and one settlement instrument. Nothing in DRAW needs other funds, a marketplace, lenders, or a data network.

## What the first fund gets

- A call issued once, producing a separate notice per LP that no other LP can read.
- Payments that either match the obligation exactly or are refused by the ledger with a stated reason. There is no "looks about right" match.
- An obligation that flips to funded in the same transaction as the transfer, plus a receipt an independent reader confirmed.
- A deployable-capital figure that is the sum of verified obligations, and an explicit unresolved list (late, mismatched, in review).
- A record of every resolution decision with a note.

## What it needs from the first LPs

- A Canton party, hosted by the LP or a provider it trusts.
- Holdings in the settlement instrument. Today that is Amulet on LocalNet. A real pilot needs an instrument the fund and LPs already accept, for example a tokenized dollar on Canton.

That second requirement is the real cold-start cost. A fund whose LPs only pay by wire gets the private notices and the explicit unresolved list, but not settlement-coupled funding. `PILOT_PLAN.md` starts there on purpose.

## Evidence that it works at this size

The canonical run uses one admin, three LPs, one call, one instrument. 40 of the 100 campaign cases call a single LP and 29 call two. Every case passed.
