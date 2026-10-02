# Demo script

About three minutes. It opens on the fund, not on Canton. Click paths match the app as built (`node app/server.mjs`, http://localhost:4173). Prepare by creating the demo fund and having all three LPs accept, so the recording starts at the call.

## 0:00 The job

Screen: fund admin dashboard, no call yet.

> A fund is about to call a million dollars from three investors. The question the fund cares about afterwards is simple: how much of it can we actually deploy, and what's still outstanding?

Click **Create capital call**. Amounts are prefilled: LP A $400,000, LP B $350,000, LP C $250,000, settled as 40, 35 and 25 Amulet. Due in 3 minutes. Click **Issue capital call**.

> One action, three private notices.

## 0:25 One investor, one notice

Switch **Viewing as** to **LP A** and open **My notices**. One notice, $400,000.

> This is LP A's own ledger login. It sees its notice. It can't see that LP B or LP C exist.

Open the notice. Point at the three steps: payment locked, settled by the fund, independently verified. Click **Pay 40 Amulet**.

> The payment locks 40 Amulet for the fund, carrying this notice's reference. Nothing has moved yet, so it isn't funded.

## 0:55 The fund settles

Switch to **Fund admin** and open **Calls**. Under Needs attention: "LP A paid 40 Amulet for Call 1". Click **Settle**.

> Settling moves the money and flips the obligation in the same transaction. A separate read-only check then confirms it. Only now does it count.

Deployable now shows $400,000.

## 1:20 A payment that doesn't match

Switch to **LP B**, **My notices**, open the notice, **Pay a different amount**, 30, **Pay this amount**. The notice says the payment doesn't match.

Switch to **Fund admin**, **Payments** tab: "Wrong amount", no Settle button.

> The ledger only accepts the exact amount. This doesn't get counted as close enough.

Switch to **LP B**, **My notices**, open the notice, **Withdraw it**, then **Pay 35 Amulet**. Back to **Fund admin**, **Calls**, **Settle**. Deployable now: $750,000.

## 1:55 Privacy, quickly

Switch to **LP A** and open its notice. Now switch **Viewing as** to **LP B** without leaving the page: the same notice address, read with LP B's login, says "Not visible to you".

Switch to **Unrelated party** and open **Home**: "The ledger returned nothing".

> Same network, no access. Not hidden by the app. That party's ledger never receives these records.

## 2:15 The investor who didn't pay

Back to **Fund admin**. Once the due time passes, LP C shows under Needs attention. Click **Mark overdue**.

> Before the due time, the ledger refuses this. After it, LP C is overdue, not quietly missing.

Final screen: Deployable now $750,000, Unresolved $250,000.

## 2:35 Why Canton

Open **Call 1**, **Details** on LP A: the receipt and the timeline.

> We ran the same call on an ordinary database with a paid flag. Marking LP C paid, reading LP B's row, and reusing LP A's payment all worked there. On the ledger, all of them were refused. That's what Canton changes here: privacy below the application, and funded only when the money moves.

## 2:55 Close

> A fund called capital from three investors. Each saw and paid only their own obligation. One didn't pay, and the fund still knows exactly what it can deploy.

## Recording notes

- Switching **Viewing as** keeps the current page and re-reads it with the new party's login. That is why an LP on an admin page sees "This page is for the fund admin". Use the tabs to go to each party's home.

- Everything shown is LocalNet. Say so on screen ("LocalNet demo environment" is in the header). Do not say DevNet until a DevNet run exists.
- Dollar amounts are the scenario. Amulet is what moved. The UI labels both.
- Do not open the Proof tab in the first 30 seconds. Mention it at the end as where to check the evidence.
