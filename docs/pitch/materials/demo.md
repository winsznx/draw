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

- DevNet, HackCanton shared node. One hackathon login signs for every seat.
- Settles in Canton Coin from the DevNet faucet. Dollar figures are the scenario.

The live site runs on the HackCanton DevNet node. Every screen reads the ledger as the seat you chose, and the seat card in the bottom left shows that party. A separate login per party, and a key held by each party, are shown on LocalNet (see the last section).

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
| LP B opens LP A's link | LP B's ledger query returns nothing for LP A's notice | DevNet run: party-scoped reads and transaction streams, `evidence/devnet/runs/20261006T091531Z/streams.json` |
| Settle | The coin moves and the notice turns funded in one transaction | `evidence/devnet/runs/20261006T091531Z/receipt-lpA.json` |
| Verified funded | A separate read-back step checked the settlement (14 checks) before it counted. On DevNet it runs with the same shared login | same receipt |

The same journey passed in a scripted browser against the live site on 2026-10-06, 10 of 10 steps, including a second browser that gets its own demo fund: `evidence/devnet/browser/web-journey-20261006091011/result.json`. It passed 8 of 8 steps on 2026-10-05, before each browser had its own fund.

## What the tour doesn't show, and where to see it

| Not in the tour | Where it's proven |
|---|---|
| Wrong amount, wrong payer, wrong reference and replay refused. The unpaid LP overdue only after the due time | DevNet run `evidence/devnet/runs/20261006T091531Z/result.json`, 79 of 79 checks on package 0.3.0 |
| Each LP's call also reaches it as a CIP-0056 AllocationRequest, the Token Standard interface an app uses to ask a user for an allocation. Other LPs and outsiders can't see it. LP A paid by creating the allocation from that request, and the request closed when the call settled | The `wallet` checks in the same DevNet run. The run script did it with the shared login, and no wallet app has been shown listing or approving a DRAW request yet |
| A fund can name a verifier party that reads the fund, every call and every obligation, and is refused when it acts | Daml Script only, `test_verifier` in `evidence/local/daml_core/20261006T081605Z/result.json` |
| A separate login per party, and a read-only verifier login that can't submit | LocalNet runs under `evidence/local/runs/` |
| Each party signing with its own key | LocalNet. Each party signs with its own key. `evidence/local/runs/20261004T183146Z/result.json` (76 of 76) and `evidence/local/browser/web-browser-keys-20261005005304/result.json` |
| 100 generated calls, and the database comparison | LocalNet, `evidence/local/campaign/20261002T193724Z`, `evidence/local/ablation/20261002T193830Z` |

## How to check the evidence

1. Open the proof page. It renders the DevNet run and the LocalNet suites from the result files and links to each one.
2. Read the files. Every `result.json`, receipt and log under `evidence/` was written by a script, and failed runs are kept with a note. [`docs/PROOF.md`](../../PROOF.md) explains each check, and `evidence/manifest.json` lists every run with file hashes.
3. Run them again. The commands are in the README under "How to verify". The Daml tests and unit tests need no ledger. The scripted call runs on LocalNet, or on DevNet with a HackCanton login.

## Run it locally with LocalNet

LocalNet is where each party gets its own login, or its own key in the browser. It needs Docker with about 10 GB of RAM. The steps are in the README under "Run it locally". Start the API with `DRAW_PARTY_MODE=external` for browser keys: each person creates a key in the browser, backs it up, and approves every action in a Sign dialog.

## Known limits of the demo

- On DevNet one hackathon login acts for every seat, including the read-back step.
- All parties share one participant, so its operator can read them all.
- The demo server holds every role's credential.
- The Canton Coin leg of each payment is visible in Scan, with a random reference. The notices themselves don't appear there.
- No wallet app has been shown listing or approving a DRAW payment request.
- No MainNet, no real money, no USDCx. The full list is in [`docs/LIMITATIONS.md`](../../LIMITATIONS.md).
