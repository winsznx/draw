# Metrics and validation

The Metrics material: what DRAW has measured so far, on which network and from which file, then the plans for conversations and usability tests, and the metrics a pilot would track. It's for judges scoring validation. Test evidence exists today, and every number in section 1 comes from a script-written file. Evidence from people doesn't exist yet: as of 2026-10-07, 0 conversations and 0 usability tests have been held. Sections 2 and 3 say what they'll record, and nothing in them gets filled from memory or by estimate.

## 1. Test evidence, today

DevNet means "DevNet, HackCanton shared node. DRAW's backend login signs for every demo seat, and a different login reads each settlement back." That has been the site's own note since about 13:00 UTC on 2026-10-07. From about 13:25 UTC on 2026-10-06 until then the site read back on the backend login. Before that the site, and the scripted runs before 20261006T131900Z, used one hackathon login for every seat. The run in which each party signs with its own key is labeled "DevNet, HackCanton shared node. Each party signs with its own key. All five keys sat on the machine that ran the script." LocalNet means "LocalNet, a separate ledger login per party", or "LocalNet. Each party signs with its own key." for the custody run and the browser-key journey. Dollar figures are the scenario. On DevNet the asset is Canton Coin from the faucet, and on LocalNet it's Amulet. Neither has monetary value. Package 0.3.0 has run only in Daml Script and on DevNet, and every LocalNet run used package 0.2.0 or earlier.

| Metric | Value | Network | Evidence |
|---|---|---|---|
| Checks passed in the full scripted call, package 0.3.0, with five external parties, each signing its own transactions with its own key | 83 of 83, plus 2 checks skipped with their reasons recorded: one login, the team's own, submitted for every party and read each settlement back. All five keys sat on the machine that ran the script | DevNet | [run 20261007T130259Z](../../../evidence/devnet/runs/20261007T130259Z/result.json) |
| The run's login tried to act for LP A without LP A's key, and LP B's key tried to sign for LP A | Both refused | DevNet | the `custody` checks in run 20261007T130259Z |
| Checks passed in the full scripted call, package 0.3.0, with the demo seats on the backend client NODERS issued for DRAW and the read-back on a client of its own | 82 of 82, plus 1 credential check skipped with its reason recorded: one backend client acts for every demo seat. Earlier: 82 of 82 in run 20261006T131900Z, while the read-back client could also act for the team's personal party, 79 of 79 on one shared login, and 72 of 72 on 0.2.0 | DevNet | [run 20261007T125638Z](../../../evidence/devnet/runs/20261007T125638Z/result.json), earlier [20261006T131900Z](../../../evidence/devnet/runs/20261006T131900Z/result.json), [20261006T091531Z](../../../evidence/devnet/runs/20261006T091531Z/result.json) and [20261004T120110Z](../../../evidence/devnet/runs/20261004T120110Z/result.json) |
| The read-back login tried to submit as the fund | Refused (HTTP 403), and both receipts were read as that login's own ledger user. The node reports the login can only read as the fund. An earlier probe found it could also act and read as the team's personal party, and NODERS removed that on 2026-10-07 | DevNet | the `credential` and `settlement` checks in run 20261007T125638Z, [probe 20261007T125624Z](../../../evidence/devnet/probes/20261007T125624Z/result.json), earlier [probe 20261006T133219Z](../../../evidence/devnet/probes/20261006T133219Z/result.json) |
| Funded and unresolved after the call | $750,000 deployable (LP A 40 CC for $400,000, LP B 35 CC for $350,000), $250,000 unresolved (LP C, 25 CC, overdue). The fund received exactly 75 CC. Balance changes: fund +75, LP A -40, LP B -35, LP C 0. The same in both runs | DevNet | [totals.json, run 20261007T130259Z](../../../evidence/devnet/runs/20261007T130259Z/totals.json), [totals.json, run 20261007T125638Z](../../../evidence/devnet/runs/20261007T125638Z/totals.json) |
| Checks per settlement receipt | 14 of 14 for LP A and for LP B, in both runs | DevNet | [receipt-lpA.json](../../../evidence/devnet/runs/20261007T130259Z/receipt-lpA.json), [receipt-lpB.json](../../../evidence/devnet/runs/20261007T130259Z/receipt-lpB.json), run 20261007T130259Z |
| Settlement record time to the read-back receipt | 5.0 seconds for LP A and 5.3 seconds for LP B in run 20261007T130259Z, 7.5 seconds for LP A and 5.2 seconds for LP B in run 20261007T125638Z, the read-back's clock against the ledger's record time. One run each | DevNet | run 20261007T130259Z: [receipt-lpA.json](../../../evidence/devnet/runs/20261007T130259Z/receipt-lpA.json) `recordTime` 13:04:39.995Z, `verifiedAt` 13:04:44.972Z. [receipt-lpB.json](../../../evidence/devnet/runs/20261007T130259Z/receipt-lpB.json): 13:05:48.841Z, 13:05:54.148Z. Run 20261007T125638Z: [receipt-lpA.json](../../../evidence/devnet/runs/20261007T125638Z/receipt-lpA.json) 12:58:11.680Z, 12:58:19.186Z. [receipt-lpB.json](../../../evidence/devnet/runs/20261007T125638Z/receipt-lpB.json): 12:59:33.224Z, 12:59:38.444Z |
| Transaction events about another party's records, in each party's own stream | 0 for all five parties. Transactions in each stream: fund 21, LP A 7, LP B 11, LP C 7, outsider 0, in both runs | DevNet | [streams.json, run 20261007T130259Z](../../../evidence/devnet/runs/20261007T130259Z/streams.json), [streams.json, run 20261007T125638Z](../../../evidence/devnet/runs/20261007T125638Z/streams.json) |
| Payment request checks: each LP sees exactly its own request, the outsider sees none, LP A reads its call as a CIP-0056 AllocationRequest with the exact settlement and leg, and LP A's and LP B's requests close when their calls settle | 7 of 7 `wallet` checks in each run. LP A paid by creating its allocation from the request. The run script signed it with LP A's own key in run 20261007T130259Z and created it through the backend client in run 20261007T125638Z | DevNet | runs 20261007T130259Z and 20261007T125638Z, and earlier 20261006T131900Z and 20261006T091531Z |
| Live-site browser journey | 10 of 10 steps passed, 13:03 UTC on 2026-10-07, including a second browser that gets its own demo fund, with the demo seats on the backend client and the read-back on a client of its own, as the run's `siteSetup` records. Earlier: 10 of 10 at 01:57 UTC that day and on 2026-10-06 with the read-back on the backend client, 10 of 10 twice on 2026-10-06 on the shared login, 8 of 8 on 2026-10-05, and the first run, 7 steps, earlier that day | DevNet | [web-journey-20261007130359](../../../evidence/devnet/browser/web-journey-20261007130359/result.json) |
| An LP signed in with its own HackCanton login: signs in on the node's Keycloak, accepts with its own login, pays from its own Canton wallet through DRAW, the fund manager settles, the LP sees verified funded | 7 of 7 steps passed on drawcalls.xyz, 2026-10-08, with xidoncapitals-t1 as the LP, a second login NODERS created for the team, whose party is not the team's personal party, the demo seats on the backend client and the read-back on a client of its own. The team ran it. Earlier: 7 of 7 on 2026-10-07 with the team's personal login | DevNet | [web-hackcanton-20261008221025](../../../evidence/devnet/browser/web-hackcanton-20261008221025/result.json), earlier [web-hackcanton-20261007130106](../../../evidence/devnet/browser/web-hackcanton-20261007130106/result.json) |
| The same, paid by pressing Accept on the request in the node's Canton Coin wallet, and DRAW reading the payment from the LP's own ledger | 9 of 9 steps passed, 2026-10-07, with the team's personal login as the LP, the demo seats on the backend client and the read-back on a client of its own | DevNet | [web-hackcanton-wallet-20261007130229](../../../evidence/devnet/browser/web-hackcanton-wallet-20261007130229/result.json) |
| Checks with each party signing its own transactions | 76 of 76 | LocalNet | [run 20261004T183146Z](../../../evidence/local/runs/20261004T183146Z/result.json) |
| Browser journey, every action signed with a key made in the browser | 10 of 10 steps passed, 2026-10-05, on the web app before that day's redesign | LocalNet | [web-browser-keys-20261005005304](../../../evidence/local/browser/web-browser-keys-20261005005304/result.json) |
| Seeded capital calls | 100 of 100 passed, 191 notices, in 238 seconds. 40 cases call one LP, 29 call two, 31 call three | LocalNet | [campaign 20261002T193724Z](../../../evidence/local/campaign/20261002T193724Z/result.json) |
| False fundings, privacy violations, replays accepted, total mismatches | 0, 0, 0, 0 | LocalNet | same campaign |
| What the campaign's bad cases ended as | 38 bad payments refused, 39 false claims contradicted, 15 pending notices unfunded, 9 wrong-payer notices sent to review, 26 late payments funded | LocalNet | same campaign |
| Attacks that got through, same call, five attacks, against an attacker with write access to the database | Database with a paid flag 4 of 5, DRAW 0 of 5 | LocalNet | [ablation 20261002T193830Z](../../../evidence/local/ablation/20261002T193830Z/result.json) |
| Deliberately broken guards caught by the tests, package 0.3.0 | 15 of 15 | Daml Script | [mutation 20261006T081625Z](../../../evidence/local/mutation/20261006T081625Z/result.json) |
| Daml Script tests, package 0.3.0 | 9 pass, counting `setup` | Daml Script | [daml_core 20261006T081605Z](../../../evidence/local/daml_core/20261006T081605Z/result.json) |
| A named verifier party reads the fund, every call and every obligation, and is refused when it acts | `test_verifier` passes | Daml Script | same Daml run |
| Payment locked to verified funded | 1,047 ms for LP A, 1,037 ms for LP B, scripted fund manager on one machine. Not production latency | LocalNet | [workload 20261002T185353Z](../../../evidence/local/workload/20261002T185353Z/result.json) |
| Ledger transactions to issue a call | 1, for the whole three-LP call | LocalNet | same workload run |
| Ledger transactions for the canonical call (3 LPs, 2 pay, 1 doesn't) | 15, including setup | LocalNet | same workload run, [WORKLOAD_ECONOMICS.md](../../WORKLOAD_ECONOMICS.md) |

Limits that come with these numbers:

- On DevNet one backend client acts for every demo party, and in the run in which each party signs with its own key, one login submitted for every party. So DevNet shows party-scoped reads and real settlement, and LP-from-LP credential separation is shown on LocalNet only, with a login per party and with keys held by each party.
- In the run in which each party signs with its own key, all five keys sat on the machine that ran the script, so it shows the ledger needs each party's signature. It doesn't show that separate people held the keys. The live site still signs for its demo seats through the backend client.
- The read-back step's own DevNet client can only read as the fund, and the live site has read back on it since about 13:00 UTC on 2026-10-07. In the run in which each party signs with its own key, the read-back used the login that submitted for every party. The read-back step runs in the same process as the submitter, in the scripts and the app.
- Every sign-in run but the newest used the team's personal HackCanton login as the LP. The newest, web-hackcanton-20261008221025 on 2026-10-08, signed in with xidoncapitals-t1, a second HackCanton login NODERS created for the team, whose party is not the team's personal party. The team ran it too, so the LP's login and party were separate from the team's personal ones but the people were not, and no outside LP has used DRAW. In the newest runs nothing the server held could act for the LP's party. They show the LP's reads, acceptance and payment coming from its browser with its own token, and a second person signing in is still to show. NODERS also created a login for judges, which goes in the submission form only.
- The timing figures are not production latency. They come from one run each.
- Campaign cases call at most three LPs. Expired allocations and mid-payment network failures weren't generated.
- Traffic cost per transaction on DevNet or MainNet hasn't been measured.

## 2. Conversations with people who run capital calls

Goal: 3 to 5 conversations, 20 minutes each, with fund COOs or operations leads at emerging managers, fund administrators, or LPs who pay into calls. The questions in [What the interviews will test](icp.md#what-the-interviews-will-test) in icp.md ask about the last real call, and the demo waits until the end.

Status on 2026-10-07: 0 held.

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

No results yet as of 2026-10-07. Once conversations happen, the results table will record:

- messages sent, replies, calls booked and calls held
- the roles spoken with
- fund types, and which fund it is for each manager
- LPs per fund and calls per year, as a median and a range
- hours per call, as a median and a range
- how many people's last call had an incident
- how many people would shadow one call
- what they pay for administration today, where they shared it
- quotes, only with permission

What would change our plan: if the people we reach say matching takes minutes, or that someone other than the COO, ops lead or administrator owns the call, the ICP moves (see [icp.md](icp.md)). If nobody would let LPs pay in a tokenized dollar, Stage 1 of the pilot, private notices and the unresolved list with no settlement, becomes the product for longer.

## 3. Usability tests on the live DevNet site

Goal: 2 to 3 people, 15 minutes each, on https://drawcalls.xyz. Any technical person can take part. We tell them it's a demo on a test network where one backend login signs for every demo seat. Before each test we create the demo fund and accept the three LPs' commitments, so the person starts with a fund ready to call. Someone with a HackCanton login can also take an LP seat with it, which would be the first run with a second person's login.

Tasks:

1. Take a seat as the fund manager and issue a call.
2. Switch to LP A, find the notice and pay it.
3. As LP B, open LP A's notice link and say what you see.
4. Switch back to the fund manager and settle the payment.
5. Find how much of the call is deployable, and explain what "unresolved" means.

What we measure for each task: completed without help, completed with a hint, or not completed. Time from the task being read out to done. Wrong clicks. What they said when they hesitated. A 1 to 7 ease rating after each task.

### Results

No results yet as of 2026-10-07. Once tests happen, the results table will record:

- the number of people tested
- how many completed all five tasks without help
- the median time for each of the five tasks
- the median ease rating for each task
- the top three points of confusion
- what we changed because of them

## 4. Metrics a pilot would track

From [PILOT_PLAN.md](../../PILOT_PLAN.md). None of these has been measured with a real fund.

| Metric | Stage | Why it matters |
|---|---|---|
| Whether the operations lead would run the next call from DRAW, and whether at least one LP says it would pay a call on Canton | 1, shadow | The exit test for Stage 1 |
| Differences between DRAW's per-LP status list and the fund's spreadsheet, and why | 1, shadow | Where DRAW's view of the call falls short. Wires are still matched by hand in Stage 1 |
| Ops minutes per day on the call, in each system | 1, shadow | Whether DRAW saves ops time, which is a hypothesis today |
| LP confusion about what they see | 1, shadow | Whether private notices are clear |
| Payment locked to verified funded | 2, test settlement | The speed, measured with real parties |
| Payments refused, and the reason | 2, test settlement | Whether refusals make sense to LPs |
| Manual interventions per call | 2, test settlement | What's left for a person to do |
| Any LP able to see more than its own record | 2, test settlement | Must stay at 0 |

## 5. Rules for this file

- Numbers come from script-written evidence or from notes taken in a call or test. Nothing is estimated into a results table.
- People appear by role. Quotes appear only with permission.
- Failed and negative results stay in, the same as passing ones.
- [claims.yaml](../../../claims.yaml) is the ceiling for anything copied from here into the deck, video or submission.
