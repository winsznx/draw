# Gates

Verdicts come from `result.json` files written by scripts. This page only points at them. Older runs are kept, never overwritten.

## Hard gates

| Gate | Verdict | Latest evidence | Notes |
|---|---|---|---|
| DAML_CORE | PASS | `evidence/local/daml_core/20261002T192910Z/result.json` | Package 0.2.0 `a006197e…7496`, 5 Daml Script test suites. Earlier PASS on 0.1.0: `20261001T160054Z` |
| Mutation (supports DAML_CORE) | PASS, 10 of 10 killed | `evidence/local/mutation/20261002T192939Z/result.json` | Adds release and reopen guards. Earlier 8 of 8: `20261001T160135Z` |
| LOCAL_SETTLEMENT | PASS | `evidence/local/runs/20261002T185353Z/result.json` | 69 of 69 checks, package 0.1.0. First canonical PASS `20261001T162427Z`. Not yet rerun on 0.2.0 |
| PRIVACY_CAMPAIGN | PASS | LocalNet `evidence/local/runs/20261002T185353Z` (per-party credentials, ACS) and DevNet `evidence/devnet/runs/20261004T120110Z` (ACS plus transaction streams, single credential) | Credential separation proven on LocalNet only |
| CUSTODY (external parties) | PASS | `evidence/local/runs/20261004T183146Z/result.json` | 76 of 76 checks with every party signing its own transactions with its own Ed25519 key. The server's ledger user is refused (`cannot submit as the given submitter`) and another party's key is refused (`0 valid signatures`). LocalNet only, DevNet allocation blocked by the node |
| Generalization (100 cases) | PASS | `evidence/local/campaign/20261002T193724Z/result.json` | Seed 20261002, 191 obligations, 0 false funded, 0 privacy violations, 0 replays, 0 aggregate mismatches. Ran on 0.2.0 |
| Ablation | DRAW stops 5 of 5, database stops 1 of 5 | `evidence/local/ablation/20261002T193830Z/result.json` | `docs/CANTON_ABLATION.md` |
| Clean room | PASS_OFFLINE_ONLY | `evidence/local/clean_room/20261002T200553Z/result.json` | Fresh clone builds, tests, and builds the app. Ledger steps need LocalNet |
| Browser journey | PASS | `evidence/local/browser/20261004T184730Z` (standard) and `evidence/local/browser/20261004T183631Z` (every role signs with its own browser key) | LocalNet. Three failed runs kept with notes: the 2026-10-02 outage and two test-selector failures after every product step had passed |
| DEVNET_E2E | PASS | `evidence/devnet/runs/20261004T120110Z/result.json` | 72 of 72 checks on the NODERS shared node, Canton 3.5.19, real Canton Coin. Transaction-stream privacy check passed for all parties. Single credential: the two credential checks were skipped with the reason recorded. Two earlier aborted runs kept with notes |

Earlier LocalNet runs are kept: `20261001T162153Z` (55 checks, superseded because three refusals did not pin the reason), `20261002T184727Z` (allocate mode), `20261002T184851Z` and `20261002T184944Z` (provisioned parties reused across runs), `20261002T185051Z` (OAuth client credentials against a scratchpad token endpoint).

## Four locks

| Lock | State | Evidence that changed it | What would move it |
|---|---|---|---|
| MARKET_LOCK | REVISE | Public process evidence only. No practitioner conversation on file | One conversation with someone who has run capital calls, recorded in `PROBLEM_EVIDENCE.md` |
| SPONSOR_LOCK | REVISE, close | Removal test run (database 4 of 5 attacks land, DRAW 0 of 5). Real Canton Coin moved through CIP-0056 allocations on the season's DevNet | Separate credentials per party on DevNet |
| JUDGE_LOCK | REVISE | Role-aware React app, demo script, judge note, proof page, brief and pilot plan written. Browser journey not yet passing. Portfolio novelty is ADJACENT because of the proof-console pattern | Browser journey PASS, a recorded demo that opens on the fund, rubric map filled from the published criteria |
| MECHANISM_LOCK | REVISE, close | Privacy, settlement, failure, replay, ablation, and verification held on LocalNet plus 100 generated cases, and the canonical flow passed on DevNet on package 0.2.0 including transaction streams | Credential separation on DevNet, browser journey |

No lock is LOCK. Mechanism and Sponsor are close. Market is the weakest.
