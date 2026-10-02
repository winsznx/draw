# Baseline, reference, counterfactuals, treatment

| Name | What it is | Runnable here |
|---|---|---|
| BASELINE | Notice, spreadsheet or admin system, email, wire, manual match | No. Described from the directive and public process sources (`PROBLEM_EVIDENCE.md`) |
| REFERENCE | Deterministic expected state per behaviour and the expected aggregate | Yes: `EXPECTED_STATE` and `referenceAggregate` in `scripts/eval/campaign.mjs` |
| COUNTERFACTUAL A | Operator database with a paid flag and app-level role filtering | Yes: `scripts/eval/ablation.mjs`, node:sqlite |
| COUNTERFACTUAL B | Globally transparent ledger | Field exposure only, read from DRAW's contract |
| TREATMENT | DRAW on Canton with party-scoped state and Token Standard settlement | Yes: LocalNet |

## Measured, same scenario

| Metric | Counterfactual A | Treatment | Source |
|---|---|---|---|
| False funded under attack | 3 of 3 attempts (mark unpaid, replay, no asset moved) | 0 of 3 | ablation |
| Unauthorized visibility under a missing filter | 2 obligations | 0 | ablation |
| Replay acceptance | 1 | 0 | ablation |
| Aggregate mismatch on the honest path | 0 | 0 | ablation, campaign |
| False funded across 100 generated cases | not run | 0 | campaign |
| Ledger transactions for the canonical call (setup, issue, two payments, one overdue) | n/a | 15 | `evidence/local/workload/*/result.json` |
| Payment locked to verified funded, LocalNet, scripted admin | n/a | about 1.0 s | same |

## Baseline steps that DRAW removes or keeps

| Baseline step | DRAW |
|---|---|
| Generate a notice per LP | Kept, as an on-ledger obligation the LP can see |
| Send by email | Removed. The LP's ledger login shows its own obligation |
| LP sends a wire with a reference typed by hand | Replaced by an allocation that carries the reference in a checked field |
| Ops matches wires to expected amounts | Replaced by Daml checks in `Obligation_Settle`, plus a classifier that explains mismatches |
| Ops updates the spreadsheet | Removed. The obligation flips in the settlement transaction |
| Ops chases unpaid LPs | Kept. DRAW makes them explicit (overdue, review, waive with a note) |
| Report funded vs outstanding | Recomputed from verified obligations |

Not measured: reconciliation hours, error rates, or cost in a real fund. There is no practitioner data to compare against yet.
