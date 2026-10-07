# Workload economics

This page counts the ledger work one capital call takes: how many ledger transactions each action needs, how long a payment takes to reach verified funded, which steps are still manual, and what hasn't been measured. It's for judges asking whether DRAW is practical to run, and for fund operations people asking what they would still do by hand.

The transaction counts and the millisecond timings come from single-machine LocalNet with a scripted fund acting at once. They aren't production latency or cost figures, and nothing here converts to dollars. The DevNet read-back timing is labeled as DevNet.

Sources: the [LocalNet workload run 20261002T185353Z](../evidence/local/workload/20261002T185353Z/result.json), computed by [scripts/eval/workload.mjs](../scripts/eval/workload.mjs) from that run's [steps.jsonl](../evidence/local/runs/20261002T185353Z/steps.jsonl) on package 0.1.0. The [100-case campaign](../evidence/local/campaign/20261002T193724Z/result.json) on LocalNet with package 0.2.0. The receipts of the scripted DevNet runs [20261007T130259Z](../evidence/devnet/runs/20261007T130259Z/result.json) and [20261007T125638Z](../evidence/devnet/runs/20261007T125638Z/result.json) on package 0.3.0.

## Ledger transactions

LocalNet, run 20261002T185353Z.

| Action | Transactions | Submitted by |
|---|---|---|
| Create the fund | 1, once per fund | the fund |
| Invite an LP | 1 per LP | the fund |
| Accept a commitment | 1 per LP | that LP |
| Issue a call to any number of LPs | 1 | the fund |
| Pay a notice | 1 | the LP |
| Match the payment (optional) | 1 | the fund |
| Settle: transfer the coin and turn the notice funded | 1 | the fund |
| Mark one unpaid LP overdue | 1 | the fund |
| A refused payment, then withdrawn | 2 | the LP |

The canonical call with three LPs, two paying and one not: 7 for setup, 1 to issue, 6 for the two funded LPs, 1 to mark the third overdue. 15 in total.

## Timing

LocalNet, run 20261002T185353Z, LP A:

| Step | Milliseconds |
|---|---|
| Payment locked, until the fund sees it in its own records | 28 |
| Seen, until matched (PaymentPending) | 454 |
| Matched, until the transfer executed and the notice turned funded | 481 |
| Executed, until the read-only read-back login confirmed it | 84 |
| Payment locked to verified funded | 1,047 |

LP B took 1,037 ms end to end. Issuing a call to three LPs took 461 ms.

DevNet, HackCanton shared node, package 0.3.0, two runs on 2026-10-07. In run 20261007T130259Z each of five external parties signed with its own key, all five keys on the machine that ran it, and one login, the team's own, submitted for every party and read each settlement back. Its read-back receipts are stamped 5.0 seconds (LP A) and 5.3 seconds (LP B) after the settlements' record times. That's `verifiedAt` against `recordTime` in [receipt-lpA.json](../evidence/devnet/runs/20261007T130259Z/receipt-lpA.json) (13:04:39.995 to 13:04:44.972 UTC) and [receipt-lpB.json](../evidence/devnet/runs/20261007T130259Z/receipt-lpB.json) (13:05:48.841 to 13:05:54.148 UTC). In run 20261007T125638Z DRAW's backend login signed for every demo seat, and the read-back used a client of its own. Its receipts are stamped 7.5 seconds (LP A) and 5.2 seconds (LP B) after the settlements' record times, in [receipt-lpA.json](../evidence/devnet/runs/20261007T125638Z/receipt-lpA.json) (12:58:11.680 to 12:58:19.186 UTC) and [receipt-lpB.json](../evidence/devnet/runs/20261007T125638Z/receipt-lpB.json) (12:59:33.224 to 12:59:38.444 UTC). Both runs' figures compare the read-back step's clock with the ledger's record time. No locked-to-verified figure has been computed for DevNet. Each figure on this page comes from one run.

The 100-case campaign drove 191 notices in 238 seconds on LocalNet, including the reads and the read-back checks. No evidence file records its ledger transaction count.

## Manual interventions left

- The fund clicks Settle for each matching payment. Automatic settlement of exact matches is written behind `DRAW_AUTO_SETTLE=true` and hasn't run against a ledger.
- The fund marks overdue after the due time. There's no scheduler.
- An LP withdraws a refused payment itself.
- Review and waive decisions are human by design, each with a note.

## Not measured

- Canton traffic cost per transaction on DevNet or MainNet. CIP-0078 eliminated transfer and lock fees for Canton Coin. Traffic and holding fees remain, and DRAW hasn't measured traffic cost. The source is the Canton Coin tokenomics page listed in [SPONSOR_FINDINGS.md](SPONSOR_FINDINGS.md).
- Party onboarding time outside LocalNet.
- How large a call fits in one issue transaction. Calls haven't been tested against transaction size limits, and campaign cases call at most three LPs.
- Any comparison with a real fund's reconciliation time.
