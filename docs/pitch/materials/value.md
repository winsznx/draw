# Value

The Value material: the problem DRAW works on, with its public sources and what cuts against it, what DRAW changes for a fund, why now, why it needs Canton, what's proven today, and what isn't claimed. It's for judges scoring the problem statement.

DRAW in one line: private capital calls on Canton. Each LP reads and pays only its own notice, and the fund counts the money as deployable only after a separate read-back step confirms the settlement on the ledger. We built it for the fund COO or operations lead at an emerging manager, meaning a newer, smaller fund manager, and for the outsourced administrator who runs their calls. That they're the people who feel this problem most is our hypothesis.

Network labels used in this file:

- DevNet: "DevNet, HackCanton shared node. DRAW's backend login signs for every demo seat." The backend login is a client the node operator issued for DRAW. The live site before about 13:25 UTC on 2026-10-06, and the scripted runs before 20261006T131900Z, used one hackathon login for every seat.
- Sign-in: "The LP here is signed in with the team's own HackCanton login."
- LocalNet: "LocalNet. Each party signs with its own key." for the custody run and the browser-key journey, and "LocalNet, a separate ledger login per party." for the other runs.
- Asset: "Settles in Canton Coin from the DevNet faucet. Dollar figures are the scenario."

## The problem

An LP commits money to a fund up front, and the fund draws it in parts when it needs it, by sending each LP a notice for its share with a due date. That's a capital call, also called a drawdown. Today, going by public process descriptions, the notice is built in a spreadsheet or admin system and sent by email, the LP pays by wire, and someone then works out which wire belongs to which LP and which call, decides what counts as funded, updates a spreadsheet, chases the rest by email and reports funded versus outstanding.

Public sources describe four pain points. Numbers in brackets point to the source list in [PROBLEM_EVIDENCE.md](../../PROBLEM_EVIDENCE.md).

1. At least one fund administration vendor matches payments in batches from bank exports the client provides. Its service terms say "Client must provide a .csv file of recent bank transactions" for contribution reconciliation, and that contributions are updated "up to three times per capital call" [10].
2. Partial, split and wrong-name payments get worked by hand. One capital call product has users reconcile each contribution against candidate transactions, "including partial and split payments" [11], and a vendor's operations guide, partly marketing, warns that "cleared funds from the wrong name create AML and ownership headaches" [9].
3. One vendor guide, partly marketing, advises counting money only once it has cleared: "Admit only when the sheet says cleared" [9].
4. Fake notices are a known fraud. Luxembourg's Financial Intelligence Unit reports that "a wide range of scams using fake capital call or drawdown notices, falsified invoices or fraudulent loan repayment instructions has been detected" [8]. Funds fight it with procedures, such as "Require two people to approve any change to standing payment instructions" [7], all of it outside the payment itself [6, 7, 8].

LPs care about the notice itself. "For LPs, capital call and distribution notices are essential tools for monitoring cash flow activity," said Neal Prunier, ILPA Managing Director of Industry Affairs [1].

### What weakens this

- Fiat tools already issue notices, attribute payments and track status [10, 11, 12]. Matching on bank rails is a solved category, even if it runs in batches.
- LP defaults are rare [4, 5]. So DRAW leads with telling late from funded, and leaves chasing defaulters out of the pitch.
- Nothing we found says a fund can't deploy before reconciliation finishes. Funds may bridge with subscription credit lines (not sourced), which would soften the urgency.

This is a hypothesis built from 12 public sources. 2 argue against, and 3 show fiat tools already handle notices and matching. No fund operator has confirmed it to us yet: as of 2026-10-06, 0 conversations have been held. The interviews planned in [metrics.md](metrics.md) test it. The sources give no figure for reconciliation hours per call, misattribution rates, days from due date to reconciled funds, late-payment frequency or capital-call fraud losses, so neither do we.

## What DRAW changes

For the fund's operations team, step by step:

| Today | In DRAW |
|---|---|
| A notice per LP | Kept, as an on-ledger notice: a contract between the fund and that LP that no other LP or unrelated party can read |
| Sending it by email | Removed. The LP reads its notice in DRAW. There are no notifications yet |
| A wire reference the LP types by hand | Replaced by a Token Standard allocation that carries the notice's reference in a field the ledger checks |
| Ops matching wires to amounts | For payments made through DRAW, replaced by the checks in the settle step, `Obligation_Settle` |
| Updating the spreadsheet | Removed. The notice turns funded in the same transaction that moves the money |
| Chasing unpaid LPs | Kept, and made explicit: the unpaid LP stays on the unresolved list |
| The funded versus outstanding report | Recomputed from verified notices: deployable now, and unresolved |

That table is how DRAW works. What it's worth to a real fund in hours, errors or cost hasn't been measured, and fewer reconciliation questions, less matching work and fewer surprises in reported funded capital are hypotheses until a pilot measures them.

In more detail:

1. Issue once and get one private notice per LP. Another LP's ledger query gets nothing back, even with the contract id.
2. The payment is a Token Standard (CIP-0056) allocation that carries the notice's reference. A wrong amount, wrong payer, wrong reference or reused payment is refused with the ledger's reason, so it can't fund a notice by mistake. When a payment comes from the wrong party, the fund sends that notice to review with a note.
3. Funded follows the money. The payment carries the notice's reference, and the notice turns funded in the same transaction that moves the money. For payments made through DRAW, the ledger check replaces off-ledger matching. Wires paid outside DRAW still need matching, and a wire-paid notice never counts as deployable.
4. The notice is a contract signed by the fund's party, and only a payment to that party can fund it, so there are no emailed wire details on it to swap. That's a design property. It depends on the LP knowing the fund's real party, which DRAW doesn't onboard, DRAW can't stop fake instructions emailed outside it, and no run has tested a fake-notice attack.
5. A separate read-back step reads each settlement and the fund's holdings from the ledger and runs 14 checks before the dashboard counts it. The fund sees two numbers: deployable now, and unresolved.
6. Anyone who doesn't pay stays visible. Before the due time the ledger refuses to mark them overdue. After it, the fund can. The fund can also send a notice to review, or waive an overdue or reviewed one, each with a note, and a waived notice leaves the unresolved total. A late payment still settles, as 26 late payments did in the LocalNet campaign, and the settlement records that it was paid after the due time, which is checked in Daml Script.

Still manual: the fund clicks Settle, marks overdue after the due time, and makes the review and waive decisions.

## Why now

- Canton's Token Standard, CIP-0056, gives a common way to lock a payment for one specific settlement, with the reference inside the payment. DRAW settles through its allocation API.
- A tokenized dollar is documented on the network. USDCx represents USDC deposited into Circle's xReserve, is a CIP-0056 token documented for TestNet and MainNet, and its MainNet registry metadata lists `splice-api-token-allocation-v1`, the allocation API DRAW settles through. DRAW hasn't run with USDCx. Our hypothesis is that this could give funds and LPs a dollar rail they share.
- The industry is standardizing what a notice contains. ILPA released v2.0 of its capital call and distribution template on 2025-09-11 [1, 2].

## Why Canton

We ran the same $1,000,000 call (scenario) on an ordinary database with a `paid` flag and role filtering in the app, then tried five attacks on both. The database attacker had write access, as an operator or a compromised app server would. LocalNet, [the ablation run](../../../evidence/local/ablation/20261002T193830Z/result.json).

| Attack | Database with a paid flag | DRAW |
|---|---|---|
| Mark an unpaid LP funded | Got through | Stopped |
| Read another LP's notice | Got through | Stopped |
| Reuse one payment for another notice | Got through | Stopped |
| Count a payment row as money | Got through | Stopped |
| LP changes its own notice | Stopped | Stopped |

Honest-path totals are identical on both: $750,000 funded, $250,000 unresolved. A database does some things just as well: it shows the fund every notice, computes totals when nobody misbehaves, and keeps LPs from writing.

Three things Canton changes, narrowly:

- Privacy sits below the app. With a login per party, as on LocalNet, LP A's own ledger view never returns LP B's notice, even by contract id, so a missing filter in a read path that runs as LP A can't leak it. On DevNet one backend login acts for every demo party, so the app picks which party to read as, and each party's own reads and transaction stream held only its own records. An LP that signs in with its own HackCanton login reads with its own token.
- Funded follows the money. The notice turns funded only in the transaction that executes the token transfer, and that transfer needs the LP's prior consent, since the LP creates the allocation.
- A payment can't be reused. A settled allocation is consumed.

What it doesn't hide or change: the fund sees every LP, because it's a party to every notice. The node operator that hosts every party can read them all. Per the Splice token design, the token registry operator, the DSO, is a stakeholder of each allocation and so sees its reference, which is random and names no one. No run has read the DSO's view. Per the Splice Scan API docs, the Canton Coin leg of each payment appears in Scan with its random reference and the party ids, whose hints such as `draw-lpa` are readable, and the notices don't. We inferred this from the docs and haven't checked it against Scan. Subscription documents, fund terms, onboarding and KYC stay off the ledger. The commitment amount is on the ledger, but nothing there checks it against a signed subscription. Bank wires still reconcile elsewhere.

## What's proven today

| Claim | Network | Evidence |
|---|---|---|
| The full call on the HackCanton node: two LPs settle with Canton Coin, bad payments are refused, the unpaid LP goes overdue, the fund's totals match the coin it received. 82 of 82 checks on package 0.3.0. The demo seats act through a backend client the node operator issued for DRAW, which the node reports as holding rights on the five demo parties and nothing else | DevNet | [run 20261006T131900Z](../../../evidence/devnet/runs/20261006T131900Z/result.json), [probe 20261006T133219Z](../../../evidence/devnet/probes/20261006T133219Z/result.json) |
| Each LP's call also reaches it as a CIP-0056 AllocationRequest, the Token Standard interface an app uses to ask a user for an allocation. Other LPs and unrelated parties can't see it. LP A paid by creating the allocation from that request, the same factory call a wallet makes, and the request closed when the call settled. The run script did this, through the backend client in the 82-check run and the shared login in the 79-check run before it | DevNet, Daml Script | the `wallet` checks in [run 20261006T131900Z](../../../evidence/devnet/runs/20261006T131900Z/result.json) and [run 20261006T091531Z](../../../evidence/devnet/runs/20261006T091531Z/result.json), `test_payment_request` in [daml_core 20261006T081605Z](../../../evidence/local/daml_core/20261006T081605Z/result.json) |
| The deployed web app runs a call end to end in a browser: take a seat, issue, LP A pays, LP B gets nothing from LP A's notice link, settle, verified funded. Each browser gets its own demo fund. 10 of 10 steps, with the demo seats on the backend client | DevNet | [web-journey-20261006132858](../../../evidence/devnet/browser/web-journey-20261006132858/result.json) |
| An LP with its own HackCanton login joins as itself: it signs in on the node's Keycloak, its browser reads its notices with its own token, it accepts with that login, and it pays from its own Canton wallet, from DRAW or by pressing Accept in the node's Canton Coin wallet. The fund manager settles and the notice shows verified funded. DRAW's server never receives the LP's token, and in the newest runs the server's only ledger credential was the backend client, so nothing it held could act for the LP's party. Every run used the team's own login as the LP | DevNet | [web-hackcanton-20261006132613](../../../evidence/devnet/browser/web-hackcanton-20261006132613/result.json) (7 of 7 steps), [web-hackcanton-wallet-20261006132730](../../../evidence/devnet/browser/web-hackcanton-wallet-20261006132730/result.json) (9 of 9) |
| A separate read-back step confirms each settlement before it counts. On DevNet it used a client of its own, which the ledger refused when it tried to act as the fund. That client can still act for the team's personal party, so it isn't called read-only, and the live server doesn't use it. On LocalNet it runs as a read-only login that can't submit | DevNet, LocalNet | DevNet receipts in [run 20261006T131900Z](../../../evidence/devnet/runs/20261006T131900Z/receipt-lpA.json) and the probe above. LocalNet [receipt](../../../evidence/local/runs/20261001T162427Z/receipt-lpA.json) |
| The read-back receipts are stamped 6.4 seconds (LP A) and 5.1 seconds (LP B) after the settlements' record times, the verifier's clock against the ledger's | DevNet, one run | [receipt-lpA.json](../../../evidence/devnet/runs/20261006T131900Z/receipt-lpA.json) and [receipt-lpB.json](../../../evidence/devnet/runs/20261006T131900Z/receipt-lpB.json), run 20261006T131900Z |
| A fund can name a verifier party that reads the fund, every call and every obligation. When it tries to act on them, the ledger refuses | Daml Script | `test_verifier` in [daml_core 20261006T081605Z](../../../evidence/local/daml_core/20261006T081605Z/result.json) |
| Each party holds its own key. The node can't act for a party without its signature, and another party's key is refused. 76 of 76 checks | LocalNet | [run 20261004T183146Z](../../../evidence/local/runs/20261004T183146Z/result.json) |
| 100 seeded calls, 191 notices: 0 false fundings, 0 privacy violations, 0 replays, 0 total mismatches | LocalNet | [campaign 20261002T193724Z](../../../evidence/local/campaign/20261002T193724Z/result.json) |
| 15 of 15 deliberately broken guards caught by the Daml tests, package 0.3.0 | Daml Script | [mutation 20261006T081625Z](../../../evidence/local/mutation/20261006T081625Z/result.json) |
| Payment locked to verified funded in 1,047 ms, with a scripted fund manager on one machine. Not production latency | LocalNet | [workload 20261002T185353Z](../../../evidence/local/workload/20261002T185353Z/result.json) |

[claims.yaml](../../../claims.yaml) is the ceiling for every line above, and [PROOF.md](../../PROOF.md) says how to check each one. Package 0.3.0 has run only in Daml Script and on DevNet, and every LocalNet run used package 0.2.0 or earlier.

## Not claimed

MainNet, real money or settlement in USDCx. Customers, pilots, partners or letters of intent. A second person's login on DevNet: every sign-in run used the team's own login as the LP. LP-held keys on DevNet. An independent read-back on any network, or a read-only read-back login on DevNet. That only the LP and the fund can read a notice. Payments hidden from the network. A server that holds no credentials, since the demo server holds the backend client for every demo seat. A scheduler, partial payments, notifications or KYC. Any figure for hours saved, error rates or cost per call.

## Sources

The problem evidence is 12 public sources, listed with dates, what each shows and which ones cut against us in [PROBLEM_EVIDENCE.md](../../PROBLEM_EVIDENCE.md). That's where source 10 and the rest are cited. The two quoted here at length:

- [1] ILPA, "New Template Strengthens Transparency, Communication Around Capital Call & Distribution Notices", 2025-09-11. https://ilpa.org/news/capital-call-and-distribution-update/
- [8] Luxembourg FIU (CRF), "Trend alert #2: Business Email Compromise (BEC) targeting the investment sector", November 2025, Ref. TA-2025-002. https://crf.public.lu/dam-assets/news/trend-alert-2-bec.pdf

Why now and why Canton:

- USDCx is a CIP-0056 token: https://docs.digitalasset.com/usdcx-xreserve/overview.md
- USDCx on TestNet and MainNet: https://docs.digitalasset.com/usdcx-xreserve/technical-setup.md
- USDCx MainNet registry metadata, listing `splice-api-token-allocation-v1`: https://api.utilities.digitalasset.com/api/token-standard/v0/registrars/decentralized-usdc-interchain-rep::12208115f1e168dd7e792320be9c4ca720c751a02a3053c7606e1c1cd3dad9bf60ef/registry/metadata/v1/info
- Splice Scan API, on what Scan observes: https://docs.canton.network/sdks-tools/api-reference/splice-scan-api.md
- The database comparison in full: [CANTON_ABLATION.md](../../CANTON_ABLATION.md)
