# Gates

Verdicts come from `result.json` files written by scripts. This table points at them and is updated by hand only to add the pointer.

| Gate | Verdict | Evidence | Notes |
|---|---|---|---|
| DAML_CORE | PASS | `evidence/local/daml_core/20261001T160054Z/result.json` | commit 36069bc, package df834a0fb91f6b0e0071ca22ba6055c37511471f13956135f7b724e7ae339d62 |
| MUTATION (supports DAML_CORE) | PASS, 8 of 8 killed | `evidence/local/mutation/20261001T160135Z/result.json` | commit 36069bc. Earlier run 20261001T155614Z kept, it predates the first commit |
| LOCAL_SETTLEMENT | not run | | |
| PRIVACY_CAMPAIGN | not run | | |
| DEVNET_E2E | BLOCKED_ON_HUMAN | | no AppsFactory/NODERS credentials |

## Four locks

| Lock | State | Why |
|---|---|---|
| MARKET_LOCK | REVISE | No outsider conversation on file. Workflow and payer are hypotheses |
| SPONSOR_LOCK | REVISE | Design depends on Canton party privacy and CIP-0056 allocation authority, but removal test not run and no real token has moved |
| JUDGE_LOCK | REVISE | No end-to-end run, no role UI, no brief |
| MECHANISM_LOCK | REVISE | Privacy, settlement guards, replay, and deadline pass under `dpm test` with a test token only. Not yet on a participant or with Amulet |
