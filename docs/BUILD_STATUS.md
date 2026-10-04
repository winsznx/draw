# Build status against the directive

Source: `internal/HackCanton_S3_DRAW_Claude_Code_Build_Directive_v8.md` plus `internal/DRAW_v10_Grofty_Addendum.md`. One row per requirement. Status words: DONE, PARTIAL, TODO, BLOCKED_ON_HUMAN, BLOCKED_ON_LOCALNET (written, needs the ledger to run), SKIPPED (with reason).

Updated 2026-10-02 evening.

## Mechanism and ledger

| § | Requirement | Status | Where / what is left |
|---|---|---|---|
| 10–12 | Fund, InvestorCommitment, CapitalCall, CapitalCallObligation, six states, no BRIDGED | DONE | `contracts/daml/daml/Draw/CapitalCall.daml`, package 0.2.0 |
| 11 | Visibility and authority matrix | DONE | `docs/ARCHITECTURE.md` |
| 12 | Resolution paths: overdue, waive, review, reopen, release | DONE | `Obligation_Reopen`, `Obligation_ReleasePending` added, tested in `test_review_paths` |
| 12A | Outcome-truth lifecycle | DONE | `scripts/demo/lib/reconcile.mjs` (outcome per obligation), app timeline from the action log, receipts |
| 13 | Token Standard allocation with settlement reference, real transfer | DONE | LocalNet Amulet |
| 14 | Payment failure cases | PARTIAL | Correct, wrong amount, wrong payer, wrong reference, wrong call, wrong executor, wrong instrument, duplicate, after closure, after deadline, replay, pending, withdrawn all covered. Expired allocation and mid-payment network failure not produced |
| 15 | DAML_CORE | DONE | `evidence/local/daml_core/20261002T192910Z` |
| 16 | LOCAL_SETTLEMENT | DONE on 0.1.0 | Rerun on 0.2.0 is BLOCKED_ON_LOCALNET |
| 17 | PRIVACY_CAMPAIGN | DONE (ACS), stream check BLOCKED_ON_LOCALNET | `scripts/demo/run.mjs` now also reads each party's transaction stream |
| 18 | DEVNET_E2E, `docs/DEVNET_DEPLOYMENT.md` | BLOCKED_ON_HUMAN | Runbook written. Code is env-driven and tested in provisioned and OAuth modes on LocalNet |
| 19 | Party-aware read path | DONE | |
| 21 | Deadline refuse-before, allow-after | DONE | |
| 22 | Aggregate recomputed and independently checked | DONE | |
| 25 | Eval campaign incl. 100 seeded cases and red team | DONE | `docs/EVAL_CAMPAIGN.md`, `evidence/local/campaign/20261002T193724Z` |
| 26 | Machine-readable output | DONE | every script writes `result.json` |
| 27 | Independent verification | DONE | read-only verifier user |
| 27A | Baseline, reference, counterfactuals | DONE | `docs/BASELINE_AND_COUNTERFACTUAL.md` |
| 28–29 | Canton and Token Standard ablation | DONE | `docs/CANTON_ABLATION.md`, `docs/SPONSOR_ABLATION.md`, `evidence/local/ablation/20261002T193830Z` |
| 30 | claims.yaml | DONE | 11 claims |
| 30A | Frozen evidence manifest | DONE | `node scripts/evidence/manifest.mjs` → `evidence/manifest.json` |

## Product

| § | Requirement | Status | Where / what is left |
|---|---|---|---|
| 20 | TypeScript, React, institutional light UI | DONE | `app/web` |
| 20 | Admin dashboard: deployable now, unresolved, calls, needs attention | DONE | |
| 20 | Create capital call: name, note, due date, per-LP amounts | DONE | |
| 20 | Call detail: progress, obligations, evidence, resolutions | DONE | |
| 20 | Technical identifiers behind details | DONE | |
| 20 | LP: notice, pay, progress steps, receipt, withdraw | DONE | |
| v10 §3 | LP states in plain words: due, pending, funded, rejected, mismatched, overdue | DONE | |
| 20 | Role switcher with genuine party context and demo label | DONE | keeps the page so the same URL is re-read with the new login |
| 35 | Errors in plain language with technical detail, empty states, mobile | DONE | |
| 40A | `/proof` judge surface | DONE | Proof tab |
| — | Reconciliation inbox | DONE | Payments tab |
| 23 | Lender projection | SKIPPED | optional, excluded by CLAUDE.md for the core pass |
| 24 | AI features | SKIPPED | excluded by CLAUDE.md |
| v10 | Grofty MainNet slice | SKIPPED | excluded by CLAUDE.md. Needs invite and MainNet CC |

## Verification and operations

| § | Requirement | Status | Where / what is left |
|---|---|---|---|
| 32 | Test layers | DONE | Daml, mutation, integration, role reads, Token Standard, campaign |
| 33 | Browser E2E | BLOCKED_ON_LOCALNET | `app/web/e2e/journey.spec.ts`. First run failed because LocalNet was down |
| 32A | SECURITY.md | DONE | |
| 32B | Clean room | PARTIAL | Offline steps PASS from a fresh clone. Ledger steps BLOCKED_ON_LOCALNET |
| 32C | WORKLOAD_ECONOMICS.md | DONE | from `scripts/eval/workload.mjs` |
| 34 | UI claim parity audit | PARTIAL | README and docs audited 2026-10-02. Repeat after the DevNet answer |
| 41 | Architecture diagram | DONE | `docs/architecture.svg` |

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
| 37C | RUBRIC_ARTIFACT_MAP.md | DONE (criteria text unconfirmed) |
| 38 | JUDGE_SCORECARD.md | DONE |
| 39 | DEMO_SCRIPT.md | DONE |
| 42 | README | DONE |
| 42 | HACKATHON_DELTA.md | DONE |
| 43 | SUBMISSION.md | DONE (V0) |
| — | LIMITATIONS.md, PROOF.md, CLEAN_ROOM.md | DONE |

## Needs a human

- Restore LocalNet: Docker's disk image was removed on 2026-10-02 at 20:50 local. Re-pulling needs about 5.5 GB. Free disk was 14 GB.
- DevNet endpoint and credentials from the organizers.
- One conversation with someone who has run capital calls.
- A recorded demo video, once the browser journey passes.
