# Pitch

- Deck, 11 slides: [`docs/pitch/DRAW-deck.pdf`](../DRAW-deck.pdf). Source: [`docs/pitch/deck.html`](../deck.html)
- Demo video, 3:30 to 4:00: to add once it's published. Script: [`docs/pitch/video-script.md`](../video-script.md)
- Live demo on DevNet: https://draw.timjosh507.workers.dev
- Judge Q&A: [`docs/pitch/judge-qa.md`](../judge-qa.md)

## One line

Capital calls only the right investor can read: each LP reads and pays only its own notice, and the fund counts money as deployable only after the settlement is read back from the ledger.

## Thirty seconds

When a fund calls capital, every LP gets a notice and pays by wire. Then someone matches wires to LPs from a bank export, chases partial and wrong-name payments by hand, and watches for fake notices with swapped bank details. DRAW puts the call on Canton. Each LP's notice is a contract between that LP and the fund, and no other LP can read it. The LP pays with a token that carries the notice's reference, and the notice turns funded in the same transaction that moves the money. Anything that doesn't match exactly is refused. It runs end to end on the HackCanton DevNet node today, and an LP with its own HackCanton login can join as itself and pay from its own Canton wallet.

## Two minutes, slide by slide

1. DRAW in one line. On the cover, a DevNet run on the HackCanton shared node, where DRAW's backend login signs for every demo seat: LP A and LP B verified funded, LP C overdue, $750,000 deployable and $250,000 unresolved. Dollar figures are the scenario. The coin was Canton Coin from the DevNet faucet.
2. The problem. Matching runs in batches from bank exports, wrong-name and partial payments are worked by hand, and Luxembourg's financial intelligence unit has flagged scams using fake capital call notices. All 12 sources are public, and 2 of them cut against us.
3. The person. The fund COO or operations lead at an emerging manager, or the outsourced administrator who runs the call for them. Their question: how much of this call is deployable right now, and what's still unresolved?
4. How it works. Issue, pay, settle, verify. One transaction issues a notice per LP. The LP locks the exact amount with the notice's reference. One transaction checks it, moves the coin and marks the notice funded. A separate read-back step runs 14 checks before it counts.
5. Live on DevNet. The deployed app, in a browser, on the HackCanton node: issue, LP A pays, LP B opens LP A's link and gets nothing, settle, verified funded. An LP with its own HackCanton login can also join, read its notices with its own token and pay from its own Canton wallet. Every run of that used the team's own login as the LP.
6. An LP pays from its own Canton wallet. The call also reaches the LP as a CIP-0056 allocation request, the node's Canton Coin wallet lists it, and Accept pays it. 9 of 9 steps on the live site from sign-in to verified funded, and 7 of 7 paying from DRAW. The screens are from a run when the server still held the team's login. In the newest runs it held only the backend client, which can't act for the LP's party.
7. Why Canton. The same call on a database with a paid flag let 4 of 5 attacks through, and DRAW let none through. Privacy sits below the app, funded follows the money, and a payment can't be reused. The fund sees every LP, the node operator can read every party it hosts, and the Canton Coin leg shows up in Scan.
8. Proof. 82 of 82 checks on DevNet on package 0.3.0, with the demo seats on the backend client and the read-back on a login of its own. 76 of 76 on LocalNet with each party signing with its own key. 100 of 100 generated calls on LocalNet. 15 of 15 broken guards caught.
9. Validation. 12 public sources on file, 2 of them against us. Conversations and usability tests come next, and their results go in only from notes.
10. Go to market. One administrator serving several emerging managers first, then the COO or ops lead at managers that run their own calls. A shadow run of one real call with no money moving. Pricing is a hypothesis.
11. Roadmap and the ask. A shadow pilot of one real call, and on DevNet a read-back login that only reads and a second person signing in. Then TestNet with USDCx, which needs Tokenomics Committee approval and a Super Validator sponsor. The ask: an introduction to someone who'd shadow one real call, and help onto TestNet.

## Numbers we use, with their labels

| Number | Label |
|---|---|
| 82 of 82 checks, package 0.3.0, 1 credential check skipped | DevNet, HackCanton shared node. DRAW's backend login signs for every demo seat, and the read-back used a login of its own |
| $750,000 deployable, $250,000 unresolved, 40 / 35 / 25 CC | DevNet. Dollar figures are the scenario |
| 14 of 14 checks per receipt | DevNet and LocalNet |
| 6.8 and 4.5 seconds, settlement record time to LP A's and LP B's read-back receipts, the verifier's clock against the ledger's | DevNet, the earlier shared-login run 20261006T091531Z |
| 7 of 7 payment request checks: each LP's call reaches it as a CIP-0056 AllocationRequest that no other LP or outsider sees, and LP A paid from it | DevNet, through the backend client, and with the shared login in the run before |
| 10 of 10 steps, live-site browser journey with a demo fund per browser | DevNet, with the demo seats on the backend client |
| 7 of 7 and 9 of 9 steps: an LP signed in with its own HackCanton login pays from its own Canton wallet, from DRAW or with Accept in the node's Canton Coin wallet | DevNet, with the team's own login as the LP and the server on the backend client |
| 76 of 76 checks, each party signing with its own key | LocalNet |
| 100 of 100 generated calls, 191 notices, 0 false fundings | LocalNet |
| 4 of 5 attacks through a database, 0 through DRAW | LocalNet |
| 15 of 15 broken guards caught | Daml Script |
| 1,047 ms, payment locked to verified funded | LocalNet, scripted, one machine, not production latency |
| 12 public sources | docs/PROBLEM_EVIDENCE.md |

Every test number traces to a script-written file, and [`claims.yaml`](../../../claims.yaml) is the ceiling. See [`metrics.md`](metrics.md) for the file behind each one.

## What we never say

- MainNet, real money, or settlement in USDCx.
- Customers, pilots, partners or letters of intent.
- A second person's login on DevNet. Every sign-in run used the team's own login as the LP.
- LP-held keys on DevNet.
- That payments are hidden from the network. Canton Coin transfers appear in Scan.
- That the server holds no credentials. The demo server holds the backend client for every demo seat.
- "Independent" or "read-only" for the DevNet read-back. Its own login can still act for the team's personal party.
- A scheduler, partial payments, notifications or KYC.
- That judges can hold their own key on DevNet.
- That any Canton wallet can pay a DRAW request. The node's own Canton Coin wallet did, for a party on the fund's node.
- A quote from a conversation without the person's permission.
