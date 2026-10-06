# Evaluation campaign

This page lists what DRAW's tests cover and what they found: the test layers, the classes of behavior each layer exercises, the 100-case generated campaign on LocalNet, and the ways these results could be fooling us. It's for judges who want to know how hard the mechanism was pushed beyond the one demo call. Every number here comes from a script's result file, and each result carries its network. How to check each claim is in [PROOF.md](PROOF.md).

## Layers

| Layer | Script | Runs on | Newest evidence |
|---|---|---|---|
| Daml Script tests (9, counting `setup`) | [scripts/gates/daml_core.sh](../scripts/gates/daml_core.sh) | Daml Script, with a test token | [20261006T081605Z](../evidence/local/daml_core/20261006T081605Z/result.json): PASS on package 0.3.0 |
| Guard mutations (15) | [scripts/gates/mutation_check.sh](../scripts/gates/mutation_check.sh) | Daml Script | [20261006T081625Z](../evidence/local/mutation/20261006T081625Z/result.json): 15 of 15 caught on package 0.3.0 |
| Unit tests in [scripts/test](../scripts/test), 121 at `8f83d32`, among them the payment classifier, outcome stages, sign-in and the signing relay | `node --test 'scripts/test/*.test.mjs'` | Node, no ledger | No result file is kept for them. The 2026-10-04 clean-room run logged 22 of 22, the count at that time ([unit-tests.log](../evidence/local/clean_room/20261004T195643Z/unit-tests.log)) |
| Canonical run | [scripts/demo/run.mjs](../scripts/demo/run.mjs) | LocalNet with Amulet, DevNet with Canton Coin | LocalNet: [20261004T183146Z](../evidence/local/runs/20261004T183146Z/result.json), 76 of 76 on 0.2.0, each party signing with its own key. DevNet: [20261006T131900Z](../evidence/devnet/runs/20261006T131900Z/result.json), 82 of 82 on 0.3.0, the demo seats on one backend client and the read-back on a client of its own |
| Generalization (100 seeded calls) | [scripts/eval/campaign.mjs](../scripts/eval/campaign.mjs) | LocalNet, Amulet | [20261002T193724Z](../evidence/local/campaign/20261002T193724Z/result.json): PASS on 0.2.0 |
| Database comparison (5 attacks, 2 systems) | [scripts/eval/ablation.mjs](../scripts/eval/ablation.mjs) | `node:sqlite` and LocalNet | [20261002T193830Z](../evidence/local/ablation/20261002T193830Z/result.json): 4 of 5 attacks got through the database and 0 of 5 through DRAW, on 0.2.0 ([CANTON_ABLATION.md](CANTON_ABLATION.md)) |
| Browser journey | `npm run e2e` in `web/` | Chrome against the real app and ledger, on LocalNet or the live site | LocalNet: [web-journey-20261005003621](../evidence/local/browser/web-journey-20261005003621/result.json) and [web-browser-keys-20261005005304](../evidence/local/browser/web-browser-keys-20261005005304/result.json), on the web app before the 2026-10-05 redesign. DevNet live site: [web-journey-20261006132858](../evidence/devnet/browser/web-journey-20261006132858/result.json), and with an LP signed in, [web-hackcanton-20261006132613](../evidence/devnet/browser/web-hackcanton-20261006132613/result.json) and [web-hackcanton-wallet-20261006132730](../evidence/devnet/browser/web-hackcanton-wallet-20261006132730/result.json) |

Earlier and failed runs of every layer are kept and listed in [GATES.md](GATES.md).

## Test classes

| Class | Where it's tested |
|---|---|
| Positive: create a fund and a call, three notices, LP A and LP B pay, the totals are right | The canonical run (DevNet and LocalNet) and the campaign's `pay` and `late-pay` cases (LocalNet). The browser journeys cover issue, pay, settle and verified funded (DevNet and LocalNet) |
| Privacy: LP A can't see LP B, LP B can't see LP C, an unrelated party sees nothing, an LP can't read the fund's own records | Daml `test_visibility` and `test_payment_request`. The canonical run's visibility matrix, leak check and transaction-stream check (DevNet and LocalNet), and the DevNet run's `wallet` checks on payment requests. The campaign's privacy count (LocalNet) |
| Authority: LP A can't change LP B's notice, an unrelated party can't issue or waive, evidence that isn't authorized can't fund | Daml `test_authority`, `test_review_paths`, `test_payment_request` (only the LP rejects its request, only the fund withdraws it) and `test_verifier` (a named verifier can't act). The canonical run's `authority` checks (DevNet and LocalNet). The database comparison (LocalNet) |
| Boundary: wrong amount, wrong payer, wrong reference, duplicate, rejected or withdrawn payment, payment after the notice closed | Daml `test_settlement_lifecycle` (including an overpayment), `test_review_paths` (a withdrawn payment, a second payment after funding) and `test_payment_request` (an LP rejects its request). The canonical run's `negative` checks (DevNet and LocalNet). The campaign's `wrong-amount`, `wrong-payer`, `unknown-ref` and `duplicate` cases (LocalNet) |
| Correct inaction: LP C pays nothing | The canonical run's `deadline` and `unpaid` checks (DevNet and LocalNet), the campaign's `none-early` and `none-late` cases (LocalNet) |
| Late payment, review and waiver | Daml `test_resolution_paths` and `test_review_paths`. The campaign's `late-pay` notices end funded and verified, and its `waive` notices end waived (LocalNet). The paid-after-due flag is checked in Daml Script, in `test_resolution_paths` |
| Manual review: an ambiguous payment | The campaign's `wrong-payer` notices end in `ManualReview` (9 notices, LocalNet). The reconciliation classifier sends `duplicate` and `unknown-reference` payments to review |
| Neutral control: everything settles cleanly | Campaign cases where every notice is `pay` or `late-pay` (18 cases, LocalNet) |
| Pending control: a payment requested or locked and not settled | The campaign's `pending` notices (15 stayed unfunded, LocalNet). The canonical run checks each notice is PaymentPending and not yet funded before execution (DevNet and LocalNet) |
| Contradiction: a claim that conflicts with the ledger | The campaign's `contradiction` and `replay` cases, where the read-back step was given another notice's settlement update: 39 contradicted, 0 accepted (LocalNet). The canonical run's check that LP A's settlement offered for LP B is rejected (DevNet and LocalNet) |

Not yet covered: an allocation whose `settleBefore` has passed (the reconciliation classifier handles it, but no run has produced one), a network failure in the middle of a payment, and a call large enough to test transaction size limits.

## Generalization campaign

LocalNet, Amulet, package 0.2.0: [run 20261002T193724Z](../evidence/local/campaign/20261002T193724Z/result.json), seed 20261002, 238 seconds.

100 cases, 191 notices. Counted from [cases.jsonl](../evidence/local/campaign/20261002T193724Z/cases.jsonl): 40 cases call one LP, 29 call two, 31 call three. 36 cases were due in the past when issued. Notices range from 1 to 9 Amulet and from $6,000 to $432,000 in scenario terms. 18 cases are neutral controls where every notice pays correctly. Each notice draws one behavior:

| Behavior | Notices | Expected final state |
|---|---|---|
| pay | 30 | Funded and verified |
| late-pay | 26 | Funded and verified |
| none-early | 10 | Issued, early overdue refused |
| none-late | 10 | Overdue |
| waive | 10 | Waived |
| wrong-amount | 20 | Issued, payment refused and withdrawn |
| wrong-payer | 9 | ManualReview |
| unknown-ref | 12 | Issued, stray payment withdrawn |
| pending | 15 | PaymentPending, not funded |
| duplicate | 9 | Funded once, second payment refused |
| replay | 22 | Issued, replay refused and contradicted |
| contradiction | 18 | Funded, false claim contradicted |

The expected states are fixed in the script's own table ([scripts/eval/campaign.mjs](../scripts/eval/campaign.mjs)), and the script compares the ledger's final state and the read-back receipts with them.

| Metric | Value |
|---|---|
| Cases passed | 100 of 100 |
| Falsely funded | 0 |
| Paid but not funded | 0 |
| Privacy violations | 0 |
| Replays accepted | 0 |
| Total mismatches | 0 |
| Payments misclassified | 0 |
| Sent to manual review | 9 |
| False claims contradicted | 39 |
| Pending, correctly not funded | 15 |
| Early overdue refused | 10 |
| Bad payments refused by the ledger | 38 |

The behavior table has 22 replay and 18 contradiction notices, 40 in all. One of them came before any settlement existed, so there was nothing to offer as evidence, and the script skipped that check. All 39 that ran were contradicted.

## How this could be fooling us

| Question | Answer |
|---|---|
| Is the privacy result caused by test-query filtering? | The leak check reads every contract the party can see, with no fund filter: through that party's own ledger user on LocalNet, and reading as that party through the one credential the demo seats share on DevNet. The active-contract set returns only contracts the party is a stakeholder of, so that check can't see divulged or witnessed events. That gap is why the transaction-stream check was added. It passed for every party on DevNet, in [20261006T131900Z](../evidence/devnet/runs/20261006T131900Z/streams.json) and [20261006T091531Z](../evidence/devnet/runs/20261006T091531Z/streams.json) on 0.3.0 and [20261004T120110Z](../evidence/devnet/runs/20261004T120110Z/streams.json) on 0.2.0, and on LocalNet in [20261004T183146Z](../evidence/local/runs/20261004T183146Z/streams.json) |
| Is funded derived from app memory? | No. It needs the ledger state `Funded` and a read-back receipt with every check passed. The read-back step reads the update and the holdings itself. The app's action log isn't consulted for funded |
| Is the same evidence read twice and called independent? | We don't call it independent. On LocalNet the read-back step uses a separate ledger user with only `readAs` on the fund, and reads the update by id plus the holdings. It runs in the same process as the submitter, in the scripts and the app, and a separate process or host would be stronger. On DevNet, in [20261006T131900Z](../evidence/devnet/runs/20261006T131900Z/result.json), it used its own NODERS client, which the ledger refused as the fund (HTTP 403), and the receipts record that client's ledger user. That client isn't read-only, since [probe 20261006T133219Z](../evidence/devnet/probes/20261006T133219Z/result.json) records it can also act and read as the team's personal wallet party. The live site reads back with the seats' backend client. The earlier DevNet runs used the shared hackathon login and skipped the cannot-submit check with its reason |
| Is the total circular? | The campaign compares the fund's totals against a reference model written from rules (LocalNet). The canonical run also compares them with the fund's actual coin balance change (DevNet and LocalNet) |
| Is the fixture shaped to avoid collisions? | References are random per notice. The campaign mixes LP subsets, sizes, due times and behaviors from a seed. LP counts stop at three |
| Can a stale read produce a false state? | Reads retry until the expected state appears, then compare. A read that never converges fails the case. No stale-read failure has appeared, but none was specifically provoked |
| Is a failed registry or ledger call silently replaced by mock data? | No fallback exists in the run or app code. A registry or ledger failure throws and fails the case |
| Does the test token stand in for Amulet anywhere? | Only inside `dpm test` (Daml Script). Every LocalNet run and the campaign use Amulet through the live registry, and the DevNet runs use Canton Coin |
