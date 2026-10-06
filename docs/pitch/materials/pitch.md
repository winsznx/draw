# Pitch

The Pitch material: DRAW in one line, in thirty seconds and in two minutes slide by slide, then the numbers we use with their labels and what we don't claim. It's for judges scoring the presentation, and it's the text the deck and the video follow.

- Deck, 11 slides: `docs/pitch/DRAW-deck.pdf`, built from `docs/pitch/deck.html`. It's v1. The fixes listed in [SUBMISSION.md](../../SUBMISSION.md#links) are made and the PDF was re-exported on 2026-10-06, and it isn't linked here until the owner has reviewed it.
- Script for the demo video: [video-script.md](../video-script.md). The video link is added at submission.
- Live demo on DevNet: https://draw.timjosh507.workers.dev
- Proof page: https://draw.timjosh507.workers.dev/proof
- Judge Q&A: [judge-qa.md](../judge-qa.md)

## One line

Private capital calls on Canton. Each LP reads and pays only its own notice, and the fund counts the money as deployable only after a separate read-back step confirms the settlement on the ledger.

## Thirty seconds

When a fund calls capital, every LP gets a notice for its share and pays by wire. Then someone matches wires to LPs, at least one administration vendor in batches from bank exports, works partial and wrong-name payments by hand, and watches for fake notices with swapped bank details. We built DRAW for the fund COO or ops lead at an emerging manager, and our hypothesis is that they feel this most. In DRAW each LP's notice is a contract between the fund and that LP that no other LP or unrelated party can read, though the operator of the node that hosts them can. The LP pays with a token that carries the notice's reference, the notice turns funded in the same transaction that moves the money, and anything that doesn't match exactly is refused. A separate read-back step confirms each payment before it counts. It runs end to end on the HackCanton DevNet node today.

## Two minutes, slide by slide

1. DRAW in one line. The cover shows the scripted DevNet run on the HackCanton shared node, where DRAW's backend login signs for every demo seat: LP A and LP B verified funded, LP C overdue, $750,000 deployable and $250,000 unresolved. Dollar figures are the scenario, and the coin was Canton Coin from the DevNet faucet.
2. The problem. At least one fund administration vendor matches payments in batches from bank exports the client provides, wrong-name and partial payments are worked by hand, and Luxembourg's Financial Intelligence Unit reports "a wide range of scams using fake capital call or drawdown notices". The evidence is 12 public sources. 2 argue against, and 3 show fiat tools already handle notices and matching.
3. The person. We built DRAW for the fund COO or operations lead at an emerging manager, meaning a newer, smaller fund manager, or the outsourced administrator who runs the call for them. That they feel this most is our hypothesis. Their question: how much of this capital call is deployable right now, and what amount remains unresolved?
4. How it works. Issue, pay, settle, verify. One action issues a notice per LP (one ledger transaction on LocalNet). The LP locks the exact amount with the notice's reference. One transaction checks it, moves the coin and marks the notice funded. A separate read-back step runs 14 checks before it counts.
5. Live on DevNet. The deployed app, in a browser, on the HackCanton node: issue, LP A pays, LP B opens LP A's link and gets nothing, settle, verified funded. An LP with its own HackCanton login can also join, read its notices with its own token and pay from its own Canton wallet. Every run of that used the team's own login as the LP. The slide's screens come from the 2026-10-05 run, when one hackathon login signed for every seat, as its footer says.
6. An LP pays from its own Canton wallet. The call also reaches the LP as a CIP-0056 allocation request, the node's Canton Coin wallet lists it, and Accept pays it. 9 of 9 steps on the live site from sign-in to verified funded, and 7 of 7 paying from DRAW. The screens are from the newest wallet run, with the server on the backend client, which can't act for the LP's party.
7. Why Canton. The same call on a database with a paid flag let 4 of 5 attacks through, to an attacker with write access, and DRAW let none through. Privacy sits below the app, funded follows the money, and a payment can't be reused. The fund sees every LP, and the node operator can read every party it hosts. Per the Splice Scan API docs, the Canton Coin leg of each payment appears in Scan with its random reference and the party ids, whose hints such as `draw-lpa` are readable, and the notices don't. We inferred this from the docs and haven't checked it against Scan.
8. Proof. 82 of 82 checks on DevNet on package 0.3.0, with the demo seats on the backend client and the read-back on a login of its own. 76 of 76 on LocalNet with each party signing with its own key. 100 of 100 generated calls on LocalNet. 15 of 15 broken guards caught in Daml Script. The DevNet read-back receipts are stamped 6.4 s and 5.1 s after the settlements' record times.
9. Validation. 12 public sources on file. 0 conversations and 0 usability tests as of 2026-10-06. They come next, and their results go in only from notes.
10. Go to market. One administrator serving several emerging managers first, then the COO or ops lead at managers that run their own calls. A shadow run of one real call with no money moving. Pricing is a hypothesis, and no price is set.
11. Roadmap and the ask. A shadow pilot of one real call, and on DevNet a read-back login that only reads and a second person signing in. Then TestNet with USDCx, which needs Tokenomics Committee approval and a Super Validator sponsor. The ask: an introduction to someone who'd shadow one real call, and help getting onto TestNet.

## Numbers we use, with their labels

| Number | Label | Evidence |
|---|---|---|
| 82 of 82 checks, package 0.3.0, plus 1 credential check skipped with its reason | DevNet, HackCanton shared node. DRAW's backend login signs for every demo seat, and the read-back used a login of its own | [run 20261006T131900Z](../../../evidence/devnet/runs/20261006T131900Z/result.json) |
| $750,000 deployable, $250,000 unresolved, 40 / 35 / 25 CC | DevNet. Dollar figures are the scenario | [totals.json](../../../evidence/devnet/runs/20261006T131900Z/totals.json) |
| 14 of 14 checks per receipt | DevNet and LocalNet | [DevNet receipt](../../../evidence/devnet/runs/20261006T131900Z/receipt-lpA.json), [LocalNet receipt](../../../evidence/local/runs/20261001T162427Z/receipt-lpA.json) |
| 6.4 and 5.1 seconds, settlement record time to LP A's and LP B's read-back receipts, the verifier's clock against the ledger's | DevNet, one run | [receipt-lpA.json](../../../evidence/devnet/runs/20261006T131900Z/receipt-lpA.json), [receipt-lpB.json](../../../evidence/devnet/runs/20261006T131900Z/receipt-lpB.json), run 20261006T131900Z |
| 7 of 7 payment request checks: each LP's call reaches it as a CIP-0056 AllocationRequest that no other LP or unrelated party sees, and LP A paid from it | DevNet, through the backend client, and with the shared login in the run before | the `wallet` checks in [run 20261006T131900Z](../../../evidence/devnet/runs/20261006T131900Z/result.json) |
| 10 of 10 steps, live-site browser journey with a demo fund per browser | DevNet, with the demo seats on the backend client | [web-journey-20261006132858](../../../evidence/devnet/browser/web-journey-20261006132858/result.json) |
| 7 of 7 and 9 of 9 steps: an LP signed in with its own HackCanton login pays from its own Canton wallet, from DRAW or with Accept in the node's Canton Coin wallet | DevNet. The LP here is signed in with the team's own HackCanton login, and the server was on the backend client | [web-hackcanton-20261006132613](../../../evidence/devnet/browser/web-hackcanton-20261006132613/result.json), [web-hackcanton-wallet-20261006132730](../../../evidence/devnet/browser/web-hackcanton-wallet-20261006132730/result.json) |
| 76 of 76 checks, each party signing with its own key | LocalNet. Each party signs with its own key | [run 20261004T183146Z](../../../evidence/local/runs/20261004T183146Z/result.json) |
| 100 of 100 generated calls, 191 notices, 0 false fundings | LocalNet, a separate ledger login per party | [campaign 20261002T193724Z](../../../evidence/local/campaign/20261002T193724Z/result.json) |
| 4 of 5 attacks through a database, 0 through DRAW | LocalNet. The database attacker had write access, as an operator or a compromised app server would | [ablation 20261002T193830Z](../../../evidence/local/ablation/20261002T193830Z/result.json) |
| 15 of 15 broken guards caught | Daml Script, package 0.3.0 | [mutation 20261006T081625Z](../../../evidence/local/mutation/20261006T081625Z/result.json) |
| 1,047 ms, payment locked to verified funded | LocalNet, scripted, one machine, not production latency | [workload 20261002T185353Z](../../../evidence/local/workload/20261002T185353Z/result.json) |
| 12 public sources, 2 against, 3 showing fiat tools already handle notices and matching | Public sources, collected 2026-10-04 | [PROBLEM_EVIDENCE.md](../../PROBLEM_EVIDENCE.md) |

Every test number traces to a script-written file, and [claims.yaml](../../../claims.yaml) is the ceiling. Package 0.3.0 has run only in Daml Script and on DevNet, and every LocalNet number comes from package 0.2.0 or earlier. [metrics.md](metrics.md) has the file behind each number.

## Not claimed

DRAW doesn't claim any of the following, and nothing in the deck, the video or the repository should read as if it does.

- MainNet, real money, or settlement in USDCx.
- Customers, pilots, partners or letters of intent.
- A second person's login on DevNet. Every sign-in run used the team's own login as the LP.
- LP-held keys on DevNet. They're shown on LocalNet only.
- Payments hidden from the network. Per the Splice Scan API docs, the Canton Coin leg of each payment appears in Scan.
- A server that holds no credentials. The demo server holds the backend client for every demo seat.
- An independent read-back on any network, since the read-back runs in the same process as the submitter, or a read-only one on DevNet, since its own login can still act for the team's personal party.
- That only the LP and the fund can read a notice. The node operator can read every party it hosts.
- A scheduler, partial payments, notifications or KYC.
- That judges can hold their own key on DevNet.
- That any Canton wallet can pay a DRAW request. The node's own Canton Coin wallet did, for a party on the fund's node.
- A quote from a conversation without the person's permission.
