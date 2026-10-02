# Mechanism hypothesis

Fixed on 2026-10-01 from the directive. Any change after seeing results goes in `DECISIONS.md` first.

## Hypothesis

If each LP receives party-scoped obligation state, and only an independently observed, correctly correlated Canton Token Standard settlement can advance that obligation to verified funded, then the fund administrator can compute deployable capital from shared ledger truth while LPs cannot enumerate one another's private obligations.

## How it would be falsified, and what we ran against each

| Falsifier | Test that would show it | Result so far |
|---|---|---|
| LP A can retrieve LP B's obligation through the authorized ledger path | Each LP queries the ACS with its own user, unfiltered, and fetches LP B's contract id directly. Each LP reads its full transaction stream with ledger effects | Held. ACS and fetch: canonical runs, 100-case campaign (0 privacy violations). Stream check: added 2026-10-02, not yet run |
| A wrong-party or wrong-reference payment marks an obligation funded | Wrong payer, wrong reference, wrong call, wrong executor, wrong instrument, wrong amount | Held. Refused by `Obligation_Settle` in Daml tests and on LocalNet, 38 refusals in the campaign, 0 false funded |
| A submitted but unsettled transfer marks an obligation funded | Allocation created and matched to PAYMENT_PENDING, never executed | Held. 15 pending cases in the campaign stayed unfunded |
| The administrator aggregate diverges from verified obligation state | Recompute funded and unresolved from obligations and receipts, compare with a reference model and with the admin's Amulet balance | Held. 0 aggregate mismatches in 100 cases. Canonical run: 75 Amulet received equals 75 verified |
| Replayed settlement evidence advances state twice | Settle with a consumed allocation. Offer one obligation's settlement update as evidence for another | Held. 0 replays accepted, 39 false claims contradicted by the verifier |
| The headline proof is equally strong with settlement replaced by `paid=true` | Same call and the same five attacks against an operator database with a paid flag | Held. 4 of 5 attacks land on the database, 0 of 5 on DRAW (`CANTON_ABLATION.md`) |
| The privacy claim is only enforced by frontend or backend filtering | Queries run with each party's own ledger user. The app server never holds a credential that can read every LP. A user scoped to LP A gets HTTP 403 reading as LP B | Held for the ledger path. The demo app server does hold every role's demo credential, see `SECURITY.md` |

## What the hypothesis does not cover

- The participant operator. Any operator of a participant that hosts several parties can read those parties' data. On LocalNet all LPs share one participant.
- The token registry. The DSO sees each allocation, including its settlement reference. References are random so they do not name the LP.
- Off-ledger copies. Anything an LP screenshots or exports is outside the ledger's control.
