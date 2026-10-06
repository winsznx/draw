# Mechanism hypothesis

This is a hackathon process record of the hypothesis about DRAW's core mechanism, how each part of it could be proven false, and what the runs found. The product is in [PRODUCT.md](PRODUCT.md) and the proof in [PROOF.md](PROOF.md).

Fixed on 2026-10-01, before the runs. Any change after seeing results goes in [DECISIONS.md](DECISIONS.md) first.

## Hypothesis

> If each LP receives party-scoped obligation state, and only an independently observed, correctly correlated Canton Token Standard settlement can advance that obligation to verified funded, then the fund administrator can compute deployable capital from shared ledger truth while LPs cannot enumerate one another's private obligations.

The wording above is kept exactly as it was fixed, and two of its words need a note. "Independently observed" means read back by a separate step, which runs in the same process as the submitter, so DRAW doesn't call it independent. "Fund administrator" means the fund's party on the ledger. An obligation, here and in the table, is the contract each LP sees as its notice.

## How it would be falsified, and what we ran against each

| Falsifier | Test that would show it | Result so far |
|---|---|---|
| LP A can retrieve LP B's obligation through the authorized ledger path | Each LP queries the active contracts with its own user, unfiltered, and fetches LP B's contract id directly. Each LP reads its full transaction stream with ledger effects | Held. LocalNet: the canonical runs and the 100-case campaign (0 privacy violations), with a login per party, and the stream check for every party in [the custody run](../evidence/local/runs/20261004T183146Z/streams.json). DevNet: the same reads and stream check for every party in each scripted run, on packages 0.2.0 and 0.3.0, through one shared credential (last row). The newest run's streams are in [streams.json](../evidence/devnet/runs/20261006T131900Z/streams.json). On 0.3.0 each LP also sees only its own payment request (DevNet and Daml Script) |
| A wrong-party or wrong-reference payment marks an obligation funded | Wrong payer, wrong reference, wrong call, wrong executor, wrong instrument, wrong amount | Held. `Obligation_Settle` refused all six in the Daml tests (Daml Script). LocalNet refused the wrong amount, payer and reference, and the campaign refused 38 bad payments with 0 false fundings. DevNet refused the wrong amount, payer and reference in [the scripted run](../evidence/devnet/runs/20261006T131900Z/result.json) |
| A submitted but unsettled transfer marks an obligation funded | Allocation created and matched to PAYMENT_PENDING, never executed | Held. LocalNet: 15 pending notices in the campaign stayed unfunded. DevNet and LocalNet: each scripted run checks the notice is still PaymentPending before execution |
| The administrator aggregate diverges from verified obligation state | Recompute funded and unresolved from notices and receipts, and compare with a reference model and with the fund's Amulet balance | Held. LocalNet: 0 total mismatches in 100 cases, and in the canonical run the 75 Amulet received equals the 75 verified. DevNet: in the scripted run the fund received exactly the 75 Canton Coin it counted as funded ([totals.json](../evidence/devnet/runs/20261006T131900Z/totals.json)) |
| Replayed settlement evidence advances state twice | Settle with a consumed allocation. Offer one notice's settlement update as evidence for another | Held. LocalNet: 0 replays accepted, and 39 false claims contradicted by the read-back step, in the campaign. DevNet and LocalNet: each scripted run refuses the replayed allocation, and its read-back contradicts LP A's settlement offered for LP B |
| The headline proof is equally strong with settlement replaced by `paid=true` | Same call and the same five attacks against an operator database with a paid flag | Held on LocalNet, package 0.2.0: 4 of 5 attacks land on the database and 0 of 5 on DRAW. The database attacker had write access, as an operator or a compromised app server would ([CANTON_ABLATION.md](CANTON_ABLATION.md)) |
| The privacy claim is only enforced by frontend or backend filtering | Queries run as each party. On LocalNet each party has its own ledger user, and a user scoped to LP A gets HTTP 403 reading as LP B | Held for the ledger path on LocalNet, with a login per party. On DevNet one backend client can query as every demo party, so DevNet shows party-scoped queries without separate credentials between LPs, and the run skipped that check with its reason. On DevNet a signed-in LP's browser queries with its own HackCanton token, which DRAW's server never sees, but every run of that used the team's own login as the LP. The demo app server holds every demo seat's credential on both networks, the backend client on DevNet ([SECURITY.md](SECURITY.md)) |

## What the hypothesis does not cover

- The participant operator. Any operator of a participant that hosts several parties can read those parties' data. On DevNet every party sits on one participant, and on LocalNet every LP does.
- The token registry. Per the Splice token design, the DSO is a stakeholder of each allocation and so sees its settlement reference. References are random, so they don't name the LP. No run has read the DSO's view.
- Off-ledger copies. Anything an LP screenshots or exports is outside the ledger's control.
