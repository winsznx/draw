# Demo

The Demo material, for the MVP criterion. It's for judges who want to use DRAW on the live site and then check what they saw against the evidence. DRAW is private capital calls on Canton. Each LP reads and pays only its own notice, and the fund counts the money as deployable only after a read-back step confirms the settlement on the ledger.

## Links

| | |
|---|---|
| Live demo | https://draw.timjosh507.workers.dev |
| Proof page | https://draw.timjosh507.workers.dev/proof |
| The product, step by step | [PRODUCT.md](../../PRODUCT.md) |
| How to check each claim | [PROOF.md](../../PROOF.md) |
| Every claim, with its network and limits | [claims.yaml](../../../claims.yaml) |
| Pitch and deck | [pitch.md](pitch.md) |

The video and the public repository link are added at submission, and [SUBMISSION.md](../../SUBMISSION.md) tracks both.

## What you're looking at

- DevNet, HackCanton shared node. DRAW's backend login signs for every demo seat, and a different login reads each settlement back.
- Settles in Canton Coin from the DevNet faucet. Dollar figures are the scenario.

The live site runs on the HackCanton DevNet node. You take a seat as the fund manager or as one of three LPs, and every screen reads the ledger as that seat's party. The seat card in the bottom left shows which party it is. A backend client that NODERS issued for DRAW signs for every demo seat, and since about 13:00 UTC on 2026-10-07 another client NODERS issued, which can only read as the fund, reads each settlement back. If you have a HackCanton login, you can also join as an LP yourself, as the section on sign-in below describes. A separate login per party is shown on LocalNet. A key held by each party is shown on LocalNet and in one scripted DevNet run, with all five keys on the machine that ran it.

Each browser gets its own demo fund. The demo funds share the same five parties, the fund, three LPs and an unrelated party, so keeping one browser out of another's fund is the app's doing, and keeping each LP out of the others' records is the ledger's.

Every action, starting with "Create the demo fund", needs the demo access code, which the site asks for once. The site doesn't print the code yet, and it goes public on submission day, 2026-10-09. Without it a new browser can't start a demo fund and its seats stay empty. Reading needs no code: the proof page, which shows the newest run of the core of this tour step by step with screenshots, and every seat of a demo fund the browser has already started.

## The tour

1. Open https://draw.timjosh507.workers.dev and click "Take a seat in the demo fund". If this browser has no demo fund yet, click "Create the demo fund", enter the access code when asked, and wait about a minute while it funds each LP with test Canton Coin and sends the invitations.
2. Choose LP A, click Continue, enter the access code if the site asks for it, click "Open the app", then "Accept commitment". Click "Switch seat" and do the same as LP B and as LP C. The call form lists only LPs that have accepted.
3. Switch seat to Fund manager and click "Create capital call". A new fund's first call comes prefilled: LP A $400,000 as 40 CC, LP B $350,000 as 35 CC, LP C $250,000 as 25 CC. The due time defaults to 10 minutes ahead. Click "Issue capital call".
4. Switch seat to LP A, open the notice under "Your notices" and click "Pay 40 CC". The notice says the payment is locked for the fund. Copy the page address.
5. Switch seat to LP B and open LP A's address. The ledger query made as LP B returns nothing, so the page says "Not on your ledger". Then open LP B's own notice and pay it. Optional: first click "Pay a different amount" and pay 30. The notice says it doesn't match, and the fund gets no Settle button for it. Click Withdraw, then "Pay 35 CC".
6. Switch seat to Fund manager, open Calls, then the call, and click "Settle 40 CC" and "Settle 35 CC". Once the read-back step agrees, the notices show Funded, LP A's notice says "Verified funded" with 14 of 14 checks, Deployable now counts both payments, and LP C's $250,000 stays unresolved.
7. Optional: once the due time has passed, LP C shows under "Needs your attention". Click "Mark overdue".
8. Optional, with a HackCanton login whose party is onboarded in the node's Canton Coin wallet (open that wallet once): on the seat screen, click "Sign in with HackCanton", then "Join as an LP", or "Start a demo fund and join as an LP" if this browser has no demo fund yet, then "Accept commitment". As Fund manager, issue the HackCanton LP a call. Back as that LP, pay from DRAW, or press Accept on the request under Allocations in the node's Canton Coin wallet. As Fund manager, settle. The notice shows "Verified funded". Every run of this used the team's own login as the LP. The sign-in section below has the exact buttons and what the server can and can't see.

"Add test CC" on a seat card taps the DevNet faucet when a balance is short. By default the site starts at most 3 new demo funds per visitor per hour and 20 overall. If it can't start one, the proof page shows the newest run of this journey, step by step with screenshots, and needs no code.

## What each step shows

| Step | What it shows | Evidence |
|---|---|---|
| Issue | One action creates a separate notice per LP, a contract between the fund and that LP that no other LP or unrelated party can read | `web-journey-devnet` in [claims.yaml](../../../claims.yaml), [screenshot](../../../evidence/devnet/browser/web-journey-20261007130359/03-call-issued.png) |
| Pay | The LP locks the exact amount in a Token Standard allocation carrying the notice's reference. Nothing has moved yet, and it doesn't count | [screenshot](../../../evidence/devnet/browser/web-journey-20261007130359/04-lp-paid.png) |
| LP B opens LP A's link | The ledger query made as LP B returns nothing for LP A's notice. The demo seats share one backend client, so the app picks which party to read as, and the ledger answers only for that party. A separate login per party was tested on LocalNet | [screenshot](../../../evidence/devnet/browser/web-journey-20261007130359/05-lpb-cannot-read.png), and the party-scoped reads and transaction streams in [the scripted DevNet run on the demo seats](../../../evidence/devnet/runs/20261007T125638Z/streams.json) |
| A wrong amount, optional | Only the exact amount settles. The app gives the fund no Settle button, and when the scripted DevNet run tried anyway the ledger refused with "allocation amount does not equal amount due" | the `negative` checks in [the scripted DevNet run on the demo seats](../../../evidence/devnet/runs/20261007T125638Z/result.json) |
| Settle | In one transaction the ledger checks the reference, leg id, executor, payer, receiver, instrument and exact amount, moves the coin to the fund, and marks the notice funded | [screenshot](../../../evidence/devnet/browser/web-journey-20261007130359/06-settled.png), [LP A's receipt from the scripted DevNet run on the demo seats](../../../evidence/devnet/runs/20261007T125638Z/receipt-lpA.json) |
| Verified funded | A read-back step read the settlement and the fund's holdings and ran 14 checks before the money counted. On the live site it reads with a client of its own, which the node reports can only read as the fund. In the scripted DevNet run on the demo seats the ledger refused that client when it tried to act as the fund | [screenshot](../../../evidence/devnet/browser/web-journey-20261007130359/07-lp-verified.png), the same receipt |
| Mark overdue, optional | Before the due time the ledger refuses with "obligation is not yet due". After it the fund marks LP C overdue, and LP C stays unresolved | the `deadline` and `unpaid` checks in [the scripted DevNet run on the demo seats](../../../evidence/devnet/runs/20261007T125638Z/result.json) |

The screenshots are from the live-site browser run at 13:03 UTC on 2026-10-07, a $100,000 call to LP A paid as 10 CC, with DRAW's backend login signing for every demo seat and a login of its own reading each settlement back. The network note shows in each screen.

A script has run the core of this journey (issue, LP A pays, LP B gets nothing from LP A's link, settle, verified funded) in a real browser against the live site eleven times. Seven passed, and four failed on test bugs, each kept with a note and listed in [GATES.md](../../GATES.md#failed-and-aborted-runs). The optional wrong-amount and overdue steps haven't run in a browser on DevNet. The newest pass, [10 of 10 steps with the demo seats on the backend client and the read-back on a login of its own](../../../evidence/devnet/browser/web-journey-20261007130359/result.json), includes a second browser that starts without a demo fund. Before it, with the read-back on the backend client, [10 of 10 on 2026-10-07](../../../evidence/devnet/browser/web-journey-20261007015754/result.json) and [10 of 10 on 2026-10-06](../../../evidence/devnet/browser/web-journey-20261006132858/result.json), and on the shared hackathon login: [10 of 10 with a demo fund per browser](../../../evidence/devnet/browser/web-journey-20261006091011/result.json) and [10 of 10 on the release with sign-in](../../../evidence/devnet/browser/web-journey-20261006101224/result.json) on 2026-10-06, [8 of 8 on the redesigned app](../../../evidence/devnet/browser/web-journey-20261005214111/result.json) and [the first run](../../../evidence/devnet/browser/web-20261005003221/result.json) on 2026-10-05.

## Have a HackCanton login? Join as an LP yourself

Your login's party has to be onboarded in the node's Canton Coin wallet first, which happens when you open that wallet once.

1. On the seat screen, under "Have a HackCanton login?", click "Sign in with HackCanton" and sign in on the node's login page. Click "Join as an LP", then "Accept commitment". Your browser reads your notices from the ledger with your own login, and accepts with it.
2. Switch to the Fund manager seat, click "Create capital call", give HackCanton LP an amount, and issue it.
3. Back on the seat screen, click "Continue as HackCanton LP" and open the notice. Pay it from DRAW, which asks your own Canton wallet to lock the coin, or click "Approve it in your Canton wallet" and press Accept on the capital call under Allocations.
4. As Fund manager, settle it. Your notice then shows "Verified funded".

DRAW's server only learns your party id and never receives your token, which stays in that browser tab's session storage. The site loads no third-party scripts. In the newest runs the server held the backend client, which has rights on the five demo parties and nothing else, and a read-back client that can only read as the fund, so nothing the server held could act for the LP's party. Every run of this used the team's own login as the LP. The newest are [paid from DRAW, 7 of 7 steps](../../../evidence/devnet/browser/web-hackcanton-20261007130106/result.json) and [paid with Accept in the Canton Coin wallet, 9 of 9 steps](../../../evidence/devnet/browser/web-hackcanton-wallet-20261007130229/result.json). The [wallet listing the capital call](../../../evidence/devnet/browser/web-hackcanton-wallet-20261007130229/04-wallet-request.png) is a screenshot from that run. In the runs before about 13:25 UTC on 2026-10-06 the server also held the team's login.

The LP's party has to sit on the same NODERS participant as the fund, which has DRAW's package vetted. The node's own Canton Coin wallet is the only wallet shown listing and approving a DRAW request.

## What the tour doesn't show, and where to see it

| Not in the tour | Where it's shown |
|---|---|
| Wrong payer, wrong reference and a replayed payment refused, and the unpaid LP overdue only after the due time | DevNet, [the scripted DevNet run on the demo seats](../../../evidence/devnet/runs/20261007T125638Z/result.json), 82 of 82 checks on package 0.3.0, and [the run in which each party signs with its own key](../../../evidence/devnet/runs/20261007T130259Z/result.json), 83 of 83. Wrong executor, wrong call and wrong instrument are refused in Daml Script only |
| Each LP's call also reaches it as a CIP-0056 AllocationRequest, the Token Standard interface an app uses to ask a user for an allocation. Other LPs and unrelated parties can't see it. LP A paid by creating the allocation from that request, and the request closed when the call settled | The `wallet` checks in both DevNet runs. The run script created LP A's allocation through the backend client in the run on the demo seats, and signed it with LP A's own key in the other. The node's Canton Coin wallet listing a request and paying it with Accept is in [the wallet run](../../../evidence/devnet/browser/web-hackcanton-wallet-20261007130229/result.json) |
| The ledger refusing the read-back client when it tried to submit as the fund. The node reports that client can only read as the fund | The `credential` and `settlement` checks in the scripted DevNet run on the demo seats, and [the probe of the NODERS clients](../../../evidence/devnet/probes/20261007T125624Z/result.json) |
| Review, reopen and waive, each with a note. A waived notice leaves the unresolved total | How the Daml model works, tested in `test_review_paths` in [the Daml tests](../../../evidence/local/daml_core/20261006T081605Z/result.json). No claims.yaml entry |
| A fund can name a verifier party that reads the fund, every call and every obligation, and is refused when it acts | Daml Script only, `test_verifier` in [the same Daml tests](../../../evidence/local/daml_core/20261006T081605Z/result.json) |
| A separate login per party, and a read-only read-back login that can't submit | LocalNet, a separate ledger login per party. [The LocalNet canonical run](../../../evidence/local/runs/20261001T162427Z/result.json) and its [receipt](../../../evidence/local/runs/20261001T162427Z/receipt-lpA.json) |
| Each party signing with its own key | LocalNet. Each party signs with its own key. [The custody run](../../../evidence/local/runs/20261004T183146Z/result.json), 76 of 76, and [the browser-key journey](../../../evidence/local/browser/web-browser-keys-20261005005304/result.json). On DevNet, [the run in which each party signs with its own key](../../../evidence/devnet/runs/20261007T130259Z/result.json), 83 of 83, where the run's login was refused acting for LP A without LP A's key. All five keys sat on the machine that ran the script, one login submitted for every party and read each settlement back, and the live site doesn't use these parties |
| 100 generated calls, and the database comparison | LocalNet, [the campaign](../../../evidence/local/campaign/20261002T193724Z/result.json) and [the ablation](../../../evidence/local/ablation/20261002T193830Z/result.json) |

Package 0.3.0 has run only in Daml Script and on DevNet. Every LocalNet run used package 0.2.0 or earlier.

## How to check the evidence

1. Open the proof page. It renders the newest DevNet run, the one in which each party signs with its own key, and the LocalNet suites from the result files, with a link to each. It also shows the newest run of each live browser journey with its steps, its screenshots and how the site signed when it ran, including the two sign-in journeys.
2. Read the files. Every result file, receipt and log in the evidence folder was written by a script, and failed runs are kept with a note. [PROOF.md](../../PROOF.md) explains each check, and [evidence/manifest.json](../../../evidence/manifest.json) lists every run with file hashes.
3. Run them again. The commands are in the README under [How to verify](../../../README.md#how-to-verify). The Daml tests and unit tests need no ledger. The scripted call runs on LocalNet, or on DevNet with credentials for the HackCanton node.

## Run it locally with LocalNet

LocalNet is where each party gets its own login, or its own key in the browser. It needs Docker with about 10 GB of RAM. The steps are in the README under [Run it locally](../../../README.md#run-it-locally). Start the API with `DRAW_PARTY_MODE=external` for browser keys: each person creates a key in the browser, backs it up, and approves every action in a Sign dialog. That flow has passed on LocalNet on the web app before the 2026-10-05 redesign. The redesigned flow hasn't run on LocalNet yet.

## Known limits of the demo

- On DevNet one backend client acts for every demo seat, and one login submitted for every party in the run in which each party signs with its own key, so LP-from-LP credential separation is shown on LocalNet only, and both DevNet runs skipped that check with its reason recorded. Since about 13:00 UTC on 2026-10-07 the live site's read-back step uses a client of its own that can only read as the fund. Every sign-in run used the team's own login as the LP, so a second person's login hasn't been shown on DevNet.
- In the DevNet run in which each party signs with its own key, all five keys sat on the machine that ran the script, so it shows the ledger needs each party's signature. It doesn't show that separate people held the keys. The live site's demo seats still sign through the backend client.
- On DevNet every party sits on one participant, and on LocalNet every LP does, so that operator can read every party it hosts.
- The demo server holds the backend client that acts for every demo seat. It never receives the token of an LP that signs in with HackCanton, and holds nothing that can act for that LP's party.
- The read-back step runs in the same process as the submitter, in the scripts and in the app.
- Per the Splice Scan API docs, the Canton Coin leg of each payment appears in Scan with its random reference and the party ids, whose hints such as `draw-lpa` are readable, and the notices don't. We inferred this from the docs and haven't checked it against Scan.
- No partial payments, notifications, onboarding or KYC, and no scheduler for overdue. DevNet resets about every three months, which would delete every party and contract on the node.
- No MainNet, no real money, no USDCx. The full list is in [LIMITATIONS.md](../../LIMITATIONS.md).
