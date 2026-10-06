# Go to market

Status on 2026-10-06: nobody has agreed to a pilot, and no customer, partner or letter of intent exists. Everything below is the plan we're testing.

## Who first

1. One outsourced fund administrator serving several emerging managers. One relationship reaches several funds, and the administrator does the matching work DRAW removes for exact payments.
2. The fund COO or operations lead at emerging managers that run their own calls (see [`icp.md`](icp.md)).

After that: LPs that already hold Canton assets and want their managers to call capital on Canton. They're the pull side, and we don't know yet how many exist.

## Channels we'll test

| Channel | What we do | What tells us it works |
|---|---|---|
| Direct outreach | Short messages to fund ops people and administrators on LinkedIn and by email, asking for 20 minutes about their last call, with no pitch | Reply rate, calls booked |
| Introductions | Ask people who run funds, and LPs we know, to introduce us to whoever runs their calls | Introductions that turn into calls |
| Canton ecosystem | Canton ecosystem events, and the institutions already building on the network | Conversations with funds or LPs already on Canton |
| The live demo | The DevNet site and the 3-minute tour, sent after a conversation, never before | People who finish the tour and ask about a shadow run |

The first conversations are the first pipeline. Every interview ends with one question: what would you need to try DRAW on one real call, with no money moving?

## Pilot

From [`docs/PILOT_PLAN.md`](../../PILOT_PLAN.md).

### Stage 1: shadow one real call, no money moves

- Set up the fund's real commitments by hand (amounts only).
- Issue the same call the fund issues in its current system.
- Each LP, or the fund on its behalf, checks that the LP's view shows only that LP's notice.
- As wires arrive in the fund's bank, mark the matching DRAW notice in review with a note, and compare DRAW's unresolved list with the fund's spreadsheet each day until the call closes.
- Needs from the fund: commitment amounts for one call, and about an hour a day from one ops person during the call window.
- Measure: differences between the two unresolved lists and why, ops minutes per day in each system, and any LP confusion.
- Continue if the fund says DRAW's unresolved list was at least as accurate as its spreadsheet, and that per-LP privacy matters to its LPs.

### Stage 2: a small test settlement

- 2 or 3 LPs pay a small test amount on DevNet or TestNet from their own parties. The real call stays on the bank rail.
- Measure: payment to verified funded, payments refused and why, manual interventions, and any LP who could see more than its own record.
- Continue if every test payment either settled and verified, or was refused with a reason the LP understood.

### Stage 3: what a real pilot needs

A settlement asset the fund and LPs already accept on Canton, most likely a tokenized dollar. Each LP on its own validator or with a provider it trusts. The fund's identity provider for sign-in, and LP sign-in that gives our server no LP credentials. Export of call status to the administrator's system. Legal review of the fund documents for paying calls in a tokenized asset.

## Pricing (hypothesis)

- Managers: a subscription per fund.
- Administrators: a price per call, since they serve many small funds and their volume moves with calls.

This isn't validated. No pricing conversation has happened, and we won't put a price on it until the interviews tell us what funds pay for administration today. Canton Coin transfers themselves cost almost nothing since CIP-0078, so the network fee isn't what sets the price. We haven't measured traffic cost per transaction on DevNet or MainNet.

## Path to TestNet and MainNet

DRAW runs on the HackCanton DevNet shared node and on LocalNet. Here's what the next networks need, from the Canton docs.

| Step | What it needs | Source |
|---|---|---|
| Our own DevNet validator | An allowlisted IP, which usually takes 2 to 7 days, and at least 6 GB of RAM for a minimal node | Canton onboarding process, validator hardware requirements |
| TestNet | Tokenomics Committee approval, an allowlisted IP, and an onboarding secret from a Super Validator sponsor | Canton onboarding process |
| USDCx on TestNet | USDCx is a CIP-0056 token documented for TestNet and MainNet. TestNet USDCx comes through Circle's xReserve, from USDC deposited on Ethereum Sepolia | Digital Asset and Circle docs |
| MainNet | Everything TestNet needs, and Canton Coin for traffic. A low-activity production validator is sized at 2 CPUs and 8 GB of RAM | Canton onboarding process, hardware requirements |
| A hosted node instead | Node-as-a-service still needs the network's onboarding secret | NODERS NaaS onboarding docs |
| Featured App status | MainNet, then a Tokenomics Committee review. Reviewers want adoption they can verify, so this comes after a pilot | Canton Coin tokenomics docs, AppsFactory materials guide |

Two things to plan around:

- DevNet resets about every three months, and a reset deletes every party and contract on a node. Pilot data shouldn't live only on DevNet.
- An LP whose party lives in a third-party wallet can't co-sign DRAW's settlement unless that wallet's validator vets DRAW's package, because every participant that confirms a DRAW transaction must have vetted it. DRAW's answers are the fund's node hosting the LP's party while the LP keeps its own key, which runs on LocalNet today, and an LP whose wallet party is already on the fund's node signing in with its own login and paying from that wallet, which runs on the HackCanton DevNet node with the team's own login.

The USDCx line, word for word: "Uses the Token Standard allocation interface, which the USDCx registry supports. Not run with USDCx."

## Risks

| Risk | What we do about it |
|---|---|
| LPs don't hold a Canton party or tokenized cash | Stage 1 needs neither. Private notices and the unresolved list work before any LP pays on Canton |
| Fund documents don't allow paying calls in a tokenized asset | Legal review is part of Stage 3, before money moves |
| Nobody in the interviews has the problem badly enough | Then we change the ICP, or stop, and say so in the journal |
| One node operator hosts every party in a pilot | Each LP on its own validator or a provider it trusts is a Stage 3 requirement |
| The demo server holds every demo seat's credential | An LP that signs in with HackCanton keeps its token in its own browser, and the server never receives it. Sign-in for every seat, the fund manager included, isn't built yet ([`docs/SECURITY.md`](../../SECURITY.md)) |

## Sources

- Canton onboarding process (TestNet and MainNet approval, 2 to 7 days of allowlisting, DevNet resets): https://docs.canton.network/global-synchronizer/deployment/onboarding-process.md
- Validator hardware requirements: https://docs.dev.sync.global/validator_operator/validator_hardware_requirements.html
- Network resets: https://docs.dev.sync.global/validator_operator/validator_network_resets.html
- NODERS NaaS onboarding: https://docs.naas.noders.services/onboarding.html
- USDCx overview and TestNet setup: https://docs.digitalasset.com/usdcx-xreserve/overview.md and https://docs.digitalasset.com/usdcx-xreserve/technical-setup.md
- TestNet USDCx through xReserve: https://developers.circle.com/xreserve/tutorials/deposit-usdc-on-ethereum-for-usdcx-on-canton
- Canton Coin tokenomics (CIP-0078 fees, featured apps): https://docs.canton.network/overview/reference/canton-coin-tokenomics.md
- Package vetting by confirming participants: https://docs.canton.network/appdev/deep-dives/smart-contract-upgrade.md
- Pilot plan and pricing hypothesis: [`docs/PILOT_PLAN.md`](../../PILOT_PLAN.md), [`docs/BUSINESS_BRIEF.md`](../../BUSINESS_BRIEF.md)
