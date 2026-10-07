# Pilot plan

How DRAW would get to a first real pilot, in three stages, with what each stage needs, what it measures and when to continue. It's for a fund or administrator considering a trial, and for judges weighing the go-to-market plan.

First customer, as a hypothesis: one emerging fund manager, or one outsourced fund administrator running calls for a manager, with 2 to 5 LPs. Nobody has agreed to a pilot, and no pilot is implied anywhere in this repository.

The plan starts with no money moving because stage 1 needs no LP to hold a Canton party, so it works for a fund whose LPs pay by wire. What DRAW can and can't do for those LPs is in [PRODUCT.md](PRODUCT.md#lps-who-pay-by-wire).

## Stage 1: shadow one real call, no money moves

Stage 1 doesn't test matching or settlement. Wires are still matched by hand, and the fund records each one in DRAW by sending that notice to review with a note such as "wire received", since DRAW has no "paid by wire" state by design. What it tests is whether the operations lead would run the call from DRAW's per-LP notices and status list instead of the spreadsheet, how many minutes a day that takes, and whether LPs who see their own view care that no other LP can see it.

- Run it on DevNet with amounts only. Set up the fund's real commitments by hand, with demo parties named LP 1 to LP n for the LPs, or the LPs' own parties if they want to see their own view. The node operator can read everything on the node, and a DevNet reset deletes it, so nothing that names the fund or its LPs goes on it.
- Issue the same call the fund issues in its current system.
- Each LP, or the fund on its behalf, checks that the LP's view shows only that LP's notice.
- As wires arrive in the fund's bank, send the matching DRAW notice to review with a note such as "wire received", and compare DRAW's per-LP status list with the fund's spreadsheet each day until the call closes.

Measure: whether the operations lead could run the call from DRAW's list, and where the list and the spreadsheet differ and why. Time the fund's operations person spends per day on the call in each system. Any LP confusion about what they see.

Needs from the fund: commitment amounts for one call, and one operations person for about an hour a day during the call window.

## Stage 2: a controlled test settlement

- Two or three LPs willing to hold a small amount of a Canton test asset: Canton Coin on DevNet, or USDCx if the pilot runs on TestNet.
- Run one small call with real parties on DevNet or TestNet, while the real call stays on the existing rail and DRAW runs in parallel.
- Each LP signs its own payment in one of three ways:
  - with a key it holds in its browser while the fund's node hosts its party. DRAW's browser-key mode has run on LocalNet only, and there the LP's party sat on LocalNet's LP participant, not the fund's node. On DevNet a scripted run had each party sign with its own key while the HackCanton node hosted it, with all five keys on the machine that ran the script
  - from its own participant, with DRAW's package vetted there, which hasn't run yet
  - on the HackCanton node, by signing in with a wallet party on the fund's node and paying from that wallet, which has been shown on DevNet with the team's own login as the LP

Measure: time from an LP's payment to verified funded, payments refused and why, manual interventions, and any LP who could see more than its own record.

Needs: DevNet or TestNet parties for the fund and the LPs, a way for each LP to sign as above, and the fund's agreement that test transfers are fine. An LP's wallet on another validator, for example through a CIP-0103 wallet provider, works only if that validator has vetted DRAW's package, because every participant that confirms a DRAW transaction must have vetted it. On the HackCanton node, LP parties that hold their own keys also need the node operator to allocate them, as NODERS did for DRAW's scripted run on 2026-10-07.

## Stage 3: the integrations a genuine pilot requires

Not available during the hackathon. Listed so nobody mistakes stage 2 for production.

- A settlement asset the fund and LPs already accept on Canton, likely USDCx. That needs a TestNet or MainNet participant. TestNet needs Tokenomics Committee approval, an allowlisted IP, which usually takes 2 to 7 days, and an onboarding secret from a Super Validator sponsor. MainNet needs the same, plus Canton Coin for traffic. The sources are listed in [pitch/materials/gtm.md](pitch/materials/gtm.md).
- Each LP hosted on its own validator, or by a provider it trusts.
- The fund's identity provider for the fund's own sign-in, and LP sign-in that gives the app server no LP credentials ([SECURITY.md](SECURITY.md)).
- Export of call status to the fund administrator's existing system.
- Legal review of the fund documents for paying capital calls in a tokenized asset.

## Exit criteria

Stage 1 is worth continuing if the operations lead would run the next call from DRAW, and at least one LP says it would pay a call on Canton. Stage 2 is worth continuing if every test payment either settled and verified, or was refused with a reason the LP understood.

The metrics a pilot would track, stage by stage, are in [pitch/materials/metrics.md](pitch/materials/metrics.md). The smallest useful deployment and its cold-start cost are in [FIRST_UNIT_VALUE.md](FIRST_UNIT_VALUE.md).
