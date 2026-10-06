# Judge Q&A

Short answers for the deck notes, the async judging window and a possible live final. Each answer stays inside [`claims.yaml`](../../claims.yaml) and names what backs it. Claim ids are in brackets.

Labels, word for word:

- DevNet: "DevNet, HackCanton shared node. DRAW's backend login signs for every demo seat."
- LocalNet: "LocalNet. Each party signs with its own key."
- Asset: "Settles in Canton Coin from the DevNet faucet. Dollar figures are the scenario."
- Production asset: "Uses the Token Standard allocation interface, which the USDCx registry supports. Not run with USDCx."

## The asset and the network

### Why would an LP pay a capital call in Canton Coin?

It wouldn't. Canton Coin is the DevNet asset, because it's what the test network has. A fund would call capital in a tokenized dollar. USDCx is a CIP-0056 token, and its MainNet registry's public metadata lists `splice-api-token-allocation-v1`, the allocation API DRAW settles through, so the settle path stays the same. We haven't run DRAW with USDCx.

Backed by: [settlement-gates-funded] limits. USDCx registry metadata: https://api.utilities.digitalasset.com/api/token-standard/v0/registrars/decentralized-usdc-interchain-rep::12208115f1e168dd7e792320be9c4ca720c751a02a3053c7606e1c1cd3dad9bf60ef/registry/metadata/v1/info

### Is any of this on MainNet, or real money?

No. It runs on the HackCanton DevNet node and on LocalNet, and no real money moves. TestNet and MainNet need Tokenomics Committee approval, an allowlisted IP and an onboarding secret from a Super Validator sponsor. That comes after a shadow pilot.

Backed by: [devnet], Canton onboarding process docs.

### What does it cost to run on Canton?

We haven't measured traffic cost per transaction on DevNet or MainNet. The canonical call with three LPs takes 15 ledger transactions including setup, and issuing it to all three LPs took 1 transaction (LocalNet workload run). Canton Coin transfer fees have been almost zero since CIP-0078.

Backed by: `docs/WORKLOAD_ECONOMICS.md`, `evidence/local/workload/20261002T185353Z/result.json`, Canton Coin tokenomics docs.

## Privacy

### Isn't the privacy just your server choosing which party to show?

The ledger returns nothing to LP B, even when it's asked for LP A's notice by contract id. On DevNet we checked each party's own reads and its own transaction stream, and no party received an event about another party's records. On LocalNet each party has its own login, or its own key, with the same result. On DevNet the demo seats share one backend client that the node operator issued for DRAW, so LP-from-LP credential separation is shown on LocalNet only. An LP that signs in with its own HackCanton login reads its notices from the ledger in its own browser with its own token, so the server isn't choosing anything for it. Our runs of that used the team's own login as the LP.

Backed by: [devnet] (`evidence/devnet/runs/20261006T131900Z/streams.json`, the check "lpA cannot fetch lpB obligation by contract id"), [signed-in-lp], [private-obligations], [non-custodial].

### Can the fund manager see every LP?

Yes, by design. The fund is a party to every notice, so it sees every LP's notice and payment. DRAW keeps LPs from seeing each other. It doesn't hide LPs from their own fund.

Backed by: `docs/CANTON_ABLATION.md`, "What a database does just as well".

### Is the payment private?

The notice is. The Canton Coin leg of each payment is visible to the DSO and appears in Scan, the network's public explorer, with a random reference. Our DevNet party ids carry readable hints such as `draw-lpa`, and we'd give new parties opaque ones. The notices themselves never appear in Scan.

Backed by: [devnet] limits, `docs/LIMITATIONS.md`.

### Why not a public chain with USDC?

Every LP would see every other LP's identity, commitment share, due date and payment status. That's the LP book, and DRAW's per-LP contracts exist to keep it private. We read those fields off DRAW's own notice contract. That comparison is field exposure, not a run. The run we did make, on LocalNet: a database with a paid flag let 4 of 5 attacks through, and DRAW let none through.

Backed by: [canton-load-bearing], `evidence/local/ablation/20261002T193830Z/result.json`.

### Why should a fund trust your node operator?

In a pilot it shouldn't have to. Today all parties sit on one participant, on both networks, and its operator can read them all. Production needs each LP on its own validator or with a provider it trusts. A key held by the LP removes the node's ability to sign for it, but the hosting node still validates and confirms.

Backed by: [private-obligations] limits, [non-custodial] limits.

## Keys and settlement

### Who holds the keys?

On the DevNet node, the node holds every party's key. DRAW's server acts for the five demo seats through a backend client the node operator issued for DRAW, which can act for those five parties and nothing else. An LP that signs in with HackCanton acts with its own login, which DRAW's server never receives, and nothing the server holds can act for that LP's party. On LocalNet each party can hold its own key: the participant prepares each transaction, the party's key signs it, and the participant can't act for the party without that signature. Another party's key is refused. 76 of 76 checks. In the browser demo each person creates a key in the browser and backs it up.

Backed by: [non-custodial], `evidence/local/runs/20261004T183146Z/result.json`, [devnet] and probe `evidence/devnet/probes/20261006T133219Z` for the backend client's rights.

### Is the read-back login separate from the seats?

In the scripted DevNet run, yes. It used a verifier client the node operator issued for DRAW, a different ledger user from the seats. The run tried to submit as the fund with it and the ledger refused, and each receipt records that the read-back ran as that client's own user. That client isn't read-only, though: the node reports it can also act and read as the team's personal wallet party, and we've asked the operator to remove that. So we don't call it read-only, and the live site doesn't use it. There the read-back reads with the backend login, the same credential as the seats. On LocalNet the read-back is a read-only login that can't submit.

Backed by: [devnet] (`evidence/devnet/runs/20261006T131900Z/result.json`, `credentialSeparation: VERIFIER_ONLY`), probe `evidence/devnet/probes/20261006T133219Z`, [real-token-settlement].

### How do you know a settlement actually happened?

A read-back step fetches the settlement from the ledger and runs 14 checks. Among them: the update exercises `Obligation_Settle`, the same transaction executes and consumes the referenced allocation, the fund's holdings are active and in the right instrument, they add up to the amount due, and the payer is the obligated LP. Only a receipt that passes all 14 counts as verified funded. On LocalNet that step runs as a read-only login that can't submit. On DevNet it ran on a login of its own in the scripted run, and on the live site it reads with the backend login (see the question above). Since package 0.3.0 a fund can also name a verifier party that reads the fund, every call and every obligation, and the ledger refuses it when it tries to act. That has run in Daml Script only.

Backed by: [devnet], [real-token-settlement], [verifier-party], `docs/PROOF.md` ("Reading a receipt").

### What happens when an LP pays the wrong amount?

The ledger won't settle it, so it never counts. The LP sees that its payment doesn't match, withdraws it and pays the exact amount. There are no partial payments.

Backed by: [negative-settlement], the `negative` checks in the DevNet run, `docs/LIMITATIONS.md`.

### What if an LP doesn't pay?

It stays unresolved. Before the due time the ledger refuses to mark it overdue. After it, the fund can. The fund can also send a notice to review, or waive an overdue or reviewed one, each with a note. There's no scheduler, so a person marks it overdue.

Backed by: [unpaid-unresolved].

### Why does the fund click Settle by hand?

It's the default. Automatic settlement of exact matches is written behind `DRAW_AUTO_SETTLE` and goes through the same settle and read-back path, but it hasn't run against a ledger, so we don't claim it.

Backed by: `docs/LIMITATIONS.md`.

### Can LPs pay from the Canton wallet they already use?

On the HackCanton node, yes, if the wallet is on that node. Each LP's call reaches it as a CIP-0056 AllocationRequest, the Token Standard interface an app uses to ask a user for an allocation. An LP with a HackCanton login signs in on the node's Keycloak, and the node's Canton Coin wallet lists the capital call under Allocations with Accept and Reject. Pressing Accept locked the coin for the fund, the fund manager settled, and the LP's notice showed verified funded. The LP can also pay from DRAW, which asks its wallet to fund the request through the same wallet API call. DRAW's server never receives the LP's token.

Two limits. Every run signed in with the team's own login as the LP. In the newest runs the server held only the backend client, which can't act for that party, but it's still the same person on both sides, so a second person's login is still to show. And the LP's wallet party sits on the same node as the fund, which has DRAW's package. Every participant that confirms a DRAW transaction must have vetted DRAW's package, and the LP co-signs its obligation, so a wallet on another validator would need DRAW's package vetted there first.

Backed by: [signed-in-lp] (`evidence/devnet/browser/web-hackcanton-wallet-20261006132730`, `evidence/devnet/browser/web-hackcanton-20261006132613`, and earlier runs), [wallet-request], Canton docs on package vetting by confirming participants.

### What stops a fake DRAW notice?

A DRAW notice is a contract signed by the fund's party, and only a payment to that party can fund it. An LP checks its notice in DRAW, where there are no emailed wire details to swap. DRAW can't stop someone emailing an LP fake wire instructions outside DRAW.

Backed by: [settlement-gates-funded] ("to the fund admin").

## Product and market

### Fund software already handles capital calls. What's new?

Existing tools issue notices and match bank payments to LPs, often in batches from a bank export. DRAW moves the match into the payment: the payment carries the notice's reference, the ledger checks it, and the notice turns funded in the same transaction that moves the money. A payment that doesn't match exactly is refused, so it can't fund a notice by mistake. When a payment comes from the wrong party, the fund sends that notice to review with a note. And the ledger itself keeps each LP from reading another LP's notice.

Backed by: `docs/PROBLEM_EVIDENCE.md` sources 10 to 12, [settlement-gates-funded], [negative-settlement].

### Who's it for?

The fund COO or operations lead at an emerging manager, the person who has to say what's actually been funded. Or the outsourced administrator who runs calls for several emerging managers, since one relationship reaches several funds. We haven't set an LP-count band. The interviews record LPs per fund and calls per year, and we'll band from what they show.

Backed by: `docs/BUSINESS_BRIEF.md`, `docs/PRODUCT.md`, `docs/pitch/materials/icp.md`.

### Who pays for DRAW?

Our hypothesis: managers pay a subscription per fund, for a deployable figure tied to verified settlement. Administrators pay per call, for less matching work across clients. No pricing conversation has happened yet.

To fill from the interview notes: what the people we spoke with pay for fund administration today, and who they said would pay.

### Have you talked to people who run capital calls?

To fill from the notes. As of 2026-10-06, no conversation is on file. The problem evidence is 12 public sources, 2 of them against our hypothesis: LP defaults are rare, so we lead with telling late from funded.

Backed by: `docs/PROBLEM_EVIDENCE.md`, `docs/pitch/materials/metrics.md`.

### What's missing for production?

Sign-in for every seat, so our server holds no seat's credentials. An LP can already sign in with its own HackCanton login on DevNet, and the fund manager can't yet. USDCx on TestNet and then MainNet, which needs Tokenomics Committee approval and a Super Validator sponsor. Each LP on its own validator or a provider it trusts. Onboarding and KYC. Export to the administrator's system. A scheduler for overdue. Legal review of paying calls in a tokenized asset.

Backed by: `docs/PILOT_PLAN.md` stage 3, `docs/SECURITY.md`, `docs/LIMITATIONS.md`.

### Does it scale?

On LocalNet we ran 100 seeded calls with 191 notices, about 400 ledger transactions plus reads and verifications, in 238 seconds: 0 false fundings, 0 privacy violations, 0 replays accepted, 0 total mismatches. Issuing a three-LP call took 1 transaction. Campaign cases called at most three LPs, on one machine, so this isn't a production figure, and we haven't tested large calls against transaction size limits.

Backed by: [generalization], `docs/WORKLOAD_ECONOMICS.md`.

## The build

### What did you build during the hackathon?

All of it, from scratch during HackCanton Season 3. The first commit is dated 2026-10-01. The Daml model, scripts, app and docs were written during the event. Every `result.json`, receipt and log under `evidence/` was written by a script, and failed runs are kept with a short note.

Backed by: `docs/HACKATHON_DELTA.md`, git history.

### Did you use AI tools?

Yes. As the README says: DRAW was built with AI-assisted tools (Claude Code) for code, tests and documentation. The author directed the work and is responsible for all of it.

### Can judges hold their own key on DevNet?

No. The shared node doesn't let team logins allocate parties that hold their own keys. Anyone who runs DRAW on LocalNet can: each person creates a key in the browser and signs every action. A judge with a HackCanton login, whose party is onboarded in the node's Canton Coin wallet, can join the live demo as an LP with that login instead and pay from that wallet. The node still holds that party's key.

Backed by: [non-custodial] limits, [signed-in-lp].

## Numbers to have ready

| Number | Network | Source |
|---|---|---|
| 82 of 82 checks, package 0.3.0, the seats on the backend client and the read-back on a client of its own | DevNet | `evidence/devnet/runs/20261006T131900Z/result.json` |
| $750,000 funded, $250,000 unresolved (75 CC and 25 CC) | DevNet, scenario dollars | `evidence/devnet/runs/20261006T131900Z/totals.json` |
| 14 of 14 checks per receipt | DevNet and LocalNet | receipts in the runs |
| 6.8 s for LP A and 4.5 s for LP B, settlement record time to the read-back receipt, the verifier's clock against the ledger's | DevNet, the shared-login run | `receipt-lpA.json`, `receipt-lpB.json` in `evidence/devnet/runs/20261006T091531Z` |
| 7 of 7 payment request checks, each LP's call reaching it as a CIP-0056 AllocationRequest | DevNet | the `wallet` checks in the same `result.json` |
| 10 of 10 steps, live-site browser journey with a demo fund per browser, the seats on the backend client | DevNet | `evidence/devnet/browser/web-journey-20261006132858/result.json` |
| 7 of 7 and 9 of 9 steps, an LP signed in with HackCanton paying from its own Canton wallet, from DRAW and with Accept in the node's wallet | DevNet, with the team's own login as the LP, the server on the backend client | `evidence/devnet/browser/web-hackcanton-20261006132613/result.json`, `evidence/devnet/browser/web-hackcanton-wallet-20261006132730/result.json` |
| 76 of 76 checks, each party signing with its own key | LocalNet | `evidence/local/runs/20261004T183146Z/result.json` |
| 100 of 100 seeded calls, 191 notices | LocalNet | `evidence/local/campaign/20261002T193724Z/result.json` |
| 4 of 5 attacks through a database, 0 through DRAW | LocalNet | `evidence/local/ablation/20261002T193830Z/result.json` |
| 15 of 15 broken guards caught, package 0.3.0 | Daml Script | `evidence/local/mutation/20261006T081625Z/result.json` |
| 1,047 ms, payment locked to verified funded | LocalNet, scripted, one machine, not production latency | `evidence/local/workload/20261002T185353Z/result.json` |

## Never say

MainNet, real money, or settlement in USDCx. Customers, pilots, partners or letters of intent. A second person's login on DevNet: every sign-in run used the team's own login as the LP. LP-held keys on DevNet. That payments are hidden from the network. That the server holds no credentials: it holds the backend client for every demo seat. A scheduler, partial payments, notifications or KYC. That judges can hold their own key on DevNet. That any Canton wallet can pay a DRAW request: the node's own Canton Coin wallet did, for a party on the fund's node. "Independent" or "read-only" for the DevNet read-back.
