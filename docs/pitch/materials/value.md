# Value

DRAW runs a fund's capital call on Canton. Each LP reads and pays only its own notice, and the fund counts money as deployable only after the settlement has been read back from the ledger and checked.

Network labels used in this file:

- DevNet: "DevNet, HackCanton shared node. DRAW's backend login signs for every demo seat." The backend login is a client the node operator issued for DRAW. Runs before about 13:25 UTC on 2026-10-06 used one hackathon login for every seat.
- DevNet sign-in: an LP signed in with its own HackCanton login, which in our runs was the team's own login.
- LocalNet: "LocalNet. Each party signs with its own key." (the custody run and the browser-key journey), or LocalNet with a separate login per party (the other runs).
- Asset: "Settles in Canton Coin from the DevNet faucet. Dollar figures are the scenario."

## The problem

When a fund calls capital, each LP gets a notice for its share and pays by wire. Someone then has to work out which wire belongs to which LP and which call, decide what counts as funded, and chase the rest.

Public sources describe four pain points. Numbers in brackets point to the source list in [`docs/PROBLEM_EVIDENCE.md`](../../PROBLEM_EVIDENCE.md).

1. Matching happens in batches, from bank exports. One fund software vendor's service terms say "Client must provide a .csv file of recent bank transactions in order for Juniper Square to perform contribution reconciliation", and that contributions are updated "up to three times per capital call" [10].
2. Partial, split and wrong-name payments get worked by hand. Capital call products reconcile each contribution against candidate bank transactions, including partial and split payments [11], and an ops guide warns that cleared funds from the wrong name create AML and ownership problems [9].
3. Funds treat money as in only once it has cleared and been reconciled [9].
4. Fake notices are a known fraud. Luxembourg's Financial Intelligence Unit reports that "a wide range of scams using fake capital call or drawdown notices, falsified invoices or fraudulent loan repayment instructions has been detected" [8]. Funds fight it with callbacks, dual approval and faster reconciliation, all of it outside the payment itself [6, 7, 8].

LPs care about the notice itself. ILPA's Neal Prunier: "For LPs, capital call and distribution notices are essential tools for monitoring cash flow activity" [1].

### What weakens this

- Fiat tools already issue notices, attribute payments and track status [10, 11, 12]. Matching on bank rails is a solved category, even if it runs in batches.
- LP defaults are rare [4, 5]. So DRAW leads with telling late from funded, and leaves chasing defaulters out of the pitch.
- Nothing we found says a fund can't deploy before reconciliation finishes. Funds often bridge with subscription credit lines, which softens the urgency.

This is a hypothesis built from 12 public sources. No fund operator has confirmed it to us yet. The interviews in [`metrics.md`](metrics.md) test it.

## What DRAW changes

1. Each notice is a contract between that LP and the fund. Another LP's ledger query gets nothing back, even with the contract id.
2. The payment is a Token Standard (CIP-0056) allocation that carries the notice's reference in a field the ledger checks. A wrong amount, wrong payer, wrong reference or reused payment is refused, so it can't fund a notice by mistake. When a payment comes from the wrong party, the fund sends that notice to review with a note.
3. Funded follows the money. The notice turns funded in the same transaction that moves the token, so there's no bank export and no match step.
4. The notice is signed by the fund's party, and only a payment to that party can fund it. There are no emailed wire details on it for anyone to swap.
5. A separate read-back step fetches each settlement and runs 14 checks before the dashboard counts it. The fund sees two numbers: deployable now, and unresolved.
6. Anyone who doesn't pay stays visible. Before the due time the ledger refuses to mark them overdue. After it, the fund can. The fund can also send a notice to review, or waive an overdue or reviewed one, each with a note.

## Why now

- Canton's Token Standard gives a common way to lock a payment for one specific settlement, with the reference inside the payment. DRAW settles through its allocation API.
- A tokenized dollar exists on the network. USDCx is a CIP-0056 token documented for TestNet and MainNet, and its MainNet registry's public metadata lists `splice-api-token-allocation-v1`, the allocation API DRAW uses. DRAW hasn't run with USDCx.
- The industry is standardizing what a notice contains. ILPA released v2.0 of its capital call and distribution template in September 2025 [1, 2].

## Why Canton

We ran the same $1,000,000 call (scenario) on an ordinary database with a `paid` flag and role filtering in the app, then tried five attacks on both. LocalNet, run `evidence/local/ablation/20261002T193830Z`.

| Attack | Database with a paid flag | DRAW |
|---|---|---|
| Mark an unpaid LP funded | Got through | Stopped |
| Read another LP's notice | Got through | Stopped |
| Reuse one payment for another notice | Got through | Stopped |
| Count a payment row as money | Got through | Stopped |
| LP changes its own notice | Stopped | Stopped |

Three things Canton changes, narrowly:

- Privacy sits below the app. With a login per party, as on LocalNet, LP A's own ledger view never returns LP B's notice, so a missing filter in our code can't leak it. On DevNet one backend login acts for every demo party, and each party's own reads and transaction stream held only its own records. An LP that signs in with its own HackCanton login reads with its own token.
- Funded follows the money. The notice flips in the same transaction that moves the token, and that transfer needs the LP's prior consent.
- A payment can't be reused. A settled allocation is consumed.

What it doesn't hide: the fund sees every LP, because it's a party to every notice. The node operator that hosts every party can read them all. The Canton Coin leg of each payment is visible to the network in Scan, with a random reference and our DevNet party ids, which carry readable hints such as `draw-lpa`.

The database attacker in this test has write access, as an operator or a compromised app server would.

## What's proven today

| Claim | Network | Evidence |
|---|---|---|
| The full call on the HackCanton node: two LPs settle with Canton Coin, bad payments are refused, the unpaid LP goes overdue, the fund's totals match the coin it received. 82 of 82 checks on package 0.3.0. The demo seats act through a backend client the node operator issued for DRAW, which the node reports as holding rights on the five demo parties and nothing else | DevNet | `evidence/devnet/runs/20261006T131900Z/result.json`, probe `evidence/devnet/probes/20261006T133219Z/result.json` |
| Each LP's call also reaches it as a CIP-0056 AllocationRequest, the Token Standard interface an app uses to ask a user for an allocation. Other LPs and outsiders can't see it. LP A paid by creating the allocation from that request, the same factory call a wallet makes, and the request closed when the call settled. The run script did this, through the backend client in the 82-check run and the shared login in the 79-check run before it | DevNet, Daml Script | the `wallet` checks in `evidence/devnet/runs/20261006T131900Z/result.json` and `evidence/devnet/runs/20261006T091531Z/result.json`, `test_payment_request` in `evidence/local/daml_core/20261006T081605Z/result.json` |
| The deployed web app runs a call end to end in a browser: take a seat, issue, LP A pays, LP B gets nothing from LP A's notice link, settle, verified funded. Each browser gets its own demo fund. 10 of 10 steps, with the demo seats on the backend client | DevNet | `evidence/devnet/browser/web-journey-20261006132858/result.json` |
| An LP with its own HackCanton login joins as itself: it signs in on the node's Keycloak, its browser reads its notices with its own token, it accepts with that login, and it pays from its own Canton wallet, from DRAW or by pressing Accept in the node's Canton Coin wallet. The fund manager settles and the notice shows verified funded. DRAW's server never receives the LP's token, and in the newest runs the server's only ledger credential was the backend client, so nothing it held could act for the LP's party. Every run used the team's own login as the LP | DevNet | `evidence/devnet/browser/web-hackcanton-20261006132613/result.json` (7 of 7 steps), `evidence/devnet/browser/web-hackcanton-wallet-20261006132730/result.json` (9 of 9) |
| A separate read-back step confirms each settlement before it counts. On DevNet it used a client of its own, which the ledger refused when it tried to act as the fund. That client can still act for the team's personal party, so it isn't called read-only, and the live server doesn't use it. On LocalNet it runs as a read-only login that can't submit | DevNet, LocalNet | DevNet receipts in the 82-check run and the probe above. LocalNet `evidence/local/runs/20261004T183146Z` |
| The read-back receipts are stamped 6.8 seconds (LP A) and 4.5 seconds (LP B) after the settlements' record times, the verifier's clock against the ledger's | DevNet, the shared-login run | `receipt-lpA.json` and `receipt-lpB.json` in `evidence/devnet/runs/20261006T091531Z` |
| A fund can name a verifier party that reads the fund, every call and every obligation. When it tries to act on them, the ledger refuses | Daml Script | `test_verifier` in `evidence/local/daml_core/20261006T081605Z/result.json` |
| Each party holds its own key. The node can't act for a party without its signature, and another party's key is refused. 76 of 76 checks | LocalNet | `evidence/local/runs/20261004T183146Z/result.json` |
| 100 seeded calls, 191 notices: 0 false fundings, 0 privacy violations, 0 replays, 0 total mismatches | LocalNet | `evidence/local/campaign/20261002T193724Z/result.json` |
| 15 of 15 deliberately broken guards caught by the Daml tests, package 0.3.0 | Daml Script | `evidence/local/mutation/20261006T081625Z/result.json` |
| Payment locked to verified funded in 1,047 ms, with a scripted fund manager on one machine. Not production latency | LocalNet | `evidence/local/workload/20261002T185353Z/result.json` |

[`claims.yaml`](../../../claims.yaml) is the ceiling for every line above. [`docs/PROOF.md`](../../PROOF.md) says how to check each one.

## Not claimed

MainNet, real money or settlement in USDCx. Customers, pilots, partners or letters of intent. A second person's login on DevNet: every sign-in run used the team's own login as the LP. LP-held keys on DevNet. A read-only read-back login on DevNet. Payments hidden from the network. A server that holds no credentials (the demo server holds the backend client for every demo seat). A scheduler, partial payments, notifications or KYC.

## Sources

Problem evidence, 12 public sources: [`docs/PROBLEM_EVIDENCE.md`](../../PROBLEM_EVIDENCE.md). The three quoted above:

- [1] ILPA, "New Template Strengthens Transparency, Communication Around Capital Call & Distribution Notices", 2025-09-11. https://ilpa.org/news/capital-call-and-distribution-update/
- [8] Luxembourg FIU (CRF), "Trend alert #2: Business Email Compromise (BEC) targeting the investment sector", November 2025, ref. TA-2025-002. https://crf.public.lu/dam-assets/news/trend-alert-2-bec.pdf
- [10] Juniper Square, "Description of Services", rev. May 17, 2023. https://www.junipersquare.com/terms-and-policies/description-of-services

Why now:

- USDCx is a CIP-0056 token: https://docs.digitalasset.com/usdcx-xreserve/overview.md
- USDCx on TestNet and MainNet: https://docs.digitalasset.com/usdcx-xreserve/technical-setup.md
- USDCx MainNet registry metadata, listing `splice-api-token-allocation-v1`: https://api.utilities.digitalasset.com/api/token-standard/v0/registrars/decentralized-usdc-interchain-rep::12208115f1e168dd7e792320be9c4ca720c751a02a3053c7606e1c1cd3dad9bf60ef/registry/metadata/v1/info
- Scan serves Canton Coin transfers publicly: https://docs.canton.network/sdks-tools/api-reference/splice-scan-api.md
