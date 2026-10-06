# Demo

## Links

| | |
|---|---|
| Live demo | https://draw.timjosh507.workers.dev |
| Proof page | https://draw.timjosh507.workers.dev/proof |
| Video | To add once it's published |
| Repository | To add once the public GitHub repo exists |
| Deck | [`docs/pitch/DRAW-deck.pdf`](../DRAW-deck.pdf) |

## What you're looking at

- DevNet, HackCanton shared node. DRAW's backend login signs for every demo seat.
- Settles in Canton Coin from the DevNet faucet. Dollar figures are the scenario.

The live site runs on the HackCanton DevNet node. Every screen reads the ledger as the seat you chose, and the seat card in the bottom left shows that party. A backend client that NODERS issued for DRAW signs for every demo seat. If you have a HackCanton login, you can also join as an LP yourself (see below). A separate login per party, and a key held by each party, are shown on LocalNet (see the last section).

Anyone can read the site. Issuing, paying and settling need the demo access code. Where to find it: to add before submission, on the landing page or in the submission text.

## The 3-minute tour

Each browser gets its own demo fund, so you never share one with another visitor. If an LP's balance is short at any point, "Add test CC" on its seat card taps the DevNet faucet.

1. Open https://draw.timjosh507.workers.dev and click "Take a seat in the demo fund". If the page says this browser has no demo fund yet, click "Create the demo fund" and wait about a minute. Choose LP A, enter the access code, open the app, and click "Accept commitment".
2. Click "Switch seat" and choose Fund manager. Click "Create capital call". LP A comes prefilled at $400,000, paid as 40 CC. Only LPs that have accepted appear, so accept LP B and LP C from their own seats first if you want the full $1,000,000 call. Click "Issue capital call".
3. Switch seat to LP A. Open the notice for your call and click Pay. Copy the page address.
4. Switch seat to LP B and open LP A's notice address. LP B's own ledger query returns nothing, so the page says "Not on your ledger".
5. Switch seat back to Fund manager, open the call and click Settle. Once the read-back step agrees, the notice shows Funded, and LP A's notice says "Verified funded" with 14 of 14 checks.

## What each step shows

| Step | What it proves | Backed by |
|---|---|---|
| Issue | One action creates a separate notice per LP, each a contract that other LPs can't read | `web-journey-devnet` in `claims.yaml` |
| Pay | The LP locks the exact amount in a Token Standard allocation carrying the notice's reference. Nothing has moved yet | same |
| LP B opens LP A's link | LP B's ledger query returns nothing for LP A's notice | DevNet run: party-scoped reads and transaction streams, `evidence/devnet/runs/20261006T131900Z/streams.json` |
| Settle | The coin moves and the notice turns funded in one transaction | `evidence/devnet/runs/20261006T131900Z/receipt-lpA.json` |
| Verified funded | A separate read-back step checked the settlement (14 checks) before it counted. On the live site it reads with the same backend login. In the scripted DevNet run it used a client of its own, which the ledger refused when it tried to act as the fund | same receipt |

The same journey passed in a scripted browser against the live site on 2026-10-06, 10 of 10 steps, including a second browser that gets its own demo fund: `evidence/devnet/browser/web-journey-20261006091011/result.json`, again on the release with sign-in: `evidence/devnet/browser/web-journey-20261006101224/result.json`, and again with the demo seats on the backend client: `evidence/devnet/browser/web-journey-20261006132858/result.json`. It passed 8 of 8 steps on 2026-10-05, before each browser had its own fund.

## Have a HackCanton login? Join as an LP yourself

Your login's party has to be onboarded in the node's Canton Coin wallet first, which happens when you open that wallet once.

1. On the seat screen, under "Have a HackCanton login?", click "Sign in with HackCanton" and sign in on the node's login page. Click "Join as an LP", then "Accept commitment". Your browser reads your notices from the ledger with your own login, and accepts with it.
2. Switch to the Fund manager seat, click "Create capital call", give HackCanton LP an amount, and issue it.
3. Back on the seat screen, click "Continue as HackCanton LP" and open the notice. Pay it from DRAW, which asks your own Canton wallet to lock the coin, or click "Approve it in your Canton wallet" and press Accept on the capital call under Allocations.
4. As Fund manager, settle it. Your notice then shows "Verified funded".

DRAW's server only learns your party id and never receives your token, which stays in that browser tab. In the newest runs the server's only ledger credential was the backend client, which has rights on the five demo parties and nothing else, so nothing the server held could act for the LP's party. Every run of this used the team's own login as the LP. The newest are `evidence/devnet/browser/web-hackcanton-20261006132613/result.json` (paid from DRAW, 7 of 7 steps) and `evidence/devnet/browser/web-hackcanton-wallet-20261006132730/result.json` (Accept in the Canton Coin wallet, 9 of 9). The earlier ones ran while the server also held the team's login.

## What the tour doesn't show, and where to see it

| Not in the tour | Where it's proven |
|---|---|
| Wrong amount, wrong payer, wrong reference and replay refused. The unpaid LP overdue only after the due time | DevNet run `evidence/devnet/runs/20261006T131900Z/result.json`, 82 of 82 checks on package 0.3.0 |
| Each LP's call also reaches it as a CIP-0056 AllocationRequest, the Token Standard interface an app uses to ask a user for an allocation. Other LPs and outsiders can't see it. LP A paid by creating the allocation from that request, and the request closed when the call settled | The `wallet` checks in the same DevNet run, where the run script did it through the backend client, and in the 79-check run before it (`evidence/devnet/runs/20261006T091531Z`), which used the shared login. The node's Canton Coin wallet listing a request and paying it with Accept is in `evidence/devnet/browser/web-hackcanton-wallet-20261006132730` |
| The read-back step on a client of its own, which the ledger refused when it tried to submit as the fund. That client can still act for the team's personal party, so it isn't read-only, and the live site doesn't use it | The `credential` and `settlement` checks in the same DevNet run, and probe `evidence/devnet/probes/20261006T133219Z/result.json` |
| A fund can name a verifier party that reads the fund, every call and every obligation, and is refused when it acts | Daml Script only, `test_verifier` in `evidence/local/daml_core/20261006T081605Z/result.json` |
| A separate login per party, and a read-only verifier login that can't submit | LocalNet runs under `evidence/local/runs/` |
| Each party signing with its own key | LocalNet. Each party signs with its own key. `evidence/local/runs/20261004T183146Z/result.json` (76 of 76) and `evidence/local/browser/web-browser-keys-20261005005304/result.json` |
| 100 generated calls, and the database comparison | LocalNet, `evidence/local/campaign/20261002T193724Z`, `evidence/local/ablation/20261002T193830Z` |

## How to check the evidence

1. Open the proof page. It renders the DevNet run and the LocalNet suites from the result files and links to each one, and shows the newest run of each live browser journey with its steps, its screenshots and how the site signed when it ran, including the two sign-in journeys.
2. Read the files. Every `result.json`, receipt and log under `evidence/` was written by a script, and failed runs are kept with a note. [`docs/PROOF.md`](../../PROOF.md) explains each check, and `evidence/manifest.json` lists every run with file hashes.
3. Run them again. The commands are in the README under "How to verify". The Daml tests and unit tests need no ledger. The scripted call runs on LocalNet, or on DevNet with a HackCanton login.

## Run it locally with LocalNet

LocalNet is where each party gets its own login, or its own key in the browser. It needs Docker with about 10 GB of RAM. The steps are in the README under "Run it locally". Start the API with `DRAW_PARTY_MODE=external` for browser keys: each person creates a key in the browser, backs it up, and approves every action in a Sign dialog.

## Known limits of the demo

- On DevNet one backend client acts for every demo seat, so LP-from-LP credential separation is shown on LocalNet only. On the live site the read-back step uses that same client. Every sign-in run used the team's own login as the LP, so a second person's login hasn't been shown on DevNet.
- All parties share one participant, so its operator can read them all.
- The demo server holds the backend client that acts for every demo seat. It never receives the token of an LP that signs in with HackCanton, and holds nothing that can act for that LP's party.
- The Canton Coin leg of each payment is visible in Scan, with a random reference. The notices themselves don't appear there.
- No MainNet, no real money, no USDCx. The full list is in [`docs/LIMITATIONS.md`](../../LIMITATIONS.md).
