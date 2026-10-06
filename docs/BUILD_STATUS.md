# Build status against the directive

Source: `internal/HackCanton_S3_DRAW_Claude_Code_Build_Directive_v8.md` plus `internal/DRAW_v10_Grofty_Addendum.md`. One row per requirement. Status words: DONE, PARTIAL, TODO, BLOCKED_ON_HUMAN, BLOCKED_ON_LOCALNET (written, needs the ledger to run), SKIPPED (with reason).

Updated 2026-10-06. Every row points at evidence that exists in `evidence/`, or says what is missing.

## Mechanism and ledger

| § | Requirement | Status | Where / what is left |
|---|---|---|---|
| 10 to 12 | Fund, InvestorCommitment, CapitalCall, CapitalCallObligation, six states, no BRIDGED | DONE | `contracts/daml/daml/Draw/CapitalCall.daml`, package 0.3.0, a Smart Contract Upgrade of 0.2.0 |
| n/a | A payment request for each LP in the Token Standard's AllocationRequest form | DONE in Daml Script and on DevNet with the shared login | `PaymentRequest` implements CIP-0056 AllocationRequest V1 (`test_payment_request`, the DevNet run's `wallet` checks in `evidence/devnet/runs/20261006T091531Z`). No wallet app has been shown listing or approving one |
| n/a | Optional verifier party named on a fund | DONE in Daml Script | `test_verifier`, `test_no_verifier`. Not run on a ledger |
| 11 | Visibility and authority matrix | DONE | `docs/ARCHITECTURE.md` |
| 12 | Resolution paths: overdue, waive, review, reopen, release | DONE | `Obligation_Reopen`, `Obligation_ReleasePending` added, tested in `test_review_paths` |
| 12A | Outcome-truth lifecycle | DONE | `scripts/demo/lib/reconcile.mjs` (outcome per obligation), app timeline from the action log, receipts |
| 13 | Token Standard allocation with settlement reference, real transfer | DONE | Amulet on LocalNet, Canton Coin from the faucet on DevNet (`evidence/devnet/runs/20261006T091531Z` on 0.3.0, first in `20261004T120110Z` on 0.2.0) |
| 14 | Payment failure cases | PARTIAL | Correct, wrong amount, wrong payer, wrong reference, wrong call, wrong executor, wrong instrument, duplicate, after closure, after deadline, replay, pending, withdrawn all covered. Expired allocation and mid-payment network failure not produced |
| 15 | DAML_CORE | DONE | `evidence/local/daml_core/20261006T081605Z` on 0.3.0, with mutation 15 of 15 in `evidence/local/mutation/20261006T081625Z`. On 0.2.0: `20261002T192910Z` |
| 16 | LOCAL_SETTLEMENT | DONE on 0.2.0 | `evidence/local/runs/20261004T183146Z` (76 of 76, every party signing with its own key) and the clean-room canonical run (74 of 74, a login per party, `evidence/local/clean_room/20261004T195643Z/canonical-run.log`). 0.3.0 hasn't run on LocalNet |
| 17 | PRIVACY_CAMPAIGN | DONE | ACS plus transaction streams on LocalNet with a login or key per party (`20261004T183146Z`) and on DevNet with one shared login (`20261006T091531Z` on 0.3.0, first in `20261004T120110Z`) |
| 18 | DEVNET_E2E, `docs/DEVNET_DEPLOYMENT.md` | DONE (single credential) | `evidence/devnet/runs/20261006T091531Z`, 79 of 79 on 0.3.0. The first run, `20261004T120110Z`, passed 72 of 72 on 0.2.0 |
| 19 | Party-aware read path | DONE | |
| 21 | Deadline refuse-before, allow-after | DONE | LocalNet and DevNet runs, check `deadline` |
| 22 | Aggregate recomputed and independently checked | DONE | campaign reference model, `totals.json` on both networks |
| 25 | Eval campaign incl. 100 seeded cases and red team | DONE | `docs/EVAL_CAMPAIGN.md`, `evidence/local/campaign/20261002T193724Z` |
| 26 | Machine-readable output | DONE | every script writes `result.json` |
| 27 | Independent verification | DONE on LocalNet, PARTIAL on DevNet | LocalNet: a read-only verifier user, checked every run to be unable to submit. DevNet: the read-back step runs with the shared hackathon login, so that check is skipped with its reason recorded. Package 0.3.0 adds an optional verifier party that observes the fund, its calls and its obligations, tested in Daml Script only |
| 27A | Baseline, reference, counterfactuals | DONE | `docs/BASELINE_AND_COUNTERFACTUAL.md` |
| 28 to 29 | Canton and Token Standard ablation | DONE | `docs/CANTON_ABLATION.md`, `docs/SPONSOR_ABLATION.md`, `evidence/local/ablation/20261002T193830Z` |
| 30 | claims.yaml | DONE | 15 entries: 14 verified, 1 blocked (Grofty) |
| 30A | Frozen evidence manifest | PARTIAL | `evidence/manifest.json` was regenerated 2026-10-06 09:55 UTC at `688cdbc` and indexes 55 runs, up to the 0.3.0 DevNet run `20261006T091531Z`. Regenerate with `node scripts/evidence/manifest.mjs` at the freeze |

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
| 20 | Role switcher with genuine party context and demo label | DONE | Seat onboarding and "Switch seat". On DevNet the screens name the shared hackathon login |
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
| 32 | Test layers | DONE | Daml, mutation, unit, integration, role reads, Token Standard, campaign, browser |
| 33 | Browser E2E | DONE | LocalNet: standard and browser-key journeys on the first Next.js web app, before the 2026-10-05 redesign (`web-journey-20261005003621`, `web-browser-keys-20261005005304`). The redesigned onboarding and browser-key flow haven't run on LocalNet. DevNet live site: `web-20261005003221`, `web-journey-20261005214111` and `web-journey-20261006091011` (a demo fund per browser, 10 of 10 steps) |
| 32A | SECURITY.md | DONE | |
| 32B | Clean room | DONE for the 2026-10-04 tree | `evidence/local/clean_room/20261004T195643Z` PASS with the ledger steps. It built the earlier Vite web app, so the Next.js `web/` still needs a clean-room run (needs LocalNet) |
| 32C | WORKLOAD_ECONOMICS.md | DONE | from `scripts/eval/workload.mjs` |
| 34 | UI claim parity audit | PARTIAL | README, `claims.yaml` and docs audited 2026-10-06. Web copy that calls the DevNet read-back "independent" or a "separate verifier" still needs the same change |
| 41 | Architecture diagram | PARTIAL | `docs/architecture.svg` shows the LocalNet layout with a login per party. It predates the Cloudflare and VPS split and the shared DevNet login |

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
- Asks to NODERS: a read-only verifier login, and external parties allocated for keys we hold.
- LocalNet is not running (the machine is low on disk). It is needed for a clean-room run of the current web app and for any new LocalNet evidence.
