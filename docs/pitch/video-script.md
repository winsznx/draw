# Demo video script

Target length 3:50, inside the 3:30 to 4:00 window. The platform cap is 5:00. The owner reads the voiceover. About 475 words of voiceover leaves room for the clicks.

## Labels, word for word

Use these exactly. They stay inside [`claims.yaml`](../../claims.yaml), and the deck uses the same wording.

| Label | Text | When it's on screen |
|---|---|---|
| DevNet | DevNet, HackCanton shared node. DRAW's backend login signs for every demo seat. | 0:00 to 2:40, top bar or lower third. It's the site's own network note since about 13:25 UTC on 2026-10-06. Footage from before that shows "One hackathon login signs for every demo seat", so caption it as the earlier setup |
| Asset | Settles in Canton Coin from the DevNet faucet. Dollar figures are the scenario. | 0:00 to 0:20 and 0:42 to 1:52 |
| LocalNet | LocalNet. Each party signs with its own key. | 2:40 to 3:10 |
| Production asset | Uses the Token Standard allocation interface, which the USDCx registry supports. Not run with USDCx. | 3:22 to 3:34 |
| Sign-in | The LP here is signed in with the team's own HackCanton login. | the optional sign-in scene, whenever you film it with the team's login |

## Before recording

- Record the live site, https://draw.timjosh507.workers.dev, in a clean browser profile at 1920x1080.
- Check the read-back wording on the live site first. LP A's steps bar should end in "Verified by read-back", the receipt should start "A separate read-back step", and the settle toast should say "Settled and verified by a separate read-back". If the site still says "Independently verified", don't film the DevNet scenes until the new copy is deployed.
- In that browser, click "Create the demo fund" and wait about a minute. Then take each LP seat in turn and click "Accept commitment", so all three LPs have accepted. Cut these steps from the video.
- Check each LP's balance. "Add test CC" on the seat card taps the faucet. Cut this too.
- With all three accepted, the first call comes prefilled with the standard amounts: LP A $400,000 (40 CC), LP B $350,000 (35 CC), LP C $250,000 (25 CC), $1,000,000 in all. The form lists only LPs that have accepted. If it shows other amounts, use what's there and change "forty" and "a million dollars" in the voiceover to match.
- Set the call's due time about four minutes ahead, so the overdue beat in scene 5 can be filmed once it passes. Cut the wait.
- Enter the access code off camera, unless it's public by then.
- Keep the seat card in the bottom left in frame. It shows which party every screen is read as.
- Film each scene as its own take. If a step fails on camera, don't stage it. Use the evidence file named in that scene instead and say what it shows.
- For DevNet backups, use the screenshots in `evidence/devnet/browser/web-journey-20261006132858` first. That run is on the current setup, with the demo seats on the backend client, as its `siteSetup` records, and shows the current wording: the settle toast says "Settled and verified by a separate read-back", and LP A's steps bar ends in "Verified by read-back". Its call is $100,000 to LP A alone, paid as 10 CC, so match the voiceover to it if you use them. The screenshots in `web-journey-20261006091011` have the same wording on the earlier setup, with the network note naming one hackathon login.
- The older backup screenshots from 2026-10-05, in `evidence/devnet/browser/web-journey-20261005214111` and `evidence/local/browser/web-browser-keys-20261005005304`, show the old wording "Independently verified" and "An independent read-only verifier". If you use one, crop that text out, or caption it "Screens from the 2026-10-05 UI." followed by "On DevNet the read-back then ran with the same shared login." or "On LocalNet the read-back runs as a separate read-only login."

## Scenes

### 0:00 to 0:20 Hook

On screen: the fund manager's overview on the live site. Hold on "Deployable now", "Unresolved" and "Called", then click "Create capital call".

Captions: DevNet label. Asset label.

Voiceover:

> This is a fund manager's screen in DRAW, on the Canton DevNet. The fund is about to call a million dollars from three investors. Afterwards only one question matters: how much of that money can we actually deploy, and how much is still unresolved?

### 0:20 to 0:42 The problem

On screen: slide 2 of the deck, or a title card that reads "Today: a notice, a wire, a spreadsheet." Then the regulator's quote with its source.

Captions: "Luxembourg Financial Intelligence Unit, Trend alert #2, November 2025". If an interview line exists and the person agreed to be quoted, show it here by role, with the date. Never a name, never a paraphrase dressed up as a quote.

Voiceover:

> Today each investor gets a notice and pays by wire. Then someone matches wires to investors from a bank export, works the partial and wrong-name payments by hand, and watches for fake notices with swapped bank details. Luxembourg's financial intelligence unit has flagged scams using fake capital call notices.

### 0:42 to 1:52 Live on DevNet: issue, pay, settle, verify

#### 0:42 Issue

On screen: as Fund manager, review the amounts and the due time, click "Issue capital call". The toast says each investor now sees only its own notice.

Voiceover:

> One action issues the call. DRAW creates a separate notice for each investor, a contract between that investor and the fund that no other investor can read.

#### 1:00 Pay

On screen: "Switch seat", choose LP A. One notice. Open it and click "Pay 40 CC". The steps bar shows "Payment locked".

Caption: "Locked for the fund. Nothing has moved yet."

Voiceover:

> Now I'm LP A. I see one notice, my own. Paying locks forty Canton Coin for the fund, tagged with this notice's reference. Nothing has moved yet, so it doesn't count as funded.

#### 1:20 Settle and read back

On screen: switch seat to Fund manager, open the call, click "Settle 40 CC". LP A turns Funded. Go to the overview: "Deployable now" goes up.

Captions: "One transaction: the coin moves and the notice turns funded." Then: "Read-back step: 14 checks. On the live site it reads with the same backend login."

Voiceover:

> Back as the fund. Settling checks the reference, the payer, the amount and the asset, then moves the coin and marks the notice funded, all in one transaction. A separate read-back step then fetches the settlement and runs fourteen checks. Only now does the deployable figure go up.

#### 1:42 Verified

On screen: switch seat to LP A. The notice shows "Verified funded" and "14 of 14 checks".

Voiceover:

> LP A sees the same result: verified funded, fourteen of fourteen checks.

Backup if a step fails: `evidence/devnet/browser/web-journey-20261006132858` (the same journey, 10 of 10 steps, 2026-10-06, on the backend client, with screenshots in the current wording), or `evidence/devnet/browser/web-journey-20261005214111` (8 of 8 steps, 2026-10-05, older wording and the shared login).

### 1:52 to 2:15 Privacy

On screen: as LP A, copy the notice address. Switch seat to LP B and open that address: "Not on your ledger". Then sit as an unrelated party: nothing.

Captions: "Queried as LP B". Then "Queried as an unrelated party".

Voiceover:

> Here's LP A's notice link, opened as LP B. LP B's own ledger query comes back empty, so the page has nothing to show. An unrelated party gets nothing at all. On this shared DevNet node, one backend login signs for every demo seat. Separate logins per party run on LocalNet.

Backup: `evidence/devnet/runs/20261006T131900Z/streams.json`, where each party's own transaction stream holds no event about another party's records.

### 2:15 to 2:40 A wrong amount, and an LP that doesn't pay

On screen: as LP B, open its notice, click "Pay a different amount", pay 30. The notice says the payment doesn't match the amount due. As Fund manager, the payment shows as a mismatch, and the app offers no Settle button for it. After the due time, "Mark overdue" on LP C. LP C shows Overdue and stays in the unresolved total.

The app hides both buttons, so the camera never shows the ledger refusing. While the voiceover names each refusal, overlay the ledger's own words from the DevNet run, `evidence/devnet/runs/20261006T131900Z/result.json`, in the mono font:

- Check `negative: wrong amount does not fund`. DAML_FAILURE in `Obligation_Settle`: "allocation amount does not equal amount due".
- Check `deadline: overdue refused before due time`. DAML_FAILURE in `Obligation_MarkOverdue`: "obligation is not yet due".

Captions: "Wrong amount: no Settle button, and the ledger refuses it too." Then: "Overdue only after the due time."

Voiceover:

> If LP B pays the wrong amount, the app gives the fund nothing to settle. Our DevNet run tried anyway, and the ledger refused it. LP C hasn't paid at all. The ledger won't mark it overdue before the due time. After that the fund can, and LP C stays on the unresolved list instead of quietly going missing.

Backup: the `negative`, `deadline` and `unpaid` checks in `evidence/devnet/runs/20261006T131900Z/result.json`.

### 2:40 to 3:10 LocalNet: each party holds its own key

On screen: the LocalNet app with its "LocalNet" chip. Onboarding: "Create your key", "Back up your key". LP A pays and approves the Sign dialog. The fund manager settles with its own key. LP A sees "Verified funded".

This needs LocalNet running (about 10 GB of RAM). If it isn't, use the four screenshots in `evidence/local/browser/web-browser-keys-20261005005304` with a slow pan, and keep the label on.

Captions: LocalNet label, for the whole scene. "The node can't act for a party without that party's signature."

Voiceover:

> This part runs on LocalNet. Each person creates a key in the browser and signs every action. The node prepares each transaction, but it can't act for a party without that party's signature, and another party's key is refused. On the shared DevNet node, teams can't create parties like this yet.

Evidence: `evidence/local/runs/20261004T183146Z/result.json` (76 of 76 checks) and `evidence/local/browser/web-browser-keys-20261005005304/result.json`.

### Optional, about 20 seconds: an LP signs in as itself

Use this if there's room, or in place of part of the LocalNet scene. It adds about 20 seconds, so trim elsewhere to stay inside 4:00.

On screen: the seat screen's "Have a HackCanton login?" card, "Sign in with HackCanton", the node's login page, then "Join as an LP". Then the node's Canton Coin wallet under Allocations, the capital call listed as an allocation request, and Accept. Back in DRAW, the notice shows the payment locked for the fund.

Captions: the sign-in label, if you signed in with the team's own login. "The LP's browser reads with its own token. DRAW only learns its party id."

Voiceover:

> An LP with its own HackCanton login can join as itself. Its browser reads its notice from the ledger with its own login. The call also shows up in its Canton Coin wallet as an allocation request, and Accept there locks the coin for the fund. DRAW's server only learns its party id.

Backup: the screenshots in `evidence/devnet/browser/web-hackcanton-wallet-20261006132730`, among them `04-wallet-request.png` and `05-wallet-accepted.png`, from a run on the current setup. That run used the team's own login as the LP, so keep the sign-in label on.

### 3:10 to 3:34 Why Canton, and the honest line

On screen: slide 7 of the deck, the five attacks with "4 of 5" and "0 of 5". Then the production asset label.

Captions: "LocalNet ablation run, evidence/local/ablation/20261002T193830Z". Production asset label from 3:22.

Voiceover:

> Why Canton? On the same call, a database with a paid flag let four of five attacks through. DRAW let none through. One honest note: the notice is private, but the Canton Coin payment shows up in Scan. Production would settle in USDCx, whose registry supports the same allocation interface. We haven't run it with USDCx yet.

### 3:34 to 3:50 Who it's for, and the ask

On screen: slide 3, then slide 11 with the live link.

Caption: draw.timjosh507.workers.dev

Voiceover, if no conversation has happened yet:

> DRAW is for the COO or ops lead at an emerging fund manager, or the administrator who runs their calls. Our next step is to shadow one real call with no money moving. If you run capital calls, we'd like twenty minutes of your time.

Voiceover, once conversations have happened. Fill the brackets from the notes only:

> DRAW is for the COO or ops lead at an emerging fund manager, or the administrator who runs their calls. We've spoken with [N] people who run capital calls or pay into them, and [one finding from the notes]. Our next step is to shadow one real call with no money moving. If you run capital calls, we'd like twenty minutes of your time.

The second version adds about 8 seconds and ends near 3:58.

## Never say

- MainNet, real money, or settlement in USDCx.
- Customers, pilots, partners or letters of intent.
- A second person's login on DevNet. Every sign-in run used the team's own login as the LP.
- LP-held keys on DevNet.
- That payments are hidden from the network. Canton Coin transfers appear in Scan.
- That the server holds no credentials. The demo server holds the backend client for every demo seat.
- A scheduler, partial payments, notifications or KYC.
- That viewers can hold their own key on DevNet.
- That any Canton wallet can pay a DRAW request. The node's own Canton Coin wallet did, for a party on the fund's node.
- "Independent" or "read-only" for the DevNet read-back. On the live site it's a separate step run with the same backend login. In the scripted run it used a client of its own, which can still act for the team's personal party.
- That only the LP and the fund can read a notice. The node operator can read every party it hosts.

## After the edit

- Final cut under 5:00, aiming for 3:50.
- Every DevNet frame carries the DevNet label, and every LocalNet frame carries the LocalNet label.
- Publish on YouTube as public or unlisted, check it plays in a private window, and add the link to the README, `docs/pitch/materials/demo.md`, `docs/pitch/materials/pitch.md` and slide 11.
