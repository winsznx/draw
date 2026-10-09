# Build status

This hackathon process record tracks each build requirement as done, partial, blocked or skipped, with the evidence behind it or what's left. The product is in [PRODUCT.md](PRODUCT.md), the proof in [PROOF.md](PROOF.md), the gate verdicts in [GATES.md](GATES.md) and the limits in [LIMITATIONS.md](LIMITATIONS.md).

Status words: DONE, PARTIAL, TODO, BLOCKED_ON_HUMAN, BLOCKED_ON_LOCALNET (written, needs the ledger to run), SKIPPED (with the reason). Updated 2026-10-09. Rows point at evidence in [evidence/](../evidence) where it exists, or say what is missing. Product rows with nothing in the last column are features you can see on the live site.

## Mechanism and ledger

| Requirement | Status | Where, or what is left |
|---|---|---|
| Fund, InvestorCommitment, CapitalCall, CapitalCallObligation and six states | DONE | [CapitalCall.daml](../contracts/daml/daml/Draw/CapitalCall.daml), package 0.3.0, a Smart Contract Upgrade of 0.2.0. No bridged state ([DECISIONS.md](DECISIONS.md) D-003) |
| A payment request for each LP in the Token Standard's AllocationRequest form | DONE in Daml Script and on DevNet | `PaymentRequest` implements CIP-0056 AllocationRequest V1 (`test_payment_request`, and the `wallet` checks in DevNet runs [20261007T130259Z](../evidence/devnet/runs/20261007T130259Z/result.json), where LP A's own key signed the allocation it made from its request, and [20261007T125638Z](../evidence/devnet/runs/20261007T125638Z/result.json), with earlier ones in `20261006T131900Z` and `20261006T091531Z`). The node's Canton Coin wallet lists it, and its Accept paid one for a signed-in LP ([web-hackcanton-wallet-20261007130229](../evidence/devnet/browser/web-hackcanton-wallet-20261007130229/result.json), first in [web-hackcanton-wallet-20261006101052](../evidence/devnet/browser/web-hackcanton-wallet-20261006101052/result.json)) |
| Optional verifier party named on a fund | DONE in Daml Script | `test_verifier`, `test_no_verifier`. Not run on a ledger |
| Visibility and authority matrix | DONE | [ARCHITECTURE.md](ARCHITECTURE.md) |
| Resolution paths: overdue, waive, review, reopen, release | DONE | `Obligation_Reopen` and `Obligation_ReleasePending` added, tested in `test_review_paths` |
| Outcome-truth lifecycle | DONE | [reconcile.mjs](../scripts/demo/lib/reconcile.mjs) (the outcome per notice), the app's timeline from the action log, receipts |
| Token Standard allocation with settlement reference, real transfer | DONE | Amulet on LocalNet, Canton Coin from the faucet on DevNet ([20261007T130259Z](../evidence/devnet/runs/20261007T130259Z) and [20261007T125638Z](../evidence/devnet/runs/20261007T125638Z) on 0.3.0, earlier [20261006T131900Z](../evidence/devnet/runs/20261006T131900Z) and [20261006T091531Z](../evidence/devnet/runs/20261006T091531Z), first in [20261004T120110Z](../evidence/devnet/runs/20261004T120110Z) on 0.2.0) |
| Payment failure cases | PARTIAL | Correct, wrong amount, wrong payer, wrong reference, wrong call, wrong executor, wrong instrument, duplicate, after closure, after deadline, replay, pending and withdrawn are all covered. An expired allocation and a mid-payment network failure haven't been produced |
| DAML_CORE | DONE | [20261006T081605Z](../evidence/local/daml_core/20261006T081605Z/result.json) on 0.3.0, with mutation 15 of 15 in [20261006T081625Z](../evidence/local/mutation/20261006T081625Z/result.json). On 0.2.0: [20261002T192910Z](../evidence/local/daml_core/20261002T192910Z/result.json) |
| LOCAL_SETTLEMENT | DONE on 0.2.0 | [20261004T183146Z](../evidence/local/runs/20261004T183146Z/result.json) (76 of 76, every party signing with its own key) and the clean-room canonical run (74 of 74, a login per party, [canonical-run.log](../evidence/local/clean_room/20261004T195643Z/canonical-run.log)). 0.3.0 hasn't run on LocalNet |
| PRIVACY_CAMPAIGN | DONE | ACS plus transaction streams on LocalNet with a login or key per party (`20261004T183146Z`), and on DevNet on 0.3.0 with each party signing with its own key and one login submitting and reading for all of them (`20261007T130259Z`), and with one backend client for every demo party (`20261007T125638Z`, earlier `20261006T131900Z`), and before them one shared login (`20261006T091531Z`, first in `20261004T120110Z`) |
| DEVNET_E2E, [DEVNET_DEPLOYMENT.md](DEVNET_DEPLOYMENT.md) | DONE (each party's own key in the newest run) | [20261007T130259Z](../evidence/devnet/runs/20261007T130259Z/result.json), 83 of 83 on 0.3.0 with CUSTODY also PASS. Five external parties, which NODERS allocated on 2026-10-07 from onboarding transactions DRAW generated and signed, each signed its own transactions with its own Ed25519 key. The ledger refused the run's login acting for LP A without LP A's key, and refused LP B's key signing for LP A. All five keys sat on the machine that ran the script, so the run shows that the ledger needs each party's signature. It doesn't show that separate people held the keys. One login, the team's own, submitted for every party and read each settlement back, so two credential checks were skipped with their reasons. The live site doesn't use these parties and still signs for its demo seats through the backend client. [20261007T125638Z](../evidence/devnet/runs/20261007T125638Z/result.json), 82 of 82 with the demo seats on the backend client NODERS issued for DRAW and the read-back on the verifier client, plus one credential check skipped. Before them, `20261006T131900Z` passed 82 of 82 while the verifier client could still act for the team's personal party, `20261006T091531Z` 79 of 79 on one shared login, and the first run, `20261004T120110Z`, 72 of 72 on 0.2.0 |
| Party-aware read path | DONE | Every screen reads the ledger as the chosen seat's party ([SECURITY.md](SECURITY.md)) |
| Deadline refuse-before, allow-after | DONE | LocalNet and DevNet runs, check `deadline` |
| Totals recomputed and checked against a reference model | DONE | The campaign's reference model, and `totals.json` on both networks |
| Eval campaign with 100 seeded cases and red team | DONE | [EVAL_CAMPAIGN.md](EVAL_CAMPAIGN.md), [20261002T193724Z](../evidence/local/campaign/20261002T193724Z/result.json) |
| Machine-readable output | DONE | Every script writes `result.json` |
| Read-back of each settlement | DONE on LocalNet and DevNet | LocalNet: a read-only verifier login, checked every run to be unable to submit. DevNet: in `20261007T125638Z` the read-back used the verifier client NODERS issued, which can only read as the fund ([probe 20261007T125624Z](../evidence/devnet/probes/20261007T125624Z/result.json)). The ledger refused it when the run tried to act as the fund with it, and its receipts record its own ledger user. The live site has read back with that client since about 13:00 UTC on 2026-10-07, and with the backend client before that. In the own-keys run `20261007T130259Z` the team's login, which submitted for every party, read back too, because the verifier client may read only as the demo seats' fund party, not as that run's external one. Until NODERS removed that right on 2026-10-07, the verifier client could also act and read as the team's personal wallet party, including during run `20261006T131900Z` ([probe 20261006T133219Z](../evidence/devnet/probes/20261006T133219Z/result.json)). In the scripts and the app the read-back runs in the same process as the submitter. Package 0.3.0 adds an optional verifier party that observes the fund, its calls and its notices, tested in Daml Script only |
| Baseline, reference, counterfactuals | DONE | [BASELINE_AND_COUNTERFACTUAL.md](BASELINE_AND_COUNTERFACTUAL.md) |
| Canton and Token Standard ablation | DONE | [CANTON_ABLATION.md](CANTON_ABLATION.md), [SPONSOR_ABLATION.md](SPONSOR_ABLATION.md), [20261002T193830Z](../evidence/local/ablation/20261002T193830Z/result.json) |
| claims.yaml | DONE | [claims.yaml](../claims.yaml) has 17 entries: 16 verified, 1 blocked (Grofty) |
| Frozen evidence manifest | PARTIAL | [manifest.json](../evidence/manifest.json) was regenerated on 2026-10-06 at 14:11:02 UTC at `8f83d32` and indexes 67 runs, up to DevNet run `20261006T131900Z`, probe `20261006T133219Z`, `web-journey-20261006132858` and the sign-in journeys of 2026-10-06, so none of the 2026-10-07 runs is in it. Regenerate it with `node scripts/evidence/manifest.mjs` at the freeze |

## Product

| Requirement | Status | Where, or what is left |
|---|---|---|
| Web app in TypeScript and React | DONE | [web/](../web) (Next.js on Cloudflare Workers through OpenNext, which replaced `app/web` on 2026-10-05). Live at https://drawcalls.xyz |
| Fund manager dashboard: deployable now, unresolved, calls, needs attention | DONE | |
| Create capital call: name, note, due date, per-LP amounts | DONE | |
| Call detail: progress, notices, evidence, resolutions | DONE | |
| Technical identifiers behind details | DONE | |
| LP: notice, pay, progress steps, receipt, withdraw | DONE | |
| LP states in plain words: due, pending, funded, rejected, mismatched, overdue | DONE | |
| Role switcher with real party context and a demo label | DONE | Seat onboarding and "Switch seat". On DevNet the screens say who signs for the demo seats, from the API's own settings: DRAW's backend login since about 13:25 UTC on 2026-10-06, and a different login for the read-back since about 13:00 UTC on 2026-10-07 |
| An LP signs in with its own HackCanton login and pays from its own Canton wallet | DONE on DevNet, run by the team | "Sign in with HackCanton" on the seat screen, `DRAW_SIGN_IN=true` on the API. Newest live runs, with the demo seats on the backend client and the read-back on the verifier client: [web-hackcanton-20261008221025](../evidence/devnet/browser/web-hackcanton-20261008221025/result.json) (7 of 7, paid from DRAW, on drawcalls.xyz) and [web-hackcanton-wallet-20261007215129](../evidence/devnet/browser/web-hackcanton-wallet-20261007215129/result.json) (9 of 9, Accept in the node's Canton Coin wallet), after [web-hackcanton-20261007215349](../evidence/devnet/browser/web-hackcanton-20261007215349/result.json) (7 of 7, paid from DRAW) and nine earlier runs. Every run before web-hackcanton-20261008221025 signed in with the team's personal login as the LP. That run signed in with xidoncapitals-t1, a second HackCanton login NODERS created for the team, whose party isn't the team's personal party. The team ran it too, so the LP's login and party were separate from the team's personal ones but the people weren't. On 2026-10-09 one person outside the team took the LP seat once, with a login NODERS created for the team, while the team ran the fund side. A run with a second person signing in is still to do |
| Errors in plain language with technical detail, empty states, mobile | DONE | |
| `/proof` judge surface | DONE | https://drawcalls.xyz/proof |
| Reconciliation inbox | DONE | Payments tab |
| Automatic settlement of exact matches | BLOCKED_ON_LOCALNET | `DRAW_AUTO_SETTLE=true` in [app/server.mjs](../app/server.mjs). Its browser test was `app/web/e2e/auto-settle.spec.ts`, removed with the old UI and kept in git history. Off by default and not claimed |
| Lender projection | SKIPPED | Optional, and excluded for the core pass by [CLAUDE.md](../CLAUDE.md) |
| AI features | SKIPPED | Excluded by [CLAUDE.md](../CLAUDE.md) |
| Grofty and BitSafe bounties | SKIPPED | Out of scope for this pass ([DECISIONS.md](DECISIONS.md) D-001 and D-002) |

## Verification and operations

| Requirement | Status | Where, or what is left |
|---|---|---|
| Test layers | DONE | Daml, mutation, unit, integration, role reads, Token Standard, campaign, browser. The 121 unit tests in [scripts/test/](../scripts/test) at `8f83d32` include server tests for sign-in config, `join`, a call to the signed-in LP, `/api/record` and the payment-request cleanup, network tests for the backend and verifier clients and the credential labels taken from resolved users, and tests that hold [claims.yaml](../claims.yaml) to its evidence. Unit test results aren't stored as evidence |
| Browser E2E | DONE | LocalNet: standard and browser-key journeys on the first Next.js web app, before the 2026-10-05 redesign ([web-journey-20261005003621](../evidence/local/browser/web-journey-20261005003621/result.json), [web-browser-keys-20261005005304](../evidence/local/browser/web-browser-keys-20261005005304/result.json)). The redesigned onboarding and browser-key flow haven't run on LocalNet. DevNet live site: `web-20261005003221`, `web-journey-20261005214111`, `web-journey-20261006091011` (a demo fund per browser, 10 of 10 steps), `web-journey-20261006101224` (10 of 10 on the release with sign-in), `web-journey-20261006132858` (10 of 10 with the demo seats on the backend client), `web-journey-20261007015754` (10 of 10 on the release that says the read-back runs on the login that settled) and [web-journey-20261007205208](../evidence/devnet/browser/web-journey-20261007205208/result.json) (10 of 10 with the read-back on a client of its own), plus the sign-in journeys, newest `web-hackcanton-20261008221025` and `web-hackcanton-wallet-20261007215129` |
| [SECURITY.md](SECURITY.md) | DONE | |
| Clean room | DONE for the 2026-10-04 tree | [20261004T195643Z](../evidence/local/clean_room/20261004T195643Z/result.json) PASS with the ledger steps. It built the earlier Vite web app, so the Next.js app in `web/` still needs a clean-room run, which needs LocalNet |
| [WORKLOAD_ECONOMICS.md](WORKLOAD_ECONOMICS.md) | DONE | From [workload.mjs](../scripts/eval/workload.mjs) |
| UI claim parity audit | DONE for the web copy as of 2026-10-06 | README, [claims.yaml](../claims.yaml), the docs and the deck audited 2026-10-06 and again on 2026-10-07 after runs 20261007T125638Z and 20261007T130259Z. The web copy was checked line by line on 2026-10-06, and its 2026-10-07 changes still need that check. That pass covered the landing page ([page.tsx](../web/src/app/(site)/page.tsx)) and the app screens. The headline, the privacy tile, the read-back step's label and the two FAQ answers that went past claims.yaml are fixed. Illustrations are labeled examples or read the run records, and wherever the live read-back runs on the login that settled, the site says so. The six materials and the video get the same check at the freeze |
| Architecture diagram | PARTIAL | [ARCHITECTURE.md](ARCHITECTURE.md#the-live-devnet-deployment) has a diagram of the live DevNet deployment. [architecture.svg](architecture.svg) still shows only the LocalNet layout with a login per party, predates the Cloudflare and VPS split, and labels a box "Independent verifier". It needs a redraw or a relabel |

## Documents

| File | Status |
|---|---|
| [GATES.md](GATES.md) | DONE |
| [TRACK_PROOF_MODALITY.md](TRACK_PROOF_MODALITY.md) | DONE |
| [PROBLEM_EVIDENCE.md](PROBLEM_EVIDENCE.md) | DONE (12 public sources). Direct evidence from fund operators BLOCKED_ON_HUMAN |
| A test with an outside person, by conversation or on the live site | BLOCKED_ON_HUMAN. 0 held as of 2026-10-09 |
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
| [README](../README.md) | DONE |
| [HACKATHON_DELTA.md](HACKATHON_DELTA.md) | DONE |
| [SUBMISSION.md](SUBMISSION.md) | DONE (draft, Track 3 confirmed by the owner on 2026-10-07) |
| [LIMITATIONS.md](LIMITATIONS.md), [PROOF.md](PROOF.md), [CLEAN_ROOM.md](CLEAN_ROOM.md) | DONE |
| Deck ([deck.html](pitch/deck.html) and its [PDF export](pitch/DRAW-deck.pdf)) | DONE, v2. 11 statement-led slides, re-exported on 2026-10-09 with the video and code links on slide 11. The owner used it in the video |
| The six platform materials ([docs/pitch/materials/](pitch/materials)) | PARTIAL, drafts, not yet reviewed |
| Demo video | DONE. https://youtu.be/F4atPdV72M8, 4:30: the pitch over the deck, the live demo on drawcalls.xyz against DevNet, then the results and the ask |

## Needs the owner

- One conversation with someone who has run capital calls, and two or three usability tests on the live site.
- The demo access code is public since 2026-10-09: `DRAW_ACCESS_CODE_PUBLIC=true` is set on the API, `GET /api/config` returns it, and the README lists it, `dda6f17bcea06d14`.
- A sign-in run with a second person signing in, so the LP and the fund manager aren't the same person, and keys held by separate people, since all five keys in the own-keys run sat on one machine. NODERS created two more logins on 2026-10-07. The team used the first, xidoncapitals-t1, in sign-in run web-hackcanton-20261008221025, which separates the LP's login and party from the team's personal ones but not the people. The second is for judges, and its credentials go in the submission form only, never in the repository.
- LocalNet isn't running. It's needed for a clean-room run of the current web app and for any new LocalNet evidence.
