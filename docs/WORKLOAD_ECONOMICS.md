# Workload economics

Measured on single-machine LocalNet with a scripted admin acting immediately. These are not production latency or cost figures, and nothing here converts to dollars.

Sources: `evidence/local/workload/20261002T185353Z/result.json` (computed by `scripts/eval/workload.mjs` from the run's `steps.jsonl`) and `evidence/local/campaign/20261002T193724Z/result.json`.

## Ledger transactions

| Action | Transactions | Submitted by |
|---|---|---|
| Create fund | 1, once per fund | admin |
| Invite an investor | 1 per investor | admin |
| Accept a commitment | 1 per investor | that investor |
| Issue a call to any number of investors | 1 | admin |
| Pay an obligation | 1 | investor |
| Match the payment (optional) | 1 | admin |
| Settle, transfer, and flip to funded | 1 | admin |
| Mark one unpaid investor overdue | 1 | admin |
| Refused payment, then withdrawn | 2 | investor |

Canonical call with three investors, two paying and one not: 7 setup, 1 issue, 6 for two funded investors, 1 overdue. 15 in total.

## Timing

| Step (LP A, canonical run) | Milliseconds |
|---|---|
| Payment locked → admin sees it in its own ACS | 28 |
| Seen → matched (PAYMENT_PENDING) | 454 |
| Matched → transfer executed and obligation funded | 481 |
| Executed → independent verifier confirms | 84 |
| Payment locked → verified funded | 1,047 |

LP B: 1,037 ms end to end. Issuing a call to three investors: 461 ms.

The 100-case campaign drove 191 obligations, about 400 ledger transactions plus reads and verifications, in 238 seconds.

## Manual interventions left

- The admin clicks Settle for each matching payment. Automatic settlement on a matching allocation is possible but not built.
- The admin marks overdue after the due time. There is no scheduler.
- An LP withdraws a refused payment itself.
- Review and waive decisions are human by design.

## Not measured

Canton traffic cost per transaction on DevNet or MainNet. Party onboarding time outside LocalNet. Any comparison with a real fund's reconciliation time.
