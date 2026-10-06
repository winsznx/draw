# Pilot plan

First customer, as a hypothesis: one emerging fund manager or one outsourced fund administrator running calls for a manager, with two to five LPs. Nobody has agreed to a pilot. No pilot is implied anywhere in this repository.

## Stage 1: shadow one real call, no money moves

- Set up the fund's real commitments by hand (amounts only, LPs as demo parties or the LPs' own parties if they want to see their view).
- Issue the same call the fund issues in its current system.
- Each LP, or the admin on their behalf, checks that the LP's view shows only that LP's notice.
- As wires arrive in the fund's bank, mark the matching DRAW obligation in review with a note, and compare DRAW's unresolved list with the fund's spreadsheet each day until the call closes.

Measure: differences between DRAW's unresolved list and the spreadsheet, and why. Time the admin spends per day on the call in each system. Any LP confusion about what they see.

Needs from the fund: commitment amounts for one call, one operations person for about an hour a day during the call window.

## Stage 2: a controlled test settlement

- Two or three LPs willing to hold a small amount of a Canton test asset (DevNet Canton Coin, or TestNet USDCx if the pilot runs on TestNet).
- Run one small call with real parties on DevNet or TestNet. Each LP signs its own payment, either with a key it holds while the fund's node hosts its party (DRAW's browser-key mode, run on LocalNet so far) or from its own participant with DRAW's package vetted.
- Keep the real call on the existing rail. Run DRAW in parallel.

Measure: time from an LP's payment to verified funded, payments refused and why, manual interventions, any LP who could see more than its own record.

Needs: DevNet or TestNet parties for the fund and LPs, a way for each LP to sign as above, and the fund's agreement that test transfers are fine. A CIP-0103 wallet would only work if its validator vets DRAW's package, because every participant that confirms a DRAW transaction must have vetted it. On the HackCanton node, LP parties with their own keys also need the node operator to allocate them.

## Stage 3: the integrations a genuine pilot requires

Not available during the hackathon. Listed so nobody mistakes Stage 2 for production.

- A settlement asset the fund and LPs already accept on Canton, likely USDCx. That needs a TestNet or MainNet participant, which needs Tokenomics Committee approval.
- Each LP hosted on its own validator or a provider it trusts.
- The fund's identity provider for admin sign-in, and LP sign-in that gives the app server no LP credentials.
- Export of call status to the fund administrator's existing system.
- Legal review of the fund documents for paying capital calls in a tokenized asset.

## Exit criteria

Stage 1 is worth continuing if the fund says the unresolved list was at least as accurate as its spreadsheet and the per-LP privacy matters to its LPs. Stage 2 is worth continuing if every test payment either settled and verified, or was refused with a reason the LP understood.
