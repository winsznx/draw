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

- Two or three LPs willing to hold a small amount of a Canton test asset (DevNet Amulet, or a test dollar token if one is available on the pilot network).
- Run one small call with real parties on DevNet or TestNet. LPs pay from their own wallets or participants.
- Keep the real call on the existing rail. Run DRAW in parallel.

Measure: time from an LP's payment to verified funded, payments refused and why, manual interventions, any LP who could see more than its own record.

Needs: DevNet or TestNet parties for the fund and LPs, a wallet path each LP can use (for example a CIP-0103 wallet), and the fund's agreement that test transfers are fine.

## Stage 3: the integrations a genuine pilot requires

Not available during the hackathon. Listed so nobody mistakes Stage 2 for production.

- A settlement asset the fund and LPs already accept on Canton, likely a regulated tokenized dollar.
- Each LP hosted on its own validator or a provider it trusts.
- The fund's identity provider for admin sign-in, and LP sign-in that gives the app server no LP credentials.
- Export of call status to the fund administrator's existing system.
- Legal review of the fund documents for paying capital calls in a tokenized asset.

## Exit criteria

Stage 1 is worth continuing if the fund says the unresolved list was at least as accurate as its spreadsheet and the per-LP privacy matters to its LPs. Stage 2 is worth continuing if every test payment either settled and verified, or was refused with a reason the LP understood.
