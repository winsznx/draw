# Limitations

Plainly, what DRAW doesn't do or hasn't shown yet. Updated 2026-10-07.

This list is for judges, and for anyone deciding whether DRAW could run a real capital call. DevNet and LocalNet are kept apart, and each item names the network it's about. What is proven, with its evidence, is in [PROOF.md](PROOF.md), and every public claim and its limits are in [claims.yaml](../claims.yaml).

## Environment

- The canonical flow has passed on the HackCanton DevNet node and on LocalNet. On DevNet that's 83 of 83 on package 0.3.0 in the own-keys run, where each party signs with its own key, and 82 of 82 with the NODERS clients, after 79 of 79 on a shared login and 72 of 72 on 0.2.0. The 100-case campaign and the database comparison have only run on LocalNet. The browser journey has passed on both: against the live DevNet site, and on LocalNet with a login per party and with browser keys.
- Package 0.3.0 has run only in Daml Script and on DevNet. Every LocalNet run, including the campaign, the database comparison, the custody run and the clean room, used 0.2.0 or earlier.
- On the DevNet node one backend client acts for all five demo parties, and in the own-keys run one login, the team's own, submitted for every party, so LP-from-LP credential separation is proven on LocalNet only. Every DevNet run skipped that credential check and recorded why.
- The read-back step's own DevNet client, the verifier client NODERS issued, reads only as the demo seats' fund party ([probe 20261007T125624Z](../evidence/devnet/probes/20261007T125624Z/result.json)), and the ledger refused it as the fund in [run 20261007T125638Z](../evidence/devnet/runs/20261007T125638Z/result.json). It could also act and read as the team's personal wallet party until NODERS removed that right on 2026-10-07 ([probe 20261006T133219Z](../evidence/devnet/probes/20261006T133219Z/result.json)). The live site has read back on it only since about 13:00 UTC on 2026-10-07, and before that through the backend client, the same credential as the seats. It can't read as an external fund party, so the own-keys run read back with the team's login, the same one that submitted for every party.
- An LP can sign in with its own HackCanton login and join a demo fund as itself, but every run of that used the team's own login as the LP. In the newest runs the server held the backend client and the verifier client, neither of which can act for the LP's party, so the same person held both sides with different credentials. Two different people's logins on DevNet need a second person. NODERS created two more HackCanton logins on 2026-10-07, for a teammate and for judges. They need a first-login setup, and no run has used them yet.
- On DevNet, parties that hold their own keys have been used only in the scripted own-keys run, [20261007T130259Z](../evidence/devnet/runs/20261007T130259Z/result.json). External parties on the shared node need NODERS to allocate them. The self-allocation quota defaults to 0 in Canton 3.5, and our own allocate call is refused with HTTP 403 ([probe 20261006T091205Z](../evidence/devnet/probes/20261006T091205Z/result.json)). NODERS allocated the five parties on 2026-10-07 from onboarding transactions DRAW generated and signed. All five keys sat on the machine that ran the script, so the run shows the ledger needs each party's signature. It doesn't show that separate people held the keys. The live site doesn't use these parties, and its demo seats still sign through the backend client.
- Every party on the DevNet node sits on one participant, and so does every LP on LocalNet. That operator can read every party it hosts. Production needs each LP on its own validator or with a provider it trusts.
- Settlement uses Canton Coin from the DevNet faucet on DevNet and Amulet on LocalNet. Neither has monetary value, and the dollar figures are the scenario. There's no real money, no bank rail and no TestNet or MainNet run. DRAW settles through the Token Standard allocation interface, which the USDCx registry supports, but it hasn't run with USDCx.
- A DevNet reset would delete every party and contract on the node. DevNet resets about every three months.

## Product

- Overdue needs a click by the fund after the due time. There's no scheduler, and marking overdue takes no note.
- The fund clicks Settle by default. `DRAW_AUTO_SETTLE=true` settles exact matches automatically through the same path, but that mode hasn't run against a ledger.
- Only the exact amount settles. There are no partial payments, so any other amount is refused, and the LP withdraws it and pays again.
- Nothing in DRAW can mark a wire-paid notice funded, because `Obligation_Settle` is the only path to funded. A notice an LP paid by wire stays unresolved, or the fund sends it to review with a note, and it never counts as deployable. Turning tokenized dollars into a bank wire the fund can invest isn't covered either.
- A notice carries a call name, a note, a due date, the LP's amount and a random reference. It doesn't carry the line items of ILPA's capital call and distribution template ([PROBLEM_EVIDENCE.md](PROBLEM_EVIDENCE.md)).
- Commitments come from the demo setup. There's no onboarding, KYC or document flow.
- One currency and instrument per fund. Scenario dollars and Canton Coin units are separate fields, and the app labels both.
- No notifications. LPs see their notices when they open the app.
- No export to a fund administrator's system, and no distributions, redemptions or NAV records. DRAW runs capital calls only.
- The investor list is three demo LPs plus an unrelated party, and at most one LP signed in with HackCanton per demo fund.
- Actions on the live site need a demo access code. Each browser gets its own demo fund, and every demo fund uses the same five parties. The app keeps one browser out of another browser's fund. The ledger keeps each LP out of the other LPs' records.
- The fund manager seat has no sign-in of its own. On DevNet it acts through the backend client, like every demo seat.
- Sign in with HackCanton needs a login whose party is already onboarded in the node's Canton Coin wallet, and that party sits on the same NODERS participant as the fund. It now uses DRAW's own public web client, which NODERS issued. The first four sign-in runs used NODERS' public web-app client.
- The node's Canton Coin wallet is the only wallet shown listing and approving a DRAW payment request, in runs with the team's own login. Reject and Withdraw in that wallet, a late payment through the wallet API, and the wallet's withdraw and tap calls haven't run in a saved run. Each of those two calls was made once by hand on 2026-10-06, as [SPONSOR_FINDINGS.md](SPONSOR_FINDINGS.md) records.

## Security

- The demo app server holds the credential of every demo seat: the backend client on DevNet, and on LocalNet, whose signing secret is the public `unsafe`, it could sign a ledger login for any user. On DevNet it holds nothing that can act for a signed-in LP's party, and it never receives that LP's token. [SECURITY.md](SECURITY.md) describes the production model, which isn't built beyond that sign-in.
- A signed-in LP's token sits in its browser tab's session storage. The site loads no third-party scripts, but anything that runs in that tab could use the token.
- Per the Splice token design, the token registry operator (the DSO) is a stakeholder of every allocation and so sees its settlement reference. References are random and name no one. No run has read the DSO's view.
- Per the Splice Scan API docs, the Canton Coin leg of each payment appears in Scan, the network's public explorer, with its random reference and the party ids, whose hints such as `draw-lpa` are readable, and the notices don't. We inferred this from the docs and haven't checked it against Scan.
- The read-back step runs in the same process as the submitter, in the scripts and the app, so we don't call it independent on any network.
- The verifier party that a fund can name in package 0.3.0 has run in Daml Script only. On DevNet the read-back step reads as the fund's own party.
- An LP whose party lives in a third-party wallet can't co-sign DRAW notices unless that wallet's validator vets DRAW's package, because every participant that confirms a DRAW transaction must have vetted it. The signed-in LP works on DevNet because its wallet party is on the fund's own node, which has DRAW's package. DRAW's other answer, a key in the LP's browser, has run on LocalNet only, where the LP's party sat on LocalNet's LP participant, not on the fund's node. A key-holding LP hosted by the fund's node has been shown only in the scripted DevNet own-keys run, with its key on the machine that ran the script and no browser.
- A DRAW notice can only be funded by a payment to the fund's party, so it carries no emailed wire details to swap. That depends on the LP knowing the fund's real party, and DRAW doesn't build that onboarding. DRAW can't stop fake payment instructions emailed outside DRAW, and no run has tested a fake-notice attack.

## Evidence

- Campaign cases call at most three LPs, and large calls haven't been tested against transaction size limits.
- An expired allocation and a mid-payment network failure haven't been produced in a run.
- Each timing figure comes from one run: 1,047 ms and 1,037 ms on LocalNet, and on DevNet 5.0 s and 5.3 s in the own-keys run and 7.5 s and 5.2 s in the run with the verifier client ([WORKLOAD_ECONOMICS.md](WORKLOAD_ECONOMICS.md)).
- The 2026-10-04 clean-room run built the earlier web app and package 0.2.0. The current Next.js app in `web/` and package 0.3.0 haven't been through a clean-room run ([CLEAN_ROOM.md](CLEAN_ROOM.md)).
- The LocalNet browser runs used the web app before the 2026-10-05 redesign. The redesigned onboarding and browser-key flow haven't run on LocalNet.
- The repository history was rewritten once, on 2026-10-05, before publication. Of the 16 commit ids in today's evidence files from before 2026-10-06, 11 point at the old history, including those of the first DevNet run and the custody, 0.2.0 Daml core and clean-room runs, and so did the `generatedAtCommit` of the 2026-10-05 manifest, now kept in git history. [PROOF.md](PROOF.md#commit-ids-in-the-evidence) maps each one to its published commit. The runs from 2026-10-06 onward record commits made after the rewrite.

## Business

- No conversation with a fund operations practitioner is on file, and no usability test with an outside person: 0 of each as of 2026-10-07. Market claims stay hypotheses.
- The problem rests on 12 public sources. 2 argue against, and 3 show fiat tools already handle notices and matching ([PROBLEM_EVIDENCE.md](PROBLEM_EVIDENCE.md)).
- No pricing conversation has happened, and no price is set.
- Nobody has agreed to a pilot. There are no customers, partners or letters of intent.
- The value to a fund, such as fewer reconciliation questions, less matching work and fewer surprises in reported funded capital, is a hypothesis. Reconciliation hours, error rates and cost in a real fund haven't been measured.
- No market size, LP-count band or number of calls per year is set. Those inputs are meant to come from interviews.
