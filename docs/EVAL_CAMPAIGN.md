# Evaluation campaign

All results here are produced by scripts. Each section names the script and the evidence it wrote.

## Layers

| Layer | Script | Runs on | Latest evidence |
|---|---|---|---|
| Daml Script tests (9, counting `setup`) | `scripts/gates/daml_core.sh` | Daml Script, test token | `evidence/local/daml_core/20261006T081605Z` PASS on package 0.3.0 |
| Guard mutations (15) | `scripts/gates/mutation_check.sh` | Daml Script | `evidence/local/mutation/20261006T081625Z` 15 of 15 killed on package 0.3.0 |
| Canonical run | `node scripts/demo/run.mjs` | LocalNet with Amulet, DevNet with Canton Coin | LocalNet `evidence/local/runs/20261004T183146Z` (76 of 76 on 0.2.0, a key per party) and the clean-room run (74 of 74 on 0.2.0, a login per party). DevNet `evidence/devnet/runs/20261006T091531Z` (79 of 79 on 0.3.0, one shared login), after the first DevNet run `20261004T120110Z` (72 of 72 on 0.2.0) |
| Generalization (100 seeded cases) | `node scripts/eval/campaign.mjs` | LocalNet, Amulet | `evidence/local/campaign/20261002T193724Z` PASS |
| Ablation (5 attacks, 2 systems) | `node scripts/eval/ablation.mjs` | node:sqlite and LocalNet | `evidence/local/ablation/20261002T193830Z` |
| Browser journey | `npm run e2e` in `web` (`app/web` before 2026-10-05) | Chrome, real app, LocalNet or the deployed site | LocalNet `web-journey-20261005003621` and `web-browser-keys-20261005005304`, on the web app before the 2026-10-05 redesign. DevNet live site `web-20261005003221`, `web-journey-20261005214111` and `web-journey-20261006091011` (a demo fund per browser). The first run was blocked by a LocalNet outage (`evidence/local/browser/20261002T195013Z/NOTE.md`), and every failed browser run is kept with a note (`GATES.md` lists them) |

## Classes the directive asks for

| Class | Where it is tested |
|---|---|
| Positive: create fund and call, three obligations, A and B fund, aggregate correct | canonical run, campaign `pay` and `late-pay`, browser journey |
| Privacy: A cannot see B, B cannot see C, unrelated party sees nothing, LP cannot read admin-only state | Daml `test_visibility` and `test_payment_request`, canonical run matrix and leak check, the DevNet run's `wallet` checks on payment requests, transaction-stream check, campaign privacy count |
| Authority: A cannot mutate B, random party cannot issue or waive, unauthorized evidence cannot fund | Daml `test_authority`, `test_review_paths`, `test_payment_request` (only the LP rejects its request, only the fund withdraws it), `test_verifier` (a named verifier can't act), canonical run `authority` checks, ablation |
| Boundary: wrong amount, wrong payer, wrong reference, duplicate, expired or rejected transfer, payment after closure | Daml `test_settlement_lifecycle`, `test_review_paths`, canonical run `negative`, campaign `wrong-amount`, `wrong-payer`, `unknown-ref`, `duplicate` |
| Correct inaction: LP C pays nothing | canonical run `unpaid`, campaign `none-early`, `none-late` |
| Manual review: ambiguous payment | campaign `wrong-payer` ends in `ManualReview` (9 cases). Reconciliation sends `duplicate` and `unknown-reference` payments to review |
| Neutral control: everything settles cleanly | campaign cases where every obligation is `pay` or `late-pay` |
| Pending control: requested or acknowledged, not settled | campaign `pending` (15 cases stayed unfunded), canonical run checks PAYMENT_PENDING before execution |
| Contradiction: claim conflicts with ledger | campaign `contradiction` and `replay`: verifier given another obligation's settlement update. 39 contradicted, 0 accepted |

Not yet covered: an allocation whose `settleBefore` has passed (the reconciliation classifier handles it, but no run has produced one), and a network failure in the middle of a payment.

## Generalization campaign

Seed 20261002. 100 cases, 191 obligations. Counted from `cases.jsonl`: 40 cases call one LP, 29 call two, 31 call three. 36 cases were due in the past when issued. Obligations range from 1 to 9 Amulet and $6,000 to $432,000 in scenario terms. 18 cases are neutral controls where every obligation pays correctly. Each obligation draws a behaviour:

| Behaviour | Obligations | Expected final state |
|---|---|---|
| pay | 30 | Funded and verified |
| late-pay | 26 | Funded and verified, flagged as paid after due |
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

The expected states come from the table above, not from runs. The script compares the ledger's final state and the verifier's receipts with it.

| Metric | Value |
|---|---|
| Cases passed | 100 of 100 |
| Falsely funded | 0 |
| Paid but not funded | 0 |
| Privacy violations | 0 |
| Replays accepted | 0 |
| Aggregate mismatches | 0 |
| Payments misclassified | 0 |
| Sent to manual review | 9 |
| False claims contradicted | 39 |
| Pending, correctly not funded | 15 |
| Early overdue refused | 10 |
| Bad payments refused by the ledger | 38 |

## How this could be fooling us

| Question | Answer |
|---|---|
| Is the privacy result caused by test-query filtering? | The leak check reads every contract the party can see with no fund filter, using that party's own ledger user. The ACS only returns stakeholder contracts, so the check cannot see divulged or witnessed events. That gap is why the transaction-stream check was added. It passed for every party on DevNet (`20261006T091531Z` on 0.3.0, and `20261004T120110Z` on 0.2.0) and on LocalNet (`20261004T183146Z`) |
| Is FUNDED derived from app memory? | No. It requires ledger state `Funded` and a verifier receipt. The verifier reads the update and holdings itself. The app's action log is not consulted for FUNDED |
| Is the same evidence read twice and called independent? | The verifier uses a separate ledger user with only readAs on the admin, and reads the update by id plus the holdings. It runs in the same process as the submitter in scripts and the app. A separate process or host would be stronger. On the DevNet node the verifier uses the shared hackathon login, so there it is a separate read-back step with the same credential, and the check that it cannot submit is skipped with its reason |
| Is the aggregate circular? | The campaign compares against a reference model written from rules. The canonical run also compares with the admin's actual Amulet balance change |
| Is the fixture shaped to avoid collisions? | References are random per obligation. The campaign mixes LP subsets, sizes, due times, and behaviours from a seed. LP counts stop at three |
| Can a stale read produce a false state? | Reads retry until the expected state appears, then compare. A read that never converges fails the case. No stale-read failure has appeared, but it was not specifically provoked |
| Is a failed sponsor call silently replaced by mock data? | No fallback exists in the run or app code. A registry or ledger failure throws and fails the case |
| Does the test token stand in for Amulet anywhere? | Only inside `dpm test`. Every LocalNet run and the campaign use Amulet through the live registry |
