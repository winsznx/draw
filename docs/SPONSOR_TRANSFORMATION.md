# Sponsor transformation

This hackathon process record lists what Canton changes in the capital-call workflow, property by property, with the proof for each. The product is in [PRODUCT.md](PRODUCT.md) and the proof in [PROOF.md](PROOF.md).

What Canton gives DRAW is a workflow the fund shares with each LP, where no LP can read another LP's part, and a business state that changes only when the money settles.

## Before

As public process descriptions describe it, and as a hypothesis no practitioner has confirmed yet ([PROBLEM_EVIDENCE.md](PROBLEM_EVIDENCE.md)), a capital call runs like this today. The fund builds a notice per LP in a spreadsheet or admin system and emails it. Each LP pays by wire on a separate rail. Someone matches the incoming wires to the expected amounts, at least one administration vendor in batches from bank exports the client provides, updates a spreadsheet, and follows up by email on anything short, late or unidentified. One vendor guide advises counting money only once it has cleared, and the report of funded versus outstanding comes from that spreadsheet.

## With Canton

| Property | How DRAW gets it | Proven by |
|---|---|---|
| Each party gets only the state its role needs | One notice contract per LP, signed by the fund and that LP. The fund and the call header are the fund's alone, plus a verifier party if the fund names one (package 0.3.0, Daml Script only) | The visibility matrix and leak check in each run ([LocalNet](../evidence/local/runs/20261001T162427Z/visibility-final.json), [DevNet](../evidence/devnet/runs/20261007T130259Z/visibility-final.json)), the [100-case campaign](../evidence/local/campaign/20261002T193724Z/result.json) on LocalNet, `test_verifier` in the [Daml tests](../evidence/local/daml_core/20261006T081605Z/result.json) |
| The LP can read what it owes through the Token Standard | One `PaymentRequest` per notice implements the CIP-0056 AllocationRequest V1 interface, with the same settlement and transfer leg that `Obligation_Settle` checks | `test_payment_request` in the [Daml tests](../evidence/local/daml_core/20261006T081605Z/result.json). The `wallet` checks in DevNet runs [20261007T130259Z](../evidence/devnet/runs/20261007T130259Z/result.json) and [20261007T125638Z](../evidence/devnet/runs/20261007T125638Z/result.json), where LP A paid from its request with its own key and through the backend client. The node's Canton Coin wallet lists the request, and its Accept paid one for an LP signed in with the team's own HackCanton login ([web-hackcanton-wallet-20261007130229](../evidence/devnet/browser/web-hackcanton-wallet-20261007130229/result.json), and earlier [web-hackcanton-wallet-20261006101052](../evidence/devnet/browser/web-hackcanton-wallet-20261006101052/result.json)) |
| The fund and each LP share workflow state the ledger enforces | The LP co-signs its commitment once. Every notice carries both signatures, so the fund can't create one outside the LP's accepted commitment and the LP can't change one | `test_authority` in the [Daml tests](../evidence/local/daml_core/20261006T081605Z/result.json), the [ablation](../evidence/local/ablation/20261002T193830Z/result.json) on LocalNet |
| Only a matching settlement moves a notice to funded | A Token Standard allocation carrying the notice's reference, executed inside `Obligation_Settle`. Amulet on LocalNet, Canton Coin on DevNet | Receipts with 14 checks each ([LocalNet](../evidence/local/runs/20261001T162427Z/receipt-lpA.json), [DevNet](../evidence/devnet/runs/20261007T130259Z/receipt-lpA.json)), 0 false fundings in the LocalNet campaign |
| The fund recomputes funded and unresolved from that state | A sum over the notices the fund sees, counting a notice as funded only with a read-back receipt | `totals.json` ([LocalNet](../evidence/local/runs/20261001T162427Z/totals.json), [DevNet](../evidence/devnet/runs/20261007T130259Z/totals.json)), 0 total mismatches in the LocalNet campaign |

## Removal test

The same call ran on LocalNet against an operator database with a paid flag and role filtering in the app. Four of five attacks got through the database and none got through DRAW, while the honest-path totals matched on both. The database attacker had write access, as an operator or a compromised app server would. The attacks, the results and the limits are in [CANTON_ABLATION.md](CANTON_ABLATION.md).

## What Canton doesn't change

[CANTON_ABLATION.md](CANTON_ABLATION.md#what-canton-does-not-change-here) lists what Canton doesn't change here. Subscription documents and KYC stay off the ledger, and nothing checks the commitment amount on the ledger against a signed subscription. Review and waive decisions stay human, wires paid outside DRAW still reconcile elsewhere, the fund still sees every LP, and a node operator can read every party it hosts.
