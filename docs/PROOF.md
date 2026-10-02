# How to check the claims

Every result below was written by a script. Each row says where it is and how to reproduce it.

| Claim (`claims.yaml` id) | Check it in | Reproduce |
|---|---|---|
| Each LP reads only its own obligation (`private-obligations`) | `evidence/local/runs/<latest>/visibility-final.json` (matrix and leaks), `streams.json` once the stream check has run, campaign `privacyViolations` | `node scripts/demo/run.mjs`, `node scripts/eval/campaign.mjs` |
| Funded only through a matching Token Standard settlement (`settlement-gates-funded`) | `receipt-lpA.json`, `receipt-lpB.json` (14 checks each), Daml `test_settlement_lifecycle`, mutation results | `node scripts/demo/run.mjs`, `scripts/gates/daml_core.sh`, `scripts/gates/mutation_check.sh` |
| Bad payments are refused (`negative-settlement`) | run `result.json` checks starting `negative`, campaign `settleRefusals`, `falseFunded` | same |
| Unpaid stays unresolved (`unpaid-unresolved`) | run checks `deadline`, `unpaid`, campaign `none-early`, `none-late` cases | same |
| Admin totals match the obligations and the money (`admin-totals`) | `totals.json`, campaign `aggregateMismatches` | same |
| Real Amulet moved and was read back (`real-token-settlement`) | receipts, `totals.json` balances before and after | `node scripts/demo/run.mjs` |
| Generalizes beyond the canonical story (`generalization`) | `evidence/local/campaign/20261002T193724Z/result.json`, `cases.jsonl` | `node scripts/eval/campaign.mjs` (seed 20261002) |
| Canton is load-bearing (`canton-load-bearing`) | `evidence/local/ablation/20261002T193830Z/result.json` | `node scripts/eval/ablation.mjs` |

Faster for an async judge: run the app and open the **Proof** tab, which renders the latest of each from the same files and links to them.

`evidence/manifest.json` lists every run with its commit, package id, file hashes, and the claims it supports. Regenerate it with `node scripts/evidence/manifest.mjs`.

## Reading a receipt

`receipt-lpA.json` has `verdict: VERIFIED_FUNDED` only if every check passed. The checks are, in order: the update id was not already used for another obligation, the obligation exists in the admin's ACS, the update is a transaction, it exercises `Obligation_Settle`, the same transaction executes the referenced allocation and consumes it, it creates the funded obligation for this reference, the settlement record names receiver holdings, the admin's current obligation is that funded one, the holdings are active, owned by the admin, in the expected instrument, sum to the amount due, and the payer is the obligated LP.

The verifier is a separate ledger user with `readAs` on the fund admin only. Every canonical run checks it cannot submit.
