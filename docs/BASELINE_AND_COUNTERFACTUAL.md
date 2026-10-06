# Baseline, reference, counterfactuals, treatment

This is a hackathon process record of how DRAW's comparisons were set up. The before and after for the fund and the LP is in [PRODUCT.md](PRODUCT.md), and the measured comparison with what it means is in [CANTON_ABLATION.md](CANTON_ABLATION.md).

It names five things. The baseline is the workflow funds use today, the reference is the model the tests check results against, the two counterfactuals are the alternatives DRAW was compared with, and the treatment is DRAW itself.

| Name | What it is | Runnable here |
|---|---|---|
| Baseline | Today's workflow: a notice from a spreadsheet or admin system, sent by email, a wire, manual matching, a spreadsheet update, follow-up by email, and a report of funded versus outstanding | No. Described from public process sources ([PROBLEM_EVIDENCE.md](PROBLEM_EVIDENCE.md)). A hypothesis |
| Reference | The expected final state for each test behavior, and the expected totals | Yes: `EXPECTED_STATE` and `referenceAggregate` in [scripts/eval/campaign.mjs](../scripts/eval/campaign.mjs) |
| Counterfactual A | An operator database with a paid flag and role filtering in the app | Yes: [scripts/eval/ablation.mjs](../scripts/eval/ablation.mjs), on `node:sqlite` |
| Counterfactual B | A ledger every participant can read | Field exposure only, read from DRAW's notice contract |
| Treatment | DRAW on Canton, with one contract per LP notice and Token Standard settlement | Yes: LocalNet and DevNet |

## Measured, same scenario, on LocalNet

| Metric | Counterfactual A (database) | Treatment (DRAW) | Source |
|---|---|---|---|
| False fundings under attack | 3 of 3 attempts (mark unpaid, replay, no asset moved) | 0 of 3 | [the comparison run](../evidence/local/ablation/20261002T193830Z/result.json) |
| Notices another LP could read under a missing filter | 2 | 0 | the comparison run |
| Replays accepted | 1 | 0 | the comparison run |
| Total mismatches on the honest path | 0 | 0 | the comparison run, [the campaign](../evidence/local/campaign/20261002T193724Z/result.json) |
| False fundings across 100 generated calls | not run | 0 | the campaign |
| Ledger transactions for the canonical call (setup, issue, two payments, one overdue) | n/a | 15 | [the workload run](../evidence/local/workload/20261002T185353Z/result.json) |
| Payment locked to verified funded, with a scripted fund | n/a | 1,047 ms (LP A) and 1,037 ms (LP B) | the workload run |

All of these are LocalNet, on one machine, with package 0.2.0 for the comparison and the campaign and 0.1.0 for the workload run. The timing and transaction counts are explained in [WORKLOAD_ECONOMICS.md](WORKLOAD_ECONOMICS.md).

## Baseline steps that DRAW removes or keeps

| Baseline step | In DRAW |
|---|---|
| Generate a notice per LP | Kept, as an on-ledger notice the LP can read |
| Send it by email | Removed. The LP reads its notice in DRAW. There are no notifications yet, so the LP sees it when it opens the app |
| The LP sends a wire with a reference typed by hand | Replaced by an allocation that carries the reference in a field the ledger checks |
| Operations matches wires to expected amounts | Replaced by the Daml checks in `Obligation_Settle`, plus a classifier that explains mismatches, for payments made through DRAW. The fund still clicks Settle. Wires outside DRAW still need matching |
| Operations updates the spreadsheet | Removed. The notice turns funded in the settlement transaction |
| Operations chases unpaid LPs | Kept, and made explicit: overdue, review with a note, waive with a note |
| Report funded versus outstanding | Recomputed from verified notices |

Not measured: reconciliation hours, error rates or cost in a real fund. There's no practitioner data to compare against yet, so less matching work for a fund stays a hypothesis.
