# Token Standard ablation

The question: if the CIP-0056 integration were replaced by an application-level `paid=true`, would the product be just as convincing?

## What disappears without the Token Standard

| With Token Standard settlement | With `paid=true` |
|---|---|
| The obligation reference travels inside the allocation (`settlementRef.id`, `transferLegId`), so Daml checks the correlation | The app matches sender, receiver, and amount, which can collide, or trusts a reference typed by someone |
| `Obligation_Settle` executes the transfer and flips to `Funded` in one transaction. Either both happen or neither | Two writes in two systems, with a window where they disagree |
| Wrong amount, wrong payer, wrong reference, wrong instrument, wrong executor are refused by the ledger | Each check is application code that can be skipped |
| A consumed allocation cannot be presented again | Replay protection is app logic |
| The verifier confirms receiver holdings owned by the fund admin in the expected instrument, summing to the amount due | Nothing to confirm. The flag is the evidence |
| The LP's balance falls and the admin's rises by exactly the funded units (canonical run: admin +75, LP A −40, LP B −35, LP C 0) | Balances live elsewhere and are reconciled by hand |

Empirical check: the ablation run shows `paid=true` lands "funded with no asset moved" and "reuse one payment for another obligation". DRAW stops both (`CANTON_ABLATION.md`).

## Where the integration is still thin

- The admin clicks Settle. A production deployment could settle automatically when a matching allocation appears, but someone still has to hold the admin's submission rights.
- Only Amulet on LocalNet so far. No DevNet token and no USDCx.
- The allocation is created through the registry's factory with disclosed contracts from Scan. If the registry is down, no payment can be made, which is correct but means no fallback.
