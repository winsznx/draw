# Gates

Verdicts come from `result.json` files written by scripts. This table points at them and is updated by hand only to add the pointer.

| Gate | Verdict | Evidence | Notes |
|---|---|---|---|
| DAML_CORE | PASS | `evidence/local/daml_core/20261001T160054Z/result.json` | commit 36069bc, package df834a0fb91f6b0e0071ca22ba6055c37511471f13956135f7b724e7ae339d62 |
| MUTATION (supports DAML_CORE) | PASS, 8 of 8 killed | `evidence/local/mutation/20261001T160135Z/result.json` | commit 36069bc. Earlier run 20261001T155614Z kept, it predates the first commit |
| LOCAL_SETTLEMENT | PASS | `evidence/local/runs/20261001T162427Z/result.json` (canonical) | commit 4a31676. 59 of 59 checks. Real Amulet allocations on Splice 0.8.4 LocalNet, independent verifier receipts. Run's `uncommittedFiles: 1` is its own evidence directory |
| PRIVACY_CAMPAIGN | PASS | same run, `visibility-after-issue.json`, `visibility-final.json` | each party read through its own ledger user. Covers DRAW templates and Allocation interface. Does not yet read the DSO's view |
| (config refactor, 2026-10-02) | PASS x4, 69 of 69 each | `evidence/local/runs/20261002T184727Z` (allocate, HS256), `20261002T184851Z` and `20261002T184944Z` (provisioned parties reused across runs), `20261002T185051Z` (OAuth client credentials) | Adds a leak check over everything each party can see from any run. The OAuth run used a scratchpad token endpoint that issues LocalNet HS256 tokens, so it tests our token flow, not a real identity provider |
| (earlier run) | PASS | `evidence/local/runs/20261001T162153Z/result.json` | commit bf70eb3, 55 checks. Kept. Superseded because three rejection checks did not pin the reason and rejected allocations were left locked |
| DEVNET_E2E | BLOCKED_ON_HUMAN | | no AppsFactory/NODERS credentials |

## Four locks

| Lock | State | Why |
|---|---|---|
| MARKET_LOCK | REVISE | No outsider conversation on file. Workflow and payer are hypotheses |
| SPONSOR_LOCK | REVISE | Real Amulet moved through CIP-0056 allocations and LP privacy held on a participant. Removal test (database + boolean counterfactual) not run yet |
| JUDGE_LOCK | REVISE | No end-to-end run, no role UI, no brief |
| MECHANISM_LOCK | REVISE | Privacy, settlement guards, replay, deadline, and totals pass on LocalNet with Amulet. Still missing: ablation, DSO-view read, 100-case generalization, DevNet |
