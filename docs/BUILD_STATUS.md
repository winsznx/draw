# Build status

This hackathon process record tracks each build requirement as done, partial, blocked or skipped, with the evidence behind it or what's left. The product is in [PRODUCT.md](PRODUCT.md), the proof in [PROOF.md](PROOF.md), the gate verdicts in [GATES.md](GATES.md) and the limits in [LIMITATIONS.md](LIMITATIONS.md).

Status words: DONE, PARTIAL, TODO, BLOCKED_ON_HUMAN, BLOCKED_ON_LOCALNET (written, needs the ledger to run), SKIPPED (with the reason). Updated 2026-10-06. Rows point at evidence in [evidence/](../evidence) where it exists, or say what is missing. Product rows with nothing in the last column are features you can see on the live site.

## Mechanism and ledger

| Requirement | Status | Where, or what is left |
|---|---|---|
| Fund, InvestorCommitment, CapitalCall, CapitalCallObligation and six states | DONE | [CapitalCall.daml](../contracts/daml/daml/Draw/CapitalCall.daml), package 0.3.0, a Smart Contract Upgrade of 0.2.0. No bridged state ([DECISIONS.md](DECISIONS.md) D-003) |
| A payment request for each LP in the Token Standard's AllocationRequest form | DONE in Daml Script and on DevNet | `PaymentRequest` implements CIP-0056 AllocationRequest V1 (`test_payment_request`, and the `wallet` checks in DevNet runs [20261006T131900Z](../evidence/devnet/runs/20261006T131900Z/result.json) and [20261006T091531Z](../evidence/devnet/runs/20261006T091531Z/result.json)). The node's Canton Coin wallet lists it, and its Accept paid one for a signed-in LP ([web-hackcanton-wallet-20261006132730](../evidence/devnet/browser/web-hackcanton-wallet-20261006132730/result.json), first in [web-hackcanton-wallet-20261006101052](../evidence/devnet/browser/web-hackcanton-wallet-20261006101052/result.json)) |
| Optional verifier party named on a fund | DONE in Daml Script | `test_verifier`, `test_no_verifier`. Not run on a ledger |
| Visibility and authority matrix | DONE | [ARCHITECTURE.md](ARCHITECTURE.md) |
| Resolution paths: overdue, waive, review, reopen, release | DONE | `Obligation_Reopen` and `Obligation_ReleasePending` added, tested in `test_review_paths` |
| Outcome-truth lifecycle | DONE | [reconcile.mjs](../scripts/demo/lib/reconcile.mjs) (the outcome per notice), the app's timeline from the action log, receipts |
| Token Standard allocation with settlement reference, real transfer | DONE | Amulet on LocalNet, Canton Coin from the faucet on DevNet ([20261006T131900Z](../evidence/devnet/runs/20261006T131900Z) on 0.3.0, earlier [20261006T091531Z](../evidence/devnet/runs/20261006T091531Z), first in [20261004T120110Z](../evidence/devnet/runs/20261004T120110Z) on 0.2.0) |
| Payment failure cases | PARTIAL | Correct, wrong amount, wrong payer, wrong reference, wrong call, wrong executor, wrong instrument, duplicate, after closure, after deadline, replay, pending and withdrawn are all covered. An expired allocation and a mid-payment network failure haven't been produced |
| DAML_CORE | DONE | [20261006T081605Z](../evidence/local/daml_core/20261006T081605Z/result.json) on 0.3.0, with mutation 15 of 15 in [20261006T081625Z](../evidence/local/mutation/20261006T081625Z/result.json). On 0.2.0: [20261002T192910Z](../evidence/local/daml_core/20261002T192910Z/result.json) |
| LOCAL_SETTLEMENT | DONE on 0.2.0 | [20261004T183146Z](../evidence/local/runs/20261004T183146Z/result.json) (76 of 76, every party signing with its own key) and the clean-room canonical run (74 of 74, a login per party, [canonical-run.log](../evidence/local/clean_room/20261004T195643Z/canonical-run.log)). 0.3.0 hasn't run on LocalNet |
| PRIVACY_CAMPAIGN | DONE | ACS plus transaction streams on LocalNet with a login or key per party (`20261004T183146Z`), and on DevNet with one backend client for every demo party (`20261006T131900Z` on 0.3.0), and before it one shared login (`20261006T091531Z`, first in `20261004T120110Z`) |
| DEVNET_E2E, [DEVNET_DEPLOYMENT.md](DEVNET_DEPLOYMENT.md) | DONE (one backend client for every seat) | [20261006T131900Z](../evidence/devnet/runs/20261006T131900Z/result.json), 82 of 82 on 0.3.0 with the clients NODERS issued for DRAW, plus one credential check skipped with its reason. Before it, `20261006T091531Z` passed 79 of 79 on one shared login, and the first run, `20261004T120110Z`, 72 of 72 on 0.2.0 |
| Party-aware read path | DONE | Every screen reads the ledger as the chosen seat's party ([SECURITY.md](SECURITY.md)) |
| Deadline refuse-before, allow-after | DONE | LocalNet and DevNet runs, check `deadline` |
| Totals recomputed and checked against a reference model | DONE | The campaign's reference model, and `totals.json` on both networks |
| Eval campaign with 100 seeded cases and red team | DONE | [EVAL_CAMPAIGN.md](EVAL_CAMPAIGN.md), [20261002T193724Z](../evidence/local/campaign/20261002T193724Z/result.json) |
| Machine-readable output | DONE | Every script writes `result.json` |
| Separate read-back of each settlement | DONE on LocalNet, PARTIAL on DevNet | LocalNet: a read-only verifier login, checked every run to be unable to submit. DevNet: in `20261006T131900Z` the read-back used the verifier client NODERS issued, the ledger refused it as the fund, and its receipts record its own ledger user. That client can also act and read as the team's personal wallet party ([probe 20261006T133219Z](../evidence/devnet/probes/20261006T133219Z/result.json)), so it isn't read-only, and the live site reads back with the backend client. In the scripts and the app the read-back runs in the same process as the submitter. Package 0.3.0 adds an optional verifier party that observes the fund, its calls and its notices, tested in Daml Script only |
| Baseline, reference, counterfactuals | DONE | [BASELINE_AND_COUNTERFACTUAL.md](BASELINE_AND_COUNTERFACTUAL.md) |
| Canton and Token Standard ablation | DONE | [CANTON_ABLATION.md](CANTON_ABLATION.md), [SPONSOR_ABLATION.md](SPONSOR_ABLATION.md), [20261002T193830Z](../evidence/local/ablation/20261002T193830Z/result.json) |
| claims.yaml | DONE | [claims.yaml](../claims.yaml) has 16 entries: 15 verified, 1 blocked (Grofty) |
| Frozen evidence manifest | PARTIAL | [manifest.json](../evidence/manifest.json) was regenerated on 2026-10-06 at 14:11:02 UTC at `8f83d32` and indexes 67 runs, up to DevNet run `20261006T131900Z`, probe `20261006T133219Z`, `web-journey-20261006132858` and the newest sign-in journeys. Regenerate it with `node scripts/evidence/manifest.mjs` at the freeze |

## Product

| Requirement | Status | Where, or what is left |
|---|---|---|
| Web app in TypeScript and React | DONE | [web/](../web) (Next.js on Cloudflare Workers through OpenNext, which replaced `app/web` on 2026-10-05). Live at https://draw.timjosh507.workers.dev |
| Fund manager dashboard: deployable now, unresolved, calls, needs attention | DONE | |
| Create capital call: name, note, due date, per-LP amounts | DONE | |
| Call detail: progress, notices, evidence, resolutions | DONE | |
| Technical identifiers behind details | DONE | |
| LP: notice, pay, progress steps, receipt, withdraw | DONE | |
| LP states in plain words: due, pending, funded, rejected, mismatched, overdue | DONE | |
| Role switcher with real party context and a demo label | DONE | Seat onboarding and "Switch seat". On DevNet the screens say who signs for the demo seats, from the API's own settings: DRAW's backend login since about 13:25 UTC on 2026-10-06 |
| An LP signs in with its own HackCanton login and pays from its own Canton wallet | DONE on DevNet, with the team's own login | "Sign in with HackCanton" on the seat screen, `DRAW_SIGN_IN=true` on the API. Newest live runs, with the server on the backend client: [web-hackcanton-20261006132613](../evidence/devnet/browser/web-hackcanton-20261006132613/result.json) (7 of 7, paid from DRAW) and [web-hackcanton-wallet-20261006132730](../evidence/devnet/browser/web-hackcanton-wallet-20261006132730/result.json) (9 of 9, Accept in the node's Canton Coin wallet), after five earlier runs. Every run used the team's own login as the LP. A run with a second person's login is still to do |
| Errors in plain language with technical detail, empty states, mobile | DONE | |
| `/proof` judge surface | DONE | https://draw.timjosh507.workers.dev/proof |
| Reconciliation inbox | DONE | Payments tab |
| Automatic settlement of exact matches | BLOCKED_ON_LOCALNET | `DRAW_AUTO_SETTLE=true` in [app/server.mjs](../app/server.mjs). Its browser test was `app/web/e2e/auto-settle.spec.ts`, removed with the old UI and kept in git history. Off by default and not claimed |
| Lender projection | SKIPPED | Optional, and excluded for the core pass by [CLAUDE.md](../CLAUDE.md) |
| AI features | SKIPPED | Excluded by [CLAUDE.md](../CLAUDE.md) |
| Grofty and BitSafe bounties | SKIPPED | Out of scope for this pass ([DECISIONS.md](DECISIONS.md) D-001 and D-002) |

## Verification and operations

| Requirement | Status | Where, or what is left |
|---|---|---|
| Test layers | DONE | Daml, mutation, unit, integration, role reads, Token Standard, campaign, browser. The 121 unit tests in [scripts/test/](../scripts/test) at `8f83d32` include server tests for sign-in config, `join`, a call to the signed-in LP, `/api/record` and the payment-request cleanup, network tests for the backend and verifier clients and the credential labels taken from resolved users, and tests that hold [claims.yaml](../claims.yaml) to its evidence. Unit test results aren't stored as evidence |
| Browser E2E | DONE | LocalNet: standard and browser-key journeys on the first Next.js web app, before the 2026-10-05 redesign ([web-journey-20261005003621](../evidence/local/browser/web-journey-20261005003621/result.json), [web-browser-keys-20261005005304](../evidence/local/browser/web-browser-keys-20261005005304/result.json)). The redesigned onboarding and browser-key flow haven't run on LocalNet. DevNet live site: `web-20261005003221`, `web-journey-20261005214111`, `web-journey-20261006091011` (a demo fund per browser, 10 of 10 steps), `web-journey-20261006101224` (10 of 10 on the release with sign-in) and [web-journey-20261006132858](../evidence/devnet/browser/web-journey-20261006132858/result.json) (10 of 10 with the demo seats on the backend client), plus the sign-in journeys, newest `web-hackcanton-20261006132613` and `web-hackcanton-wallet-20261006132730` |
| [SECURITY.md](SECURITY.md) | DONE | |
| Clean room | DONE for the 2026-10-04 tree | [20261004T195643Z](../evidence/local/clean_room/20261004T195643Z/result.json) PASS with the ledger steps. It built the earlier Vite web app, so the Next.js app in `web/` still needs a clean-room run, which needs LocalNet |
| [WORKLOAD_ECONOMICS.md](WORKLOAD_ECONOMICS.md) | DONE | From [workload.mjs](../scripts/eval/workload.mjs) |
| UI claim parity audit | PARTIAL | README, [claims.yaml](../claims.yaml) and docs audited 2026-10-06. The web copy no longer calls the DevNet read-back independent. Five lines on the live landing page ([page.tsx](../web/src/app/(site)/page.tsx)) still go past claims.yaml. The headline "Capital calls only the right investor can read." leaves out the fund and the node operator. The tile "A notice is a contract only the fund and that LP can read" (line 132) leaves out the node operator. Step 05's actor is labeled "Verifier", one of the failure words in [JUDGE_NOTE.md](JUDGE_NOTE.md). The FAQ answer "On DevNet, yes." to "Can I pay from a real Canton wallet?" has no team-login caveat. The FAQ says notices "don't appear in the network's Scan service" as fact, which claims.yaml marks as inferred from the docs. That's outside this docs pass |
| Architecture diagram | PARTIAL | [ARCHITECTURE.md](ARCHITECTURE.md#the-live-devnet-deployment) has a diagram of the live DevNet deployment. [architecture.svg](architecture.svg) still shows only the LocalNet layout with a login per party, predates the Cloudflare and VPS split, and labels a box "Independent verifier". It needs a redraw or a relabel |

## Documents

| File | Status |
|---|---|
| [GATES.md](GATES.md) | DONE |
| [TRACK_PROOF_MODALITY.md](TRACK_PROOF_MODALITY.md) | DONE |
| [PROBLEM_EVIDENCE.md](PROBLEM_EVIDENCE.md) | DONE (12 public sources). Direct evidence from fund operators BLOCKED_ON_HUMAN |
| A test with an outside person, by conversation or on the live site | BLOCKED_ON_HUMAN. 0 held as of 2026-10-06 |
| [PRODUCT.md](PRODUCT.md) | DONE |
| [FIRST_UNIT_VALUE.md](FIRST_UNIT_VALUE.md) | DONE |
| [PORTFOLIO_NOVELTY.md](PORTFOLIO_NOVELTY.md) | DONE (verdict ADJACENT) |
| [MECHANISM_HYPOTHESIS.md](MECHANISM_HYPOTHESIS.md) | DONE |
| [DEPENDENCY_GATE.md](DEPENDENCY_GATE.md) | DONE |
| [SPONSOR_TRANSFORMATION.md](SPONSOR_TRANSFORMATION.md) | DONE |
| [BUSINESS_BRIEF.md](BUSINESS_BRIEF.md) | DONE |
| [PILOT_PLAN.md](PILOT_PLAN.md) | DONE |
| [JUDGE_NOTE.md](JUDGE_NOTE.md) | DONE |
| [RUBRIC_ARTIFACT_MAP.md](RUBRIC_ARTIFACT_MAP.md) | DONE, mapped to the six published Season 3 criteria |
| [JUDGE_SCORECARD.md](JUDGE_SCORECARD.md) | DONE, the team's own check without scores |
| [DEMO_SCRIPT.md](DEMO_SCRIPT.md) | DONE, the current UI on the live DevNet site plus a LocalNet segment |
| [README](../README.md) | DONE |
| [HACKATHON_DELTA.md](HACKATHON_DELTA.md) | DONE |
| [SUBMISSION.md](SUBMISSION.md) | DONE (draft, track pending the owner's confirmation) |
| [LIMITATIONS.md](LIMITATIONS.md), [PROOF.md](PROOF.md), [CLEAN_ROOM.md](CLEAN_ROOM.md) | DONE |
| Deck ([deck.html](pitch/deck.html) and its PDF export) | PARTIAL, v1 draft, not yet reviewed. It still has lines that go past claims.yaml, among them the older DevNet run's timing figures, a vendor name and the cover headline, all listed in [SUBMISSION.md](SUBMISSION.md#links) |
| The six platform materials ([docs/pitch/materials/](pitch/materials)) | PARTIAL, drafts, not yet reviewed |
| Demo video | TODO |

## Needs the owner

- One conversation with someone who has run capital calls, and two or three usability tests on the live site.
- Mana burned to 1,000, the project profile with Track 3, and a journal entry every day.
- A public repository and a license. The 2026-10-06 scan found no secrets in the 45 commits up to `94ffc14`. The 23 commits after it, up to `515569d`, haven't been scanned. Re-run the scan on the release commit at the freeze.
- The demo access code: set `DRAW_ACCESS_CODE_PUBLIC=true` on the API so the landing page prints it, or give the code in the submission form.
- The deck: make the fixes listed in [SUBMISSION.md](SUBMISSION.md#links), among them the timing figures, the vendor name, the cover headline, the "most small funds" line and the Scan line, re-export the PDF, and only then link it from the README.
- The demo video and the voiceover.
- Asks to NODERS: take the team's personal party off the verifier client so it only reads, which we've asked for, and external parties allocated for keys we hold.
- A sign-in run with a second person's HackCanton login, so the LP and the fund manager aren't the same person.
- LocalNet isn't running. It's needed for a clean-room run of the current web app and for any new LocalNet evidence.
