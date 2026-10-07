# Pitch

The Pitch material: DRAW in one line, in thirty seconds and in two minutes slide by slide, then the numbers we use with their labels and what we don't claim. It's for judges scoring the presentation, and it's the text the deck and the video follow.

- Deck, 11 slides: `docs/pitch/DRAW-deck.pdf`, built from `docs/pitch/deck.html`. It's v1. The fixes listed in [SUBMISSION.md](../../SUBMISSION.md#links) are made, the PDF was re-exported on 2026-10-07 with the newest DevNet runs, and it isn't linked here until the owner has reviewed it.
- Script for the demo video: [video-script.md](../video-script.md). The video link is added at submission.
- Live demo on DevNet: https://drawcalls.xyz
- Proof page: https://drawcalls.xyz/proof
- Judge Q&A: [judge-qa.md](../judge-qa.md)

## One line

Private capital calls on Canton. Each LP reads and pays only its own notice, and the fund counts the money as deployable only after a read-back step confirms the settlement on the ledger.

## Thirty seconds

When a fund calls capital, every LP gets a notice for its share and pays by wire. Then someone matches wires to LPs, at least one administration vendor in batches from bank exports, works partial and wrong-name payments by hand, and watches for fake notices with swapped bank details. We built DRAW for the fund COO or ops lead at an emerging manager, and our hypothesis is that they feel this most. In DRAW each LP's notice is a contract between the fund and that LP that no other LP or unrelated party can read, though the operator of the node that hosts them can. The LP pays with a token that carries the notice's reference, the notice turns funded in the same transaction that moves the money, and anything that doesn't match exactly is refused. A read-back step confirms each payment before it counts. It runs end to end on the HackCanton DevNet node today.

## Two minutes, slide by slide

1. DRAW in one line. The cover shows the scripted DevNet run on the HackCanton shared node in which each party signs with its own key, with all five keys on the machine that ran it: LP A and LP B verified funded, LP C overdue, $750,000 deployable and $250,000 unresolved. Dollar figures are the scenario, and the coin was Canton Coin from the DevNet faucet.
2. The problem. At least one fund administration vendor matches payments in batches from bank exports the client provides, wrong-name and partial payments are worked by hand, and Luxembourg's Financial Intelligence Unit reports "a wide range of scams using fake capital call or drawdown notices". The evidence is 12 public sources. 2 argue against, and 3 show fiat tools already handle notices and matching.
3. The person. We built DRAW for the fund COO or operations lead at an emerging manager, meaning a newer, smaller fund manager, or the outsourced administrator who runs the call for them. That they feel this most is our hypothesis. Their question: how much of this capital call is deployable right now, and what amount remains unresolved?
4. How it works. Issue, pay, settle, verify. One action issues a notice per LP (one ledger transaction on LocalNet). The LP locks the exact amount with the notice's reference. One transaction checks it, moves the coin and marks the notice funded. A read-back step runs 14 checks before it counts.
5. Live on DevNet. The deployed app, in a browser, on the HackCanton node: issue, LP A pays, LP B opens LP A's link and gets nothing, settle, verified funded. An LP with its own HackCanton login can also join, read its notices with its own token and pay from its own Canton wallet. Every run of that used the team's own login as the LP. The slide's screens come from the 2026-10-05 run, when one hackathon login signed for every seat, as its footer says.
6. An LP pays from its own Canton wallet. The call also reaches the LP as a CIP-0056 allocation request, the node's Canton Coin wallet lists it, and Accept pays it. 9 of 9 steps on the live site from sign-in to verified funded, and 7 of 7 paying from DRAW. The screens are from the wallet run of 2026-10-06, with the server on the backend client, which can't act for the LP's party. The newest runs, on 2026-10-07, passed the same steps with the read-back on a login of its own.
7. Why Canton. The same call on a database with a paid flag let 4 of 5 attacks through, to an attacker with write access, and DRAW let none through. Privacy sits below the app, funded follows the money, and a payment can't be reused. The fund sees every LP, and the node operator can read every party it hosts. Per the Splice Scan API docs, the Canton Coin leg of each payment appears in Scan with its random reference and the party ids, whose hints such as `draw-lpa` are readable, and the notices don't. We inferred this from the docs and haven't checked it against Scan.
8. Proof. 83 of 83 checks on DevNet on package 0.3.0, with five parties each signing its own transactions with its own key. All five keys sat on the machine that ran the script, and one login submitted for every party and read each settlement back. 76 of 76 on LocalNet with each party signing with its own key. 100 of 100 generated calls on LocalNet. 15 of 15 broken guards caught in Daml Script. In that DevNet run the read-back receipts are stamped 5.0 s and 5.3 s after the settlements' record times. The footer also names the run on the demo seats, 82 of 82, with the read-back on a login that can only read as the fund.
9. Validation. 12 public sources on file. 0 conversations and 0 usability tests as of 2026-10-07. They come next, and their results go in only from notes.
10. Go to market. One administrator serving several emerging managers first, then the COO or ops lead at managers that run their own calls. A shadow run of one real call with no money moving. Pricing is a hypothesis, and no price is set.
11. Roadmap and the ask. A shadow pilot of one real call, and on DevNet a second person signing in and keys held by separate people. Then TestNet with USDCx, which needs Tokenomics Committee approval and a Super Validator sponsor. The ask: an introduction to someone who'd shadow one real call, and help getting onto TestNet.

## Numbers we use, with their labels

| Number | Label | Evidence |
|---|---|---|
| 83 of 83 checks, package 0.3.0, plus 2 checks skipped with their reasons | DevNet, HackCanton shared node. Each party signs with its own key. All five keys sat on the machine that ran the script, and one login submitted for every party and read each settlement back | [run 20261007T130259Z](../../../evidence/devnet/runs/20261007T130259Z/result.json) |
| 82 of 82 checks, package 0.3.0, plus 1 credential check skipped with its reason | DevNet, HackCanton shared node. DRAW's backend login signs for every demo seat, and a different login reads each settlement back | [run 20261007T125638Z](../../../evidence/devnet/runs/20261007T125638Z/result.json) |
| $750,000 deployable, $250,000 unresolved, 40 / 35 / 25 CC | DevNet. Dollar figures are the scenario | [totals.json](../../../evidence/devnet/runs/20261007T130259Z/totals.json), the same in both runs |
| 14 of 14 checks per receipt | DevNet and LocalNet | [DevNet receipt](../../../evidence/devnet/runs/20261007T130259Z/receipt-lpA.json), [LocalNet receipt](../../../evidence/local/runs/20261001T162427Z/receipt-lpA.json) |
| 5.0 and 5.3 seconds in run 20261007T130259Z, and 7.5 and 5.2 seconds in run 20261007T125638Z, settlement record time to LP A's and LP B's read-back receipts, the read-back's clock against the ledger's | DevNet, one run each | [receipt-lpA.json](../../../evidence/devnet/runs/20261007T130259Z/receipt-lpA.json) and [receipt-lpB.json](../../../evidence/devnet/runs/20261007T130259Z/receipt-lpB.json), run 20261007T130259Z. [receipt-lpA.json](../../../evidence/devnet/runs/20261007T125638Z/receipt-lpA.json) and [receipt-lpB.json](../../../evidence/devnet/runs/20261007T125638Z/receipt-lpB.json), run 20261007T125638Z |
| 7 of 7 payment request checks: each LP's call reaches it as a CIP-0056 AllocationRequest that no other LP or unrelated party sees, and LP A paid from it | DevNet. LP A's own key signed its allocation in run 20261007T130259Z, and the backend client created it in run 20261007T125638Z | the `wallet` checks in [run 20261007T130259Z](../../../evidence/devnet/runs/20261007T130259Z/result.json) and [run 20261007T125638Z](../../../evidence/devnet/runs/20261007T125638Z/result.json) |
| 10 of 10 steps, live-site browser journey with a demo fund per browser | DevNet, with the demo seats on the backend client and the read-back on a login of its own | [web-journey-20261007130359](../../../evidence/devnet/browser/web-journey-20261007130359/result.json) |
| 7 of 7 and 9 of 9 steps: an LP signed in with its own HackCanton login pays from its own Canton wallet, from DRAW or with Accept in the node's Canton Coin wallet | DevNet. The LP here is signed in with the team's own HackCanton login, and nothing the server held could act for its party | [web-hackcanton-20261007130106](../../../evidence/devnet/browser/web-hackcanton-20261007130106/result.json), [web-hackcanton-wallet-20261007130229](../../../evidence/devnet/browser/web-hackcanton-wallet-20261007130229/result.json) |
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
- Keys held by separate people on DevNet. In the DevNet run in which each party signs with its own key, all five keys sat on the machine that ran the script.
- Payments hidden from the network. Per the Splice Scan API docs, the Canton Coin leg of each payment appears in Scan.
- A server that holds no credentials. The demo server holds the backend client for every demo seat.
- An independent read-back on any network, since the read-back runs in the same process as the submitter. In the DevNet run in which each party signs with its own key, the read-back used the login that submitted for every party.
- That only the LP and the fund can read a notice. The node operator can read every party it hosts.
- A scheduler, partial payments, notifications or KYC.
- That judges can hold their own key on DevNet.
- That any Canton wallet can pay a DRAW request. The node's own Canton Coin wallet did, for a party on the fund's node.
- A quote from a conversation without the person's permission.
