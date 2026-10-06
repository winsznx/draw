# Demo script

About three and a half minutes on the live DevNet site, https://draw.timjosh507.workers.dev, then a short LocalNet segment. It opens on the fund's question and gets to Canton later. Click paths follow the web app at commit `de2c4b2` (2026-10-06), which gives each browser its own demo fund, has Sign in with HackCanton, and names who signs from the API's own settings. Check them against the site on the day you record, since the site is still changing.

Use these labels on screen and in the narration. The deck and the video use the same words, and `claims.yaml` is their ceiling.

- DevNet, the site's network note since about 13:25 UTC on 2026-10-06: "DevNet, HackCanton shared node. DRAW's backend login signs for every demo seat." With sign-in on, the site adds: "An LP that signs in with its own HackCanton login signs only for its own party." Footage from before 13:25 UTC shows the older note, "One hackathon login signs for every demo seat", so caption it as the earlier setup.
- LocalNet: "LocalNet. Each party signs with its own key."
- Asset: "Settles in Canton Coin from the DevNet faucet. Dollar figures are the scenario."
- Production asset: "Uses the Token Standard allocation interface, which the USDCx registry supports. Not run with USDCx."
- Sign-in segment, when you sign in with the team's own login: "The LP here is signed in with the team's own HackCanton login."

## Before recording

- Use a clean browser profile. Once the API runs with `DRAW_ACCESS_CODE_PUBLIC=true`, the site prints the access code and fills it in. Before that, have the code ready.
- Start from a fresh fund, so the first call comes prefilled. If the seat page offers "Create the demo fund", click it. Otherwise, as Fund manager, open Investors, then Start over, "Start a new demo fund", and back on the seat page click "Create the demo fund". It funds each LP with test Canton Coin and sends the invitations.
- Take each LP's seat once and click "Accept commitment", so all three LPs are in the first call.
- If you'll show the overdue step, plan for the call's due time to pass during the recording. The form defaults to 10 minutes ahead, and you can set 3.

## 0:00 The question the fund has

Screen: the landing page, "Capital calls only the right investor can read."

> A fund is calling a million dollars from three investors. Afterwards it needs one number: how much of that can it actually deploy, and what's still outstanding?

Click "Take a seat in the demo fund".

## 0:20 Take a seat

Screen: "Who are you in this fund?" Choose Fund manager. The next screen, "Your party on DevNet", shows the party id and a box called "How signing works here". Point at it.

> Each seat is its own Canton party, and every screen after this is read from the ledger as that party. On this shared DevNet node DRAW's backend login, a client the node operator issued for DRAW, signs for every demo seat. At the end, LocalNet gives each party its own key.

Click Continue, enter the access code, then "Open the app".

## 0:45 Issue the call

Screen: the fund's overview, with "Deployable now" at $0. Click "Create capital call". The first call is prefilled: LP A $400,000 paid as 40 CC, LP B $350,000 as 35 CC, LP C $250,000 as 25 CC. Click "Issue capital call".

> One action, three private notices. The dollar figures are the scenario. Each LP pays in Canton Coin from the DevNet faucet.

## 1:05 LP A pays its notice

Click "Switch seat" and choose LP A. Under "Your notices", open Call 1: $400,000, pay 40 CC. Click "Pay 40 CC". The notice now says the payment is locked for the fund. Copy the page address.

> This is LP A's own view, and it holds one notice. Paying locks 40 CC for the fund, with this notice's reference inside the payment. Nothing has moved yet, so it doesn't count.

## 1:35 LP B opens LP A's link

Switch seat to LP B and paste LP A's notice address. The page says "Not on your ledger".

> LP B opens LP A's exact link. Queried as LP B, the ledger returns nothing for it. On this shared node the same backend login could query as LP A, which is why we repeated this on LocalNet with a separate login per party, and the result was the same.

Optional: on the seat page, "Sit as an unrelated party". Its ledger returns nothing about the fund.

## 2:00 A payment that doesn't match (optional, about 30 seconds)

Still as LP B, open its own notice from "Your notices". Click "Pay a different amount", enter 30, then "Pay this amount". The notice says the payment doesn't match. As Fund manager, the Payments tab shows "Wrong amount" with no Settle button. Back as LP B, click Withdraw, then "Pay 35 CC".

> The ledger only settles the exact amount. Close enough doesn't count.

## 2:30 The fund settles, and the read-back confirms it

Switch seat to Fund manager and open Calls, then Call 1. Click "Settle 40 CC", and "Settle 35 CC" if LP B paid. The obligations show Funded and "Deployable now" goes up. Switch seat to LP A and open the notice: "Verified funded", with the receipt.

> Settling moves the coin and marks the notice funded in one transaction. A separate read-back step then reads that settlement and the fund's holdings from the ledger, here with the same backend login, before the dollars count as deployable. In our scripted DevNet run it used a login of its own, which the ledger refused when it tried to act as the fund.

## 3:00 The investor who didn't pay (optional)

Once the due time has passed, LP C shows under "Needs your attention" as Fund manager. Click "Mark overdue". "Unresolved" shows LP C's $250,000.

> Before the due time the ledger refuses this. After it, LP C is on the record as overdue.

## Optional: an LP that signs in as itself (about 60 seconds)

This needs a HackCanton login whose party is already onboarded in the node's Canton Coin wallet, with a few test CC in it. If you sign in with the team's own login, put the sign-in label on screen: it's the same person on both sides, even though the server now holds only the backend client, which can't act for that party. The evidence for this segment is `evidence/devnet/browser/web-hackcanton-20261006132613` (paid from DRAW) and `evidence/devnet/browser/web-hackcanton-wallet-20261006132730` (paid with Accept in the Canton Coin wallet), both on the live site's current setup.

On the seat screen, under "Have a HackCanton login?", click "Sign in with HackCanton" and sign in on the node's login page. Back on the seat screen, click "Join as an LP", then "Accept commitment". The line at the top of the app reads "Read from the ledger as ... by this browser, with your own HackCanton login".

> This LP signed in with its own HackCanton login. Its browser reads its notices from the ledger with its own token, and it accepts with that login. DRAW's server only learned its party id, and nothing the server holds can act for that party.

Switch seat to Fund manager, click "Create capital call", fill in an amount for HackCanton LP and its Canton Coin, and issue it. Go back to the seat screen, click "Continue as HackCanton LP" and open the notice. Either click "Pay ... from your wallet", or click "Approve it in your Canton wallet", which opens the wallet's Allocations page, and press Accept on the capital call there.

> The call reaches the LP's own Canton Coin wallet as an allocation request. Accept locks the coin for the fund, and nothing moves until the fund settles.

Switch seat to Fund manager, open the call and click Settle. Back as the HackCanton LP, the notice shows "Verified funded".

## 3:15 LocalNet: each person holds a key

Label on screen: "LocalNet. Each party signs with its own key." This part isn't on the live site. Record it against LocalNet with browser keys:

```sh
DRAW_ENV_FILE=none DRAW_PARTY_MODE=external node app/server.mjs
(cd web && DRAW_API_URL=http://localhost:4173 npm run dev)    # http://localhost:3100
```

The browser-key flow passed on LocalNet only on the web app before the 2026-10-05 redesign. Before recording this segment on a later build, run `(cd web && DRAW_PARTY_MODE=external npm run e2e)` against LocalNet on that same build, and record only if it passes. Its evidence folder is then the one to cite.

Show a seat being created: "Create key and party", then "Back up your key", "Download key backup", tick the box, Continue. Then one action, for example LP A's payment, and the "Sign with your key" dialog, then Sign.

> On LocalNet each person creates a key in their own browser, and every action needs that key's signature. The node can't act for the party without it. In the scripted run another party's key was refused too, 76 checks out of 76.

If LocalNet can't run (it needs about 10 GB of RAM), use the screenshots in `evidence/local/browser/web-browser-keys-20261005005304/` and say on screen that they show the earlier UI, before the 2026-10-05 redesign. That run saved no screenshot of the Sign dialog. The only ones are `evidence/local/browser/20261004T183631Z/screens/01-keys-admin-sign-fund.png` and `03-keys-lp-c-sign-dialog.png`, from the Vite UI that came before it, so label them as an earlier UI too.

## 3:40 Why Canton, and the close

> On LocalNet we ran the same call on a normal database with a paid flag. Four of five attacks got through there and none got through DRAW. One honest line: going by the Scan docs, the Canton Coin leg of each payment shows up in Scan, the network's explorer, and the obligations don't. In production the asset would be USDCx, whose registry supports the same allocation interface. We haven't run with USDCx yet.

> A fund called capital from three investors. Each saw and paid only its own notice, and the fund knows exactly what it can deploy.

End on the proof page, https://draw.timjosh507.workers.dev/proof, as where to check every number.

## Recording notes

- "Switch seat" signs out. The next seat reads the ledger as a different party, so say which seat you're in each time.
- Don't open the proof page in the first 30 seconds.
- Dollar amounts are the scenario. Canton Coin is what moves, and the UI labels both.
- Never say two different people's logins were used on DevNet, never say LPs hold their own keys on DevNet, never call the read-back login read-only on DevNet, never say USDCx settled, and never say MainNet. The sign-in segment shows an LP with its own login, and on our recordings that login is the team's own.
- If an LP's balance is short, "Add test CC" on its seat card taps the faucet.
