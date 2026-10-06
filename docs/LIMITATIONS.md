# Limitations

Plainly, what DRAW doesn't do or hasn't shown yet. Updated 2026-10-06.

## Environment

- The canonical flow has passed on the HackCanton DevNet node (79 of 79 on package 0.3.0, after 72 of 72 on 0.2.0) and on LocalNet. The 100-case campaign, the ablation and the custody run have only run on LocalNet. The browser journey has passed on both: against the live DevNet site, and on LocalNet with a login per party and with browser keys.
- Package 0.3.0 has run in Daml Script and on DevNet. Every LocalNet run, including the campaign, the ablation, the custody run and the clean room, used 0.2.0 or earlier.
- On the DevNet node one hackathon login acts for all five demo parties and for the read-back step. Credential separation, a read-only verifier login that can't submit, and keys held by each party are proven on LocalNet only.
- DevNet LPs can't hold their own keys yet, because external parties on the shared node need NODERS to allocate them. The self-allocation quota defaults to 0 in Canton 3.5, and our own allocate call is refused with HTTP 403 (`evidence/devnet/probes/20261006T091205Z`).
- Every party on the DevNet node sits on one participant, and so does every LP on LocalNet. That operator can read every party it hosts. Production needs each LP on its own validator or with a provider it trusts.
- Settlement uses Canton Coin from the DevNet faucet on DevNet and Amulet from the tap on LocalNet. Neither has monetary value. No real money, no USDCx, no bank rail. The USDCx registry lists the same allocation API DRAW uses, but DRAW hasn't run with USDCx.
- A DevNet reset would delete every party and contract on the node. DevNet resets about every three months.

## Product

- Overdue needs an admin click after the due time. There is no scheduler.
- The admin clicks Settle by default. `DRAW_AUTO_SETTLE=true` settles exact matches automatically through the same path, but that mode hasn't run against a ledger yet.
- Commitments are created in the demo setup. There is no onboarding, KYC, or document flow.
- One currency and instrument per fund. Scenario dollars and Canton Coin units are separate fields, and the UI labels both.
- No partial payments. Anything other than the exact amount is refused.
- No notifications. LPs see notices when they open the app.
- The investor list is fixed at three demo LPs plus an unrelated party.
- Actions on the live site need a demo access code. Each browser gets its own demo fund, and every demo fund uses the same five parties. The app keeps one browser out of another browser's fund. The ledger keeps each LP out of the other LPs' records.
- No wallet app has been shown listing or approving a DRAW payment request. Each LP's call reaches it as a CIP-0056 AllocationRequest, and on DevNet the run script created LP A's allocation from that request with the shared hackathon login.

## Security

- The demo app server holds every role's credential, and on LocalNet could mint any token. `SECURITY.md` describes the production model, which isn't built.
- The token registry operator (the DSO) sees every allocation's settlement reference. References are random and name no one.
- Per the Splice Scan API docs, the Canton Coin leg of each payment appears in Scan, the network's public explorer, with its random reference and the party ids, and the obligation contracts don't. Our DevNet party ids carry readable hints such as `draw-lpa`. We inferred this from the docs and haven't checked it against Scan.
- The verifier runs in the same process as the submitter, in scripts and in the app.
- The verifier party that a fund can name in package 0.3.0 has run in Daml Script only. On DevNet the read-back step reads as the fund's own party with the shared login.
- An LP whose party lives in a third-party wallet can't co-sign DRAW obligations unless that wallet's validator vets DRAW's package, because every participant that confirms a DRAW transaction must have vetted it. DRAW's own answer is a key in the LP's browser with the party hosted by the fund's node, which runs on LocalNet only.

## Evidence

- No conversation with a fund operations practitioner is on file. Market claims stay hypotheses.
- No usability test with an outside person is on file.
- Campaign cases call at most three LPs.
- An expired allocation and a mid-payment network failure haven't been produced in a run.
- The 2026-10-04 clean-room run built the earlier web app. The current Next.js app in `web/` hasn't been through a clean-room run.
- The repository history was rewritten once, on 2026-10-05, before publication. Of the 17 commit ids recorded in evidence before 2026-10-06, 12 point at the old history, including those of the first DevNet run and the custody, 0.2.0 Daml core and clean-room runs. `PROOF.md` maps each one to its published commit. The runs from 2026-10-06 record commits made after the rewrite.
- The LocalNet browser runs used the web app before the 2026-10-05 redesign. The redesigned onboarding and browser-key flow haven't run on LocalNet.
