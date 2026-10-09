# Go to market

The GTM material: who DRAW goes to first, how we'll reach them, the pilot, the pricing hypothesis, the path to TestNet and MainNet, and the risks. It's for judges scoring distribution, and for anyone deciding whether to shadow a capital call with us. DRAW runs one capital-call workflow end to end on Canton: a private notice per LP, payment from the LP's Canton wallet, settlement, a read-back step, and an explicit list of what's unresolved.

Status on 2026-10-07: nobody has agreed to a pilot, and no customer, partner or letter of intent exists. No conversation with a fund has been held yet. Everything below is the plan we're testing.

## Who first

1. One outsourced fund administrator serving several emerging managers, meaning newer, smaller fund managers. One relationship reaches several funds, and the administrator does the matching work today. For payments made through DRAW, the ledger check replaces off-ledger matching. That this means less matching work for an administrator is our hypothesis.
2. The fund COO or operations lead at emerging managers that run their own calls (see [icp.md](icp.md)).

After that: LPs that already hold Canton assets and want their managers to call capital on Canton. They're the pull side, and we don't know yet how many exist.

The first customer we're looking for, as a hypothesis: one emerging manager, or one administrator running calls for a manager, with 2 to 5 LPs. The smallest useful deployment is one fund, two LPs, one call and one settlement instrument. It needs no other funds, marketplace, lenders or data network ([FIRST_UNIT_VALUE.md](../../FIRST_UNIT_VALUE.md)).

## Channels we'll test

| Channel | What we do | What tells us it works |
|---|---|---|
| Direct outreach | Short messages to fund ops people and administrators on LinkedIn and by email, asking for 20 minutes about their last call, with no pitch | Reply rate, calls booked |
| Introductions | Ask for introductions to whoever runs a fund's calls, wherever we can reach someone at a fund or an LP | Introductions that turn into calls |
| Canton ecosystem | Canton ecosystem events, and the institutions already building on the network | Conversations with funds or LPs already on Canton |
| The live demo | The DevNet site and its tour, sent after a conversation, never before | People who finish the tour and ask about a shadow run |

The first conversations are the first pipeline. Every interview ends with one question: what would you need to try DRAW on one real call, with no money moving?

## Pilot

Three stages, each with an exit test. The full plan is [PILOT_PLAN.md](../../PILOT_PLAN.md).

### Stage 1: shadow one real call, no money moves

This is how a first customer starts, and it works for LPs who pay by wire, because no money moves through DRAW.

Stage 1 doesn't test matching or settlement. Wires are still matched by hand, and the fund records each one in DRAW by sending that notice to review with a note such as "wire received", since DRAW has no "paid by wire" state by design. It tests whether the ops lead would run the call from DRAW's per-LP notices and status list instead of the spreadsheet, how many minutes a day that takes, and whether LPs care that no other LP can see their notice.

- Run it on DevNet with amounts only, the fund's real commitments entered by hand and the LPs named LP 1 to LP n. The node operator can read everything on the node, and a DevNet reset deletes it, so nothing that names the fund or its LPs goes on it.
- Issue the same call the fund issues in its current system.
- Each LP, or the fund on its behalf, checks that the LP's view shows only that LP's notice.
- As wires arrive in the fund's bank, send the matching DRAW notice to review with a note, and compare DRAW's per-LP status list with the fund's spreadsheet each day until the call closes.
- Needs from the fund: commitment amounts for one call, and about an hour a day from one ops person during the call window.
- Measure: whether the ops lead could run the call from DRAW's list, where it differs from the spreadsheet and why, ops minutes per day in each system, and any LP confusion.
- Continue if the ops lead would run the next call from DRAW, and at least one LP says it would pay a call on Canton.

### Stage 2: a small test settlement

2 or 3 LPs pay a small test amount on DevNet or TestNet from their own parties, while the real call stays on the bank rail.
We measure payment to verified funded, refusals and their reasons, manual steps, and any LP seeing more than its own record, and continue if every payment settled and verified or was refused with a reason the LP understood.

### Stage 3: what a real pilot needs

An asset the fund and LPs already accept, likely USDCx on TestNet or MainNet, each LP on its own validator or a provider it trusts, and LP sign-in that gives our server no LP credentials.
Export of call status to the administrator's system, and legal review of the fund documents for paying calls in a tokenized asset. None of this is available during the hackathon.

## Pricing (hypothesis)

- Managers: a subscription per fund, for a deployable figure tied to verified settlement and an explicit list of what's unresolved.
- Administrators: a price per call, for less matching work across clients, since they serve many small funds and their volume moves with calls.

When an administrator runs the call, the user and the payer differ. None of this is validated. No pricing conversation has happened and no price is set, and we won't set one until the interviews tell us what funds pay for administration today. CIP-0078 eliminated transfer and lock fees for Canton Coin. Traffic and holding fees remain, and DRAW hasn't measured traffic cost per transaction on DevNet or MainNet.

## Path to TestNet and MainNet

DRAW runs on the HackCanton DevNet shared node and on LocalNet. Here's what the next networks need, from the Canton docs.

| Step | What it needs | Source |
|---|---|---|
| Our own DevNet validator | An allowlisted IP, which usually takes 2 to 7 days, and at least 6 GB of RAM for a minimal node | Canton onboarding process, validator hardware requirements |
| TestNet | Tokenomics Committee approval, an allowlisted IP, and an onboarding secret from a Super Validator sponsor | Canton onboarding process |
| USDCx on TestNet | USDCx represents USDC deposited into Circle's xReserve and is a CIP-0056 token documented for TestNet and MainNet. TestNet USDCx comes from USDC deposited on Ethereum Sepolia | Digital Asset and Circle docs |
| MainNet | Everything TestNet needs, and Canton Coin for traffic. A low-activity production validator is sized at 2 CPUs and 8 GB of RAM | Canton onboarding process, hardware requirements |
| A hosted node instead | Node-as-a-service still needs the network's onboarding secret | NODERS NaaS onboarding docs |
| Featured App status | MainNet, then a Tokenomics Committee review, so it comes after a pilot | Canton Coin tokenomics docs |

Two things to plan around:

- DevNet resets about every three months, and a reset deletes every party and contract on a node. Pilot data shouldn't live only on DevNet.
- An LP whose party lives in a third-party wallet can't co-sign DRAW's settlement unless that wallet's validator vets DRAW's package, because every participant that confirms a DRAW transaction must have vetted it. DRAW has two answers. One is an LP that keeps its own key while a node it doesn't run hosts its party. That has run on LocalNet, with the party on LocalNet's LP participant, and in one scripted DevNet run, with all five keys on the machine that ran it. The other is an LP whose wallet party is already on the fund's node signing in with its own login and paying from that wallet, which has run on the HackCanton DevNet node with the team signing in, the newest time with a second login NODERS created for the team instead of its personal one. On 2026-10-09 one person outside the team took the LP seat once, with a login NODERS created for the team, while the team ran the fund side.

The USDCx line, word for word: "Uses the Token Standard allocation interface, which the USDCx registry supports. Not run with USDCx."

## Risks

| Risk | What we do about it |
|---|---|
| LPs don't hold a Canton party or tokenized cash | Stage 1 needs neither. Private notices and the unresolved list work before any LP pays on Canton |
| Fund documents don't allow paying calls in a tokenized asset | Legal review is part of Stage 3, before money moves |
| Nobody in the interviews has the problem badly enough | Then we change the ICP, or stop, and say so |
| One node operator hosts every party in a pilot | Each LP on its own validator or a provider it trusts is a Stage 3 requirement |
| The demo server holds the backend client that acts for every demo seat | The node reports that client's rights as the five demo parties and nothing else. An LP that signs in with HackCanton keeps its token in its own browser, the server never receives it, and nothing the server holds can act for that LP's party. Sign-in for every seat, the fund manager included, isn't built yet ([SECURITY.md](../../SECURITY.md)) |

## Sources

- Canton onboarding process (TestNet and MainNet approval, 2 to 7 days of allowlisting, DevNet resets): https://docs.canton.network/global-synchronizer/deployment/onboarding-process.md
- Validator hardware requirements: https://docs.canton.network/global-synchronizer/deployment/prerequisites.md
- Network resets: https://docs.canton.network/global-synchronizer/deployment/validator-network-resets.md
- NODERS NaaS onboarding: https://docs.naas.noders.services/onboarding.html
- USDCx overview and TestNet setup: https://docs.digitalasset.com/usdcx-xreserve/overview.md and https://docs.digitalasset.com/usdcx-xreserve/technical-setup.md
- TestNet USDCx through xReserve: https://developers.circle.com/xreserve/tutorials/deposit-usdc-on-ethereum-for-usdcx-on-canton
- Canton Coin tokenomics (CIP-0078 fees, featured apps): https://docs.canton.network/overview/reference/canton-coin-tokenomics.md
- Package vetting by confirming participants: https://docs.canton.network/appdev/deep-dives/smart-contract-upgrade.md
- Pilot plan and pricing hypothesis: [PILOT_PLAN.md](../../PILOT_PLAN.md), [BUSINESS_BRIEF.md](../../BUSINESS_BRIEF.md)
- Every DRAW claim, with its network and limits: [claims.yaml](../../../claims.yaml)
