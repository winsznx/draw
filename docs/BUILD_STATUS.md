# Build status against the directive

Source: `internal/HackCanton_S3_DRAW_Claude_Code_Build_Directive_v8.md` plus `internal/DRAW_v10_Grofty_Addendum.md`. One row per requirement. Status words: DONE, PARTIAL, TODO, BLOCKED_ON_HUMAN, BLOCKED_ON_LOCALNET (written, needs the ledger to run), SKIPPED (with reason).

Updated 2026-10-06. Every row points at evidence that exists in `evidence/`, or says what is missing.

## Mechanism and ledger

| § | Requirement | Status | Where / what is left |
|---|---|---|---|
| 10 to 12 | Fund, InvestorCommitment, CapitalCall, CapitalCallObligation, six states, no BRIDGED | DONE | `contracts/daml/daml/Draw/CapitalCall.daml`, package 0.3.0, a Smart Contract Upgrade of 0.2.0 |
| n/a | A payment request for each LP in the Token Standard's AllocationRequest form | DONE in Daml Script and on DevNet | `PaymentRequest` implements CIP-0056 AllocationRequest V1 (`test_payment_request`, the `wallet` checks in DevNet runs `evidence/devnet/runs/20261006T131900Z` and `20261006T091531Z`). The node's Canton Coin wallet lists it, and its Accept paid one for a signed-in LP (`evidence/devnet/browser/web-hackcanton-wallet-20261006132730`, first in `web-hackcanton-wallet-20261006101052`) |
| n/a | Optional verifier party named on a fund | DONE in Daml Script | `test_verifier`, `test_no_verifier`. Not run on a ledger |
| 11 | Visibility and authority matrix | DONE | `docs/ARCHITECTURE.md` |
| 12 | Resolution paths: overdue, waive, review, reopen, release | DONE | `Obligation_Reopen`, `Obligation_ReleasePending` added, tested in `test_review_paths` |
| 12A | Outcome-truth lifecycle | DONE | `scripts/demo/lib/reconcile.mjs` (outcome per obligation), app timeline from the action log, receipts |
| 13 | Token Standard allocation with settlement reference, real transfer | DONE | Amulet on LocalNet, Canton Coin from the faucet on DevNet (`evidence/devnet/runs/20261006T131900Z` on 0.3.0, earlier `20261006T091531Z`, first in `20261004T120110Z` on 0.2.0) |
| 14 | Payment failure cases | PARTIAL | Correct, wrong amount, wrong payer, wrong reference, wrong call, wrong executor, wrong instrument, duplicate, after closure, after deadline, replay, pending, withdrawn all covered. Expired allocation and mid-payment network failure not produced |
| 15 | DAML_CORE | DONE | `evidence/local/daml_core/20261006T081605Z` on 0.3.0, with mutation 15 of 15 in `evidence/local/mutation/20261006T081625Z`. On 0.2.0: `20261002T192910Z` |
| 16 | LOCAL_SETTLEMENT | DONE on 0.2.0 | `evidence/local/runs/20261004T183146Z` (76 of 76, every party signing with its own key) and the clean-room canonical run (74 of 74, a login per party, `evidence/local/clean_room/20261004T195643Z/canonical-run.log`). 0.3.0 hasn't run on LocalNet |
| 17 | PRIVACY_CAMPAIGN | DONE | ACS plus transaction streams on LocalNet with a login or key per party (`20261004T183146Z`) and on DevNet with one backend client for every demo party (`20261006T131900Z` on 0.3.0), and before it one shared login (`20261006T091531Z`, first in `20261004T120110Z`) |
| 18 | DEVNET_E2E, `docs/DEVNET_DEPLOYMENT.md` | DONE (one backend client for every seat) | `evidence/devnet/runs/20261006T131900Z`, 82 of 82 on 0.3.0 with the clients NODERS issued for DRAW, one credential check skipped with its reason. Before it, `20261006T091531Z` passed 79 of 79 on one shared login, and the first run, `20261004T120110Z`, 72 of 72 on 0.2.0 |
| 19 | Party-aware read path | DONE | |
| 21 | Deadline refuse-before, allow-after | DONE | LocalNet and DevNet runs, check `deadline` |
| 22 | Aggregate recomputed and independently checked | DONE | campaign reference model, `totals.json` on both networks |
| 25 | Eval campaign incl. 100 seeded cases and red team | DONE | `docs/EVAL_CAMPAIGN.md`, `evidence/local/campaign/20261002T193724Z` |
| 26 | Machine-readable output | DONE | every script writes `result.json` |
| 27 | Independent verification | DONE on LocalNet, PARTIAL on DevNet | LocalNet: a read-only verifier user, checked every run to be unable to submit. DevNet: in `20261006T131900Z` the read-back used the verifier client NODERS issued, the ledger refused it as the fund, and its receipts record its own ledger user. That client can also act and read as the team's personal wallet party (probe `20261006T133219Z`), so it isn't read-only, and the live site reads back with the backend client. Package 0.3.0 adds an optional verifier party that observes the fund, its calls and its obligations, tested in Daml Script only |
| 27A | Baseline, reference, counterfactuals | DONE | `docs/BASELINE_AND_COUNTERFACTUAL.md` |
| 28 to 29 | Canton and Token Standard ablation | DONE | `docs/CANTON_ABLATION.md`, `docs/SPONSOR_ABLATION.md`, `evidence/local/ablation/20261002T193830Z` |
| 30 | claims.yaml | DONE | 16 entries: 15 verified, 1 blocked (Grofty) |
| 30A | Frozen evidence manifest | PARTIAL | `evidence/manifest.json` was regenerated 2026-10-06 14:04 UTC at `8f83d32` and indexes 67 runs, up to DevNet run `20261006T131900Z`, probe `20261006T133219Z`, `web-journey-20261006132858` and the newest sign-in journeys. Regenerate with `node scripts/evidence/manifest.mjs` at the freeze |

## Product

| § | Requirement | Status | Where / what is left |
|---|---|---|---|
| 20 | TypeScript, React, institutional light UI | DONE | `web/` (Next.js on Cloudflare Workers through OpenNext, replaced `app/web` on 2026-10-05). Live at https://draw.timjosh507.workers.dev |
| 20 | Admin dashboard: deployable now, unresolved, calls, needs attention | DONE | |
| 20 | Create capital call: name, note, due date, per-LP amounts | DONE | |
| 20 | Call detail: progress, obligations, evidence, resolutions | DONE | |
| 20 | Technical identifiers behind details | DONE | |
| 20 | LP: notice, pay, progress steps, receipt, withdraw | DONE | |
| v10 §3 | LP states in plain words: due, pending, funded, rejected, mismatched, overdue | DONE | |
| 20 | Role switcher with genuine party context and demo label | DONE | Seat onboarding and "Switch seat". On DevNet the screens say who signs for the demo seats, from the API's own settings: DRAW's backend login since about 13:25 UTC on 2026-10-06 |
| n/a | An LP signs in with its own HackCanton login and pays from its own Canton wallet | DONE on DevNet, with the team's own login | "Sign in with HackCanton" on the seat screen, `DRAW_SIGN_IN=true` on the API. Newest live runs, with the server on the backend client: `evidence/devnet/browser/web-hackcanton-20261006132613` (7 of 7, paid from DRAW) and `web-hackcanton-wallet-20261006132730` (9 of 9, Accept in the node's Canton Coin wallet), after five earlier runs. Every run used the team's own login as the LP. A run with a second person's login is still to do |
| 35 | Errors in plain language with technical detail, empty states, mobile | DONE | |
| 40A | `/proof` judge surface | DONE | https://draw.timjosh507.workers.dev/proof |
| n/a | Reconciliation inbox | DONE | Payments tab |
| n/a | Automatic settlement of exact matches | BLOCKED_ON_LOCALNET | `DRAW_AUTO_SETTLE=true` in `app/server.mjs`, its browser test was `app/web/e2e/auto-settle.spec.ts`, removed with the old UI and kept in git history. Off by default, unclaimed |
| 23 | Lender projection | SKIPPED | optional, excluded by CLAUDE.md for the core pass |
| 24 | AI features | SKIPPED | excluded by CLAUDE.md |
| v10 | Grofty MainNet slice | SKIPPED | excluded by CLAUDE.md. Needs invite and MainNet CC |

## Verification and operations

| § | Requirement | Status | Where / what is left |
|---|---|---|---|
| 32 | Test layers | DONE | Daml, mutation, unit, integration, role reads, Token Standard, campaign, browser. The 121 unit tests in `scripts/test/` at `8f83d32` include server tests for sign-in config, `join`, a call to the signed-in LP, `/api/record` and the payment-request cleanup, network tests for the backend and verifier clients and the credential labels taken from resolved users, and tests that hold `claims.yaml` to its evidence. Unit test results aren't stored as evidence |
| 33 | Browser E2E | DONE | LocalNet: standard and browser-key journeys on the first Next.js web app, before the 2026-10-05 redesign (`web-journey-20261005003621`, `web-browser-keys-20261005005304`). The redesigned onboarding and browser-key flow haven't run on LocalNet. DevNet live site: `web-20261005003221`, `web-journey-20261005214111`, `web-journey-20261006091011` (a demo fund per browser, 10 of 10 steps), `web-journey-20261006101224` (10 of 10 on the release with sign-in) and `web-journey-20261006132858` (10 of 10 with the demo seats on the backend client), plus the sign-in journeys, newest `web-hackcanton-20261006132613` and `web-hackcanton-wallet-20261006132730` |
| 32A | SECURITY.md | DONE | |
| 32B | Clean room | DONE for the 2026-10-04 tree | `evidence/local/clean_room/20261004T195643Z` PASS with the ledger steps. It built the earlier Vite web app, so the Next.js `web/` still needs a clean-room run (needs LocalNet) |
| 32C | WORKLOAD_ECONOMICS.md | DONE | from `scripts/eval/workload.mjs` |
| 34 | UI claim parity audit | PARTIAL | README, `claims.yaml` and docs audited 2026-10-06. Web copy that calls the DevNet read-back "independent" or a "separate verifier" still needs the same change |
| 41 | Architecture diagram | PARTIAL | `docs/architecture.svg` shows the LocalNet layout with a login per party. It predates the Cloudflare and VPS split, and doesn't show DevNet, where one backend client acts for every demo seat |

## Documents

| § | File | Status |
|---|---|---|
| 1A | GATES.md | DONE |
| 2A | TRACK_PROOF_MODALITY.md | DONE |
| 2B | PROBLEM_EVIDENCE.md | DONE (12 public sources). Direct operator evidence BLOCKED_ON_HUMAN |
| 2B | Outsider pull test | BLOCKED_ON_HUMAN |
| 3A | PRODUCT.md | DONE |
| 3C | FIRST_UNIT_VALUE.md | DONE |
| 3E | PORTFOLIO_NOVELTY.md | DONE (verdict ADJACENT) |
| 4A | MECHANISM_HYPOTHESIS.md | DONE |
| 7A | DEPENDENCY_GATE.md | DONE |
| 13A | SPONSOR_TRANSFORMATION.md | DONE |
| 36 | BUSINESS_BRIEF.md | DONE |
| 37 | PILOT_PLAN.md | DONE |
| 37A | Prior-art research | DONE (kept outside the repo) |
| 37B | JUDGE_NOTE.md | DONE |
| 37C | RUBRIC_ARTIFACT_MAP.md | DONE, mapped to the six published Season 3 criteria |
| 38 | JUDGE_SCORECARD.md | DONE |
| 39 | DEMO_SCRIPT.md | DONE, current UI on the live DevNet site plus a LocalNet segment |
| 42 | README | DONE |
| 42 | HACKATHON_DELTA.md | DONE |
| 43 | SUBMISSION.md | DONE (draft, track pending owner confirmation) |
| n/a | LIMITATIONS.md, PROOF.md, CLEAN_ROOM.md | DONE |
| n/a | Deck (`docs/pitch/DRAW-deck.pdf`) | PARTIAL, v1 draft, not yet reviewed |
| n/a | The six platform materials (`docs/pitch/materials/`) | PARTIAL, drafts, not yet reviewed |
| n/a | Demo video | TODO |

## Needs a human

- One conversation with someone who has run capital calls, and two or three usability tests on the live site.
- Burned Mana to 1,000, the project profile with Track 3, and a journal entry every day.
- A public repository and a license. The 2026-10-06 scan found no secrets in the 45 commits up to `94ffc14`. Re-run it on the release commit at the freeze.
- The demo video and the voiceover.
- Asks to NODERS: take the team's personal party off the verifier client so it only reads, which we've asked for, and external parties allocated for keys we hold.
- A sign-in run with a second person's HackCanton login, so the LP and the fund manager aren't the same person.
- LocalNet is not running (the machine is low on disk). It is needed for a clean-room run of the current web app and for any new LocalNet evidence.
