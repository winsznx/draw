# Metrics and validation

Two kinds of evidence go here. Test evidence exists today, and every number below comes from a script-written file. Evidence from people comes next: conversations with people who run capital calls, and usability tests on the live DevNet site. Those sections stay as templates until the notes exist. Nothing in them gets filled from memory or by estimate.

## 1. Test evidence, today

DevNet means "DevNet, HackCanton shared node. One hackathon login signs for every seat." Dollar figures are the scenario. On DevNet the asset is Canton Coin from the faucet, on LocalNet it's Amulet.

| Metric | Value | Network | Evidence |
|---|---|---|---|
| Checks passed in the full scripted call, package 0.3.0 | 79 of 79 (2 credential checks skipped: one login acts for every party). The first run, on 0.2.0, passed 72 of 72 | DevNet | `evidence/devnet/runs/20261006T091531Z/result.json` |
| Funded and unresolved after the call | $750,000 funded (75 CC), $250,000 unresolved (25 CC, LP C overdue). The fund received exactly 75 CC | DevNet | `evidence/devnet/runs/20261006T091531Z/totals.json` |
| Checks per settlement receipt | 14 of 14 for LP A and for LP B | DevNet | `receipt-lpA.json`, `receipt-lpB.json` in the same run |
| Settlement record time to the read-back receipt | 6.8 seconds for LP A, 4.5 seconds for LP B (the verifier's clock against the ledger's record time) | DevNet | `receipt-lpA.json`: `recordTime` 09:17:02.501Z, `verifiedAt` 09:17:09.338Z. `receipt-lpB.json`: 09:18:07.811Z, 09:18:12.302Z |
| Transaction events about another party's records, in each party's own stream | 0 for all five parties | DevNet | `evidence/devnet/runs/20261006T091531Z/streams.json` |
| Payment request checks: each LP sees exactly its own request, the outsider sees none, LP A reads its call as a CIP-0056 AllocationRequest with the exact settlement and leg, and LP A's and LP B's requests close when their calls settle | 7 of 7 `wallet` checks. LP A paid by creating its allocation from the request, through the run script with the shared login. No wallet app has been shown listing or approving a request | DevNet | same `result.json` |
| Live-site browser journey | 10 of 10 steps passed, 2026-10-06, including a second browser that gets its own demo fund. Earlier: 8 of 8 on 2026-10-05 | DevNet | `evidence/devnet/browser/web-journey-20261006091011/result.json` |
| Checks with each party signing its own transactions | 76 of 76 | LocalNet | `evidence/local/runs/20261004T183146Z/result.json` |
| Browser journey, every action signed with a key made in the browser | 10 of 10 steps passed, 2026-10-05 | LocalNet | `evidence/local/browser/web-browser-keys-20261005005304/result.json` |
| Seeded capital calls | 100 of 100 passed, 191 notices | LocalNet | `evidence/local/campaign/20261002T193724Z/result.json` |
| False fundings, privacy violations, replays accepted, total mismatches | 0, 0, 0, 0 | LocalNet | same campaign |
| Attacks that got through, same call, five attacks | Database with a paid flag 4 of 5, DRAW 0 of 5 | LocalNet | `evidence/local/ablation/20261002T193830Z/result.json` |
| Deliberately broken guards caught by the tests, package 0.3.0 | 15 of 15 | Daml Script | `evidence/local/mutation/20261006T081625Z/result.json` |
| Daml Script tests, package 0.3.0 | 9 pass, counting `setup` | Daml Script | `evidence/local/daml_core/20261006T081605Z/result.json` |
| A named verifier party reads the fund, every call and every obligation, and is refused when it acts | `test_verifier` passes | Daml Script | same Daml run |
| Payment locked to verified funded | 1,047 ms for LP A, 1,037 ms for LP B, scripted fund manager on one machine | LocalNet | `evidence/local/workload/20261002T185353Z/result.json` |
| Ledger transactions to issue a call | 1, for the whole three-LP call | LocalNet | same workload run |
| Ledger transactions for the canonical call (3 LPs, 2 pay, 1 doesn't) | 15, including setup | LocalNet | same workload run, `docs/WORKLOAD_ECONOMICS.md` |

Limits that come with these numbers:

- On DevNet one hackathon login acts for every party and for the read-back step, so DevNet shows party-scoped reads and real settlement. Separate logins and keys held by each party are shown on LocalNet.
- The timing figures are not production latency. They come from one run each.
- Campaign cases call at most three LPs.
- Traffic cost per transaction on DevNet or MainNet hasn't been measured.

## 2. Conversations with people who run capital calls

Goal: 3 to 5 conversations, 20 minutes each, with fund COOs or operations leads at emerging managers, fund administrators, or LPs who pay into calls. The guide asks about the last real call and holds the demo until the end.

Status on 2026-10-06: 0 held.

### What we record for each conversation

| Field | How it's recorded |
|---|---|
| Date and channel | As it happened |
| Role | Job title, never a name |
| Fund type and manager | PE, venture, private credit or other. Which fund this is for the manager (first, second, third or later) and the fund size, as they state it |
| LPs in the last fund they called | A number |
| Calls per year for that fund | A number |
| Hours of ops time per call | Their own estimate, with what it covers |
| How they match payments today | Tools and steps, in their words |
| Last incident | Partial, split, wrong name, late, fake notice, other, or none, plus the hours it cost |
| Fraud controls | What they do today |
| Would LPs pay in a tokenized dollar | Yes, no or some, and what would stop them |
| Who would pay, and what they pay for administration today | As stated |
| Would they shadow one real call with no money moving | Yes, maybe or no, and what they'd need |
| Quote permission | Yes or no. Without a yes, no quote leaves the notes |

### Results

> To fill after the conversations. Leave each cell empty until the notes support it.

| Measure | Value |
|---|---|
| Messages sent / replies / calls booked / calls held | _ / _ / _ / _ |
| Roles spoken with | _ |
| Fund types, and which fund for the manager | _ |
| LPs per fund, median and range | _ |
| Calls per year, median and range | _ |
| Hours per call, median and range | _ |
| People whose last call had an incident | _ of _ |
| People who'd shadow one call | _ of _ |
| What they pay for administration today, if shared | _ |
| Quotes with permission | _ |

What would change our plan: if the people we reach say matching takes minutes, or that someone other than the COO, ops lead or administrator owns the call, the ICP moves (see [`icp.md`](icp.md)). If nobody would let LPs pay in a tokenized dollar, Stage 1 of the pilot (private notices and the unresolved list, no settlement) becomes the product for longer.

## 3. Usability tests on the live DevNet site

Goal: 2 to 3 people, 15 minutes each, on https://draw.timjosh507.workers.dev. Any technical person can take part. We tell them it's a demo on a test network where one login signs for every seat.

Tasks:

1. Take a seat as the fund manager and issue a call.
2. Switch to LP A, find the notice and pay it.
3. As LP B, open LP A's notice link and say what you see.
4. Switch back to the fund manager and settle the payment.
5. Find how much of the call is deployable, and explain what "unresolved" means.

What we measure for each task: completed without help, completed with a hint, or not completed. Time from the task being read out to done. Wrong clicks. What they said when they hesitated. A 1 to 7 ease rating after each task.

### Results

> To fill after the tests.

| Measure | Value |
|---|---|
| People tested | _ |
| Completed all five tasks without help | _ of _ |
| Median time per task (1 to 5) | _ / _ / _ / _ / _ |
| Median ease rating per task | _ / _ / _ / _ / _ |
| Top three points of confusion | _ |
| What we changed because of it | _ |

## 4. Metrics a pilot would track

From [`docs/PILOT_PLAN.md`](../../PILOT_PLAN.md). None of these has been measured with a real fund.

| Metric | Stage | Why it matters |
|---|---|---|
| Differences between DRAW's unresolved list and the fund's spreadsheet, and why | 1, shadow | The exit test for Stage 1 |
| Ops minutes per day on the call, in each system | 1, shadow | The time DRAW should save |
| LP confusion about what they see | 1, shadow | Whether private notices are clear |
| Payment locked to verified funded | 2, test settlement | The speed claim, measured with real parties |
| Payments refused, and the reason | 2, test settlement | Whether refusals make sense to LPs |
| Manual interventions per call | 2, test settlement | What's left for a person to do |
| Any LP able to see more than its own record | 2, test settlement | Must stay at 0 |

## 5. Rules for this file

- Numbers come from script-written evidence or from notes taken in a call or test. Nothing is estimated into a results table.
- People appear by role. Quotes appear only with permission.
- Failed and negative results stay in, the same as passing ones.
- [`claims.yaml`](../../../claims.yaml) is the ceiling for anything copied from here into the deck, video or submission.
