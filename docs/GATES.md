# Gates

Verdicts come from `result.json` files written by scripts. This page only points at them. Older runs are kept, never overwritten.

## Hard gates

| Gate | Verdict | Latest evidence | Notes |
|---|---|---|---|
| DAML_CORE | PASS | `evidence/local/daml_core/20261002T192910Z/result.json` | Package 0.2.0 `a006197e…7496`, 5 Daml Script test suites. Earlier PASS on 0.1.0: `20261001T160054Z` |
| Mutation (supports DAML_CORE) | PASS, 10 of 10 killed | `evidence/local/mutation/20261002T192939Z/result.json` | Adds release and reopen guards. Earlier 8 of 8: `20261001T160135Z` |
| LOCAL_SETTLEMENT | PASS | `evidence/local/runs/20261002T185353Z/result.json` | 69 of 69 checks, package 0.1.0. First canonical PASS `20261001T162427Z`. Not yet rerun on 0.2.0 |
| PRIVACY_CAMPAIGN | PASS (ACS) | same run | Matrix plus cross-run leak check. The transaction-stream check was added after this run and has not run yet |
| Generalization (100 cases) | PASS | `evidence/local/campaign/20261002T193724Z/result.json` | Seed 20261002, 191 obligations, 0 false funded, 0 privacy violations, 0 replays, 0 aggregate mismatches. Ran on 0.2.0 |
| Ablation | DRAW stops 5 of 5, database stops 1 of 5 | `evidence/local/ablation/20261002T193830Z/result.json` | `docs/CANTON_ABLATION.md` |
| Clean room | PASS_OFFLINE_ONLY | `evidence/local/clean_room/20261002T200553Z/result.json` | Fresh clone builds, tests, and builds the app. Ledger steps need LocalNet |
| Browser journey | FAIL (infrastructure) | `evidence/local/browser/20261002T195013Z` | LocalNet was down. No ledger action ran. Rerun needed |
| DEVNET_E2E | BLOCKED_ON_HUMAN | | No organizer endpoint or credentials yet |

Earlier LocalNet runs are kept: `20261001T162153Z` (55 checks, superseded because three refusals did not pin the reason), `20261002T184727Z` (allocate mode), `20261002T184851Z` and `20261002T184944Z` (provisioned parties reused across runs), `20261002T185051Z` (OAuth client credentials against a scratchpad token endpoint).

## Four locks

| Lock | State | Evidence that changed it | What would move it |
|---|---|---|---|
| MARKET_LOCK | REVISE | Public process evidence only. No practitioner conversation on file | One conversation with someone who has run capital calls, recorded in `PROBLEM_EVIDENCE.md` |
| SPONSOR_LOCK | REVISE, close | Removal test run: database with a paid flag lets 4 of 5 attacks through, DRAW 0 of 5. Real Amulet moves through CIP-0056 allocations | A DevNet run, so the transformation holds on the season's network |
| JUDGE_LOCK | REVISE | Role-aware React app, demo script, judge note, proof page, brief and pilot plan written. Browser journey not yet passing. Portfolio novelty is ADJACENT because of the proof-console pattern | Browser journey PASS, a recorded demo that opens on the fund, rubric map filled from the published criteria |
| MECHANISM_LOCK | REVISE, close | Privacy, settlement, failure, replay, ablation, and independent verification all held on LocalNet, plus 100 generated cases | The transaction-stream privacy check passing, a canonical run on package 0.2.0, and DevNet |

No lock is LOCK. Mechanism and Sponsor are close. Market is the weakest.
