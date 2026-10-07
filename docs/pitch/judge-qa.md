# Judge Q&A

The question bank for whoever presents DRAW: the deck's speaker notes, the async judging window and a possible live final. Judges can read it as a short FAQ. Each answer stays inside [claims.yaml](../../claims.yaml) and says what backs it. Claim ids from claims.yaml are in square brackets, for example [devnet]. Answers marked as design describe how the Daml model or the app works, with no claims.yaml entry of their own.

Labels, word for word, for anything shown on screen or said about a run:

- DevNet: "DevNet, HackCanton shared node. DRAW's backend login signs for every demo seat, and a different login reads each settlement back." It has been the live site's network note since about 13:00 UTC on 2026-10-07.
- DevNet, for the run in which each party signs with its own key: "DevNet, HackCanton shared node. Each party signs with its own key. All five keys sat on the machine that ran the script."
- Asset: "Settles in Canton Coin from the DevNet faucet. Dollar figures are the scenario."
- LocalNet, for the custody run and the browser-key journey: "LocalNet. Each party signs with its own key."
- LocalNet, for the other runs: "LocalNet, a separate ledger login per party."
- Production asset: "Uses the Token Standard allocation interface, which the USDCx registry supports. Not run with USDCx."
- Sign-in: "The LP here is signed in with the team's own HackCanton login."

## The product

### What does DRAW do?

Private capital calls on Canton. Each LP reads and pays only its own notice, and the fund counts the money as deployable only after a read-back step confirms the settlement on the ledger. DRAW runs one capital-call workflow end to end: issue the call, a private notice per LP, payment, settlement, the read-back, and an explicit list of what's unresolved. It isn't fund accounting, NAV, KYC, a secondary market, a lending product or an audit console. We built it for the fund COO or operations lead at an emerging manager, meaning a newer, smaller fund manager, and for the outsourced administrator who runs calls for several of them. That they're the people who feel this problem most is our hypothesis.

Backed by: [PRODUCT.md](../PRODUCT.md), [BUSINESS_BRIEF.md](../BUSINESS_BRIEF.md).

### What is a capital call?

An LP commits money to a fund up front, and the fund draws it in parts when it needs it, by sending each LP a notice for its share with a due date. It's also called a drawdown. Going by public process descriptions, the notice goes out by email today, the LP pays by wire, and the fund's operations team matches wires to LPs before it counts the money as in. At least one fund administration vendor matches payments in batches from bank exports the client provides.

Backed by: sources 9 to 11 in [PROBLEM_EVIDENCE.md](../PROBLEM_EVIDENCE.md). The call step by step in DRAW is in [PRODUCT.md](../PRODUCT.md#a-capital-call-step-by-step).

### What does an LP need to pay through DRAW?

Four things. A Canton party, hosted by itself or by a provider it trusts. Holdings in the settlement asset: today Canton Coin from the DevNet faucet, or Amulet on LocalNet, and for a real pilot an asset the fund and its LPs already accept, such as a tokenized dollar. To accept its commitment on the ledger once. And a wallet or participant whose validator has vetted DRAW's package, because every participant that confirms a DRAW transaction must have vetted it. Today that means the node's own Canton Coin wallet for a party on the fund's node (DevNet, with the team's own login), a key of its own for a party the node operator allocates on the fund's node (DevNet, one scripted run, with every party's key on the machine that ran it), or on LocalNet a key in the LP's browser, with its party on LocalNet's LP participant, which hosts every LP there.

Backed by: [signed-in-lp], [non-custodial], [devnet-own-keys], [PRODUCT.md](../PRODUCT.md#what-the-lp-needs), Canton docs on package vetting by confirming participants.

### What about LPs who pay by wire?

Nothing in DRAW can mark a wire-paid notice funded, because the settle choice, `Obligation_Settle`, is the only path to Funded. That notice stays unresolved, or the fund sends it to review with a note, which is what the first pilot stage does, and it never counts as deployable. A fund whose LPs all wire still gets private notices and the unresolved list. Funding that follows the money needs LPs who pay on Canton, and that's the real cold-start cost. Turning tokenized dollars into a bank wire to invest isn't covered.

Backed by: design. [PRODUCT.md](../PRODUCT.md#lps-who-pay-by-wire), [FIRST_UNIT_VALUE.md](../FIRST_UNIT_VALUE.md), stage 1 of [PILOT_PLAN.md](../PILOT_PLAN.md).

### What does an LP agree to when it accepts its commitment?

The fund invites each LP with a committed amount, and the LP accepts once. Accepting makes the LP a co-signer of every later notice from that fund. The co-signature gives settlement the LP authority it needs, and the model uses it only inside `Obligation_Settle`, after every check passes, and only on an allocation the LP itself created. So the LP doesn't sign each call, and the ledger refuses a call above the LP's remaining commitment with "call exceeds remaining commitment". On the live site the demo seats accept through DRAW's backend login, and a signed-in LP accepts with its own HackCanton login. In the demo the commitments come from the demo setup. There's no onboarding, KYC or document flow.

Backed by: design. `test_authority` in the [Daml tests](../../evidence/local/daml_core/20261006T081605Z/result.json), D-005 in [DECISIONS.md](../DECISIONS.md).

### What if an LP pays $25 short because of a bank fee?

Through DRAW, only the exact amount settles. The ledger refuses a short payment with "allocation amount does not equal amount due", and the LP sees that its payment doesn't match, withdraws it and pays the exact amount. Partial payments aren't built. A wire paid outside DRAW can't fund a notice at all, as the answer on wires says.

Backed by: [negative-settlement] for LocalNet and Daml Script, [devnet-own-keys] for the wrong-amount check in [the external-party DevNet run](../../evidence/devnet/runs/20261007T130259Z/result.json), [LIMITATIONS.md](../LIMITATIONS.md).

## The asset and the network

### Why would an LP pay a capital call in Canton Coin?

It wouldn't. Canton Coin is the DevNet test asset, because it's what the test network has. A fund would call capital in a tokenized dollar. USDCx represents USDC deposited into Circle's xReserve, is a CIP-0056 token documented for TestNet and MainNet, and its MainNet registry metadata lists `splice-api-token-allocation-v1`, the allocation API DRAW settles through. The line to use is the production asset label: "Uses the Token Standard allocation interface, which the USDCx registry supports. Not run with USDCx."

Backed by: [settlement-gates-funded] limits. USDCx registry metadata: https://api.utilities.digitalasset.com/api/token-standard/v0/registrars/decentralized-usdc-interchain-rep::12208115f1e168dd7e792320be9c4ca720c751a02a3053c7606e1c1cd3dad9bf60ef/registry/metadata/v1/info

### Is any of this on MainNet, or real money?

No. It runs on the HackCanton DevNet node and on LocalNet, and no real money moves. Canton Coin from the DevNet faucet and Amulet on LocalNet have no monetary value. TestNet and MainNet need Tokenomics Committee approval, an allowlisted IP and an onboarding secret from a Super Validator sponsor. In our plan that comes after a shadow pilot.

Backed by: [devnet], Canton onboarding process docs.

### What does it cost to run on Canton?

We haven't measured traffic cost per transaction on DevNet or MainNet, so there's no cost per call yet. What we have: the canonical call with three LPs took 15 ledger transactions including setup, and 1 of them issued the call to all three LPs (LocalNet workload run). CIP-0078 eliminated transfer and lock fees for Canton Coin. Traffic and holding fees remain.

Backed by: [real-token-settlement], [WORKLOAD_ECONOMICS.md](../WORKLOAD_ECONOMICS.md), [the workload run](../../evidence/local/workload/20261002T185353Z/result.json), Canton Coin tokenomics docs.

## Privacy

### Isn't the privacy just your server choosing which party to show?

No. A query made as LP B returns nothing of LP A's, even when it asks for LP A's notice by contract id. On LocalNet each party has its own login, or its own key, with the same result, so a missing filter in a read path that runs as LP A can't leak LP B's notice. On DevNet the demo seats share one backend client that the node operator issued for DRAW, so the app picks which party to read as. In the DevNet run in which each party signs with its own key, one login still read for every party, so LP-from-LP credential separation is shown on LocalNet only. What DevNet shows is party-scoped reads and transaction streams: each party's own stream held only its own records, and no party received an event about another party's records. An LP that signs in with its own HackCanton login reads its notices from the ledger in its own browser with its own token, so the server isn't choosing anything for it. Our runs of that used the team's own login as the LP.

Backed by: [private-obligations], [non-custodial], [devnet], [devnet-own-keys] ([streams.json](../../evidence/devnet/runs/20261007T130259Z/streams.json) and the check "lpA cannot fetch lpB obligation by contract id"), [signed-in-lp].

### Can the fund manager see every LP?

Yes, by design. The fund is a party to every notice, so it sees every LP's notice and payment. The node operator can also read every party it hosts. DRAW keeps LPs from seeing each other. It doesn't hide LPs from their own fund.

Backed by: "What a database does just as well" in [CANTON_ABLATION.md](../CANTON_ABLATION.md), [private-obligations] limits.

### Is the payment private?

The notice is a contract between the fund and that LP that no other LP or unrelated party can read, though the operator of the node that hosts them can. Per the Splice Scan API docs, the Canton Coin leg of each payment appears in Scan with its random reference and the party ids, whose hints such as `draw-lpa` are readable, and the notices don't. We inferred this from the docs and haven't checked it against Scan. Per the Splice token design, the token registry operator, the DSO, is also a stakeholder of each allocation and so sees its reference, which is random and names no one. No run has read the DSO's view. Opaque party ids for new parties are on the roadmap and not built.

Backed by: [devnet] limits, [LIMITATIONS.md](../LIMITATIONS.md).

### Why not a public chain with USDC?

On a public chain every participant, other LPs included, would get each LP's address, which ties together all of that LP's calls, with its amount due, commitment share, due date and paid or overdue state, plus the settlement holdings. That's the LP book, and DRAW's per-LP contracts exist to keep it private. We read those fields off DRAW's own contract and didn't run that comparison. The comparison we did run is on LocalNet: the same call on a database with a paid flag let 4 of 5 attacks through, and DRAW let none through. The database attacker had write access, as an operator or a compromised app server would.

Backed by: [canton-load-bearing], [the ablation run](../../evidence/local/ablation/20261002T193830Z/result.json), [CANTON_ABLATION.md](../CANTON_ABLATION.md).

### Why should a fund trust your node operator?

In a pilot it shouldn't have to. Today every party on DevNet sits on one participant, and on LocalNet every LP does, so that operator can read them all. Production needs each LP on its own validator or with a provider it trusts. A key held by the LP removes the node's ability to sign for it, but the hosting node still validates and confirms.

Backed by: [private-obligations] limits, [non-custodial] limits, [devnet-own-keys].

## Keys and settlement

### Who holds the keys?

On the live site, the node holds every party's key. DRAW's server acts for the five demo seats through a backend client the node operator issued for DRAW, which the node reports can act for those five parties and nothing else. An LP that signs in with HackCanton acts with its own login, which DRAW's server never receives, and nothing the server holds can act for that LP's party. On LocalNet each party can hold its own key: the participant prepares each transaction, the party's key signs it, and the participant can't act for the party without that signature. Another party's key is refused, and the run passed 76 of 76 checks. In the LocalNet browser demo each person creates a key in the browser and backs it up.

On DevNet one scripted run had every party sign the same way. The node operator allocated its five external parties, the fund, three LPs and an unrelated party, on 2026-10-07 from onboarding transactions DRAW generated and signed. Each party signed its own transactions with its own Ed25519 key. The run's login was refused when it tried to act for LP A without LP A's key, LP B's key was refused when it tried to sign for LP A, and the run passed 83 of 83 checks. All five keys sat on the machine that ran the script, so the run shows the ledger needs each party's signature. It doesn't show that separate people held the keys. One login, the team's own, submitted for every party and read each settlement back. The live site doesn't use these parties.

Backed by: [non-custodial] ([the custody run](../../evidence/local/runs/20261004T183146Z/result.json)), [devnet-own-keys] ([the external-party run](../../evidence/devnet/runs/20261007T130259Z/result.json)), [devnet], and [the probe of the NODERS clients](../../evidence/devnet/probes/20261007T125624Z/result.json) for the backend client's rights.

### Is the read-back login separate from the seats?

In the scripted DevNet run on the demo seats, yes. It used a verifier client the node operator issued for DRAW, a different ledger user from the seats. The run tried to submit as the fund with it and the ledger refused, and each receipt records that the read-back ran as that client's own user. The node reports that client can only read as the fund. An earlier probe found it could also act and read as the team's personal wallet party, and the operator removed that on 2026-10-07. The live site has read back on that client since about 13:00 UTC on 2026-10-07. Before that it read with the backend login, the same credential as the seats. In the DevNet run in which each party signs with its own key, the read-back used the team's own login, the one that submitted for every party, because the verifier client can read only as the regular fund party, not the external one. On LocalNet the read-back is a read-only login that can't submit. Everywhere, the read-back step runs in the same process as the submitter, so we never call it independent.

Backed by: [devnet] ([the demo-seat run](../../evidence/devnet/runs/20261007T125638Z/result.json), `credentialSeparation: VERIFIER_ONLY`), [the probe](../../evidence/devnet/probes/20261007T125624Z/result.json) and [the earlier probe](../../evidence/devnet/probes/20261006T133219Z/result.json), [devnet-own-keys] limits, [real-token-settlement].

### How do you know a settlement actually happened?

A read-back step reads the settlement and the fund's holdings from the ledger and runs 14 checks. Among them: the update exercises `Obligation_Settle`, the same transaction executes and consumes the referenced allocation, the fund's received holdings are active, owned by the fund and in the expected instrument, the received amount equals the amount due, and the payer is the LP that owed it. Only a receipt that passes all 14 counts as verified funded, and only then does the dashboard count the money as deployable. On LocalNet that step runs as a read-only login that can't submit. On DevNet, in the scripted run on the demo seats and on the live site since about 13:00 UTC on 2026-10-07, it runs on a client of its own that can only read as the fund. The answer above covers the runs that read back another way. Since package 0.3.0 a fund can also name a verifier party that reads the fund, every call and every obligation, and the ledger refuses it when it tries to act. That has run in Daml Script only.

Backed by: [devnet], [real-token-settlement], [verifier-party], "Reading a receipt" in [PROOF.md](../PROOF.md#reading-a-receipt).

### What happens when an LP pays the wrong amount?

The ledger won't settle it, so it never counts. The app gives the fund no Settle button for it, and when the scripted DevNet runs tried anyway, the ledger refused with "allocation amount does not equal amount due". The LP sees that its payment doesn't match, withdraws it and pays the exact amount. A wrong payer and a wrong reference are refused the same way, and a payment can't be replayed, because a settled allocation is consumed.

Backed by: [negative-settlement] for LocalNet and Daml Script, and on DevNet [devnet-own-keys] and [devnet], the `negative` checks in [the external-party run](../../evidence/devnet/runs/20261007T130259Z/result.json) and [the demo-seat run](../../evidence/devnet/runs/20261007T125638Z/result.json), [LIMITATIONS.md](../LIMITATIONS.md).

### What if an LP doesn't pay?

It stays unresolved. Before the due time the ledger refuses to mark it overdue, with "obligation is not yet due". After it, the fund can, with a click. There's no scheduler, so a person marks it overdue. The fund can also send a notice to review with a note, reopen a reviewed one, or waive an overdue or reviewed one with a note, and a waived notice leaves the unresolved total. A late payment still settles, as 26 late payments did in the LocalNet campaign, and the settlement records that it was paid after the due time, which is checked in Daml Script.

Backed by: [unpaid-unresolved], [devnet]. Review, reopen and waive are design, tested in `test_review_paths` in the [Daml tests](../../evidence/local/daml_core/20261006T081605Z/result.json). Late payment: the `late-pay` cases in the [campaign](../../evidence/local/campaign/20261002T193724Z/result.json) ([generalization]) and `test_resolution_paths` in the same Daml tests.

### Why does the fund click Settle by hand?

It's the default. Automatic settlement of exact matches is written behind `DRAW_AUTO_SETTLE=true` and goes through the same settle and read-back path, but it hasn't run against a ledger, so we don't claim it.

Backed by: [LIMITATIONS.md](../LIMITATIONS.md).

### Can LPs pay from the Canton wallet they already use?

On the HackCanton node, yes, if the wallet is on that node. Each LP's call reaches it as a CIP-0056 AllocationRequest, the Token Standard interface an app uses to ask a user for an allocation. An LP with a HackCanton login signs in on the node's Keycloak, and the node's Canton Coin wallet lists the capital call under Allocations with Accept and Reject. Pressing Accept locked the coin for the fund, the fund manager settled, and the LP's notice showed verified funded. The LP can also pay from DRAW, which asks its wallet to fund the request through the same wallet API call. DRAW's server never receives the LP's token.

Two limits. Every run signed in with the team's own login as the LP. In the newest runs nothing the server held could act for that party, but it's still the same person on both sides, so a second person's login is still to show. The node operator created two more HackCanton logins on 2026-10-07, for a teammate and for judges, and no run has used them yet. And the LP's wallet party sits on the same node as the fund, which has DRAW's package. Every participant that confirms a DRAW transaction must have vetted DRAW's package, and the LP co-signs its notice, so a wallet on another validator would need DRAW's package vetted there first.

Backed by: [signed-in-lp] ([the wallet run](../../evidence/devnet/browser/web-hackcanton-wallet-20261007130229/result.json), [the run paying from DRAW](../../evidence/devnet/browser/web-hackcanton-20261007130106/result.json), and earlier runs), [wallet-request], Canton docs on package vetting by confirming participants.

### What stops a fake DRAW notice?

A DRAW notice is a contract signed by the fund's party, and only a payment to that party can fund it, so there are no emailed wire details on it to swap. That's a design property with three limits. It depends on the LP knowing the fund's real party, and DRAW doesn't build that onboarding. DRAW can't stop someone emailing an LP fake wire instructions outside DRAW. And no run has tested a fake-notice attack.

Backed by: [settlement-gates-funded] ("to the fund admin") for the payment side. The rest is design.

## Product and market

### Fund software already handles capital calls. What's new?

Existing tools issue notices and match bank payments to LPs, and at least one fund administration vendor matches them in batches from bank exports the client provides. In DRAW the payment carries the notice's reference, and the notice turns funded in the same transaction that moves the money. For payments made through DRAW, the ledger check replaces off-ledger matching. A payment that doesn't match exactly is refused, so it can't fund a notice by mistake, and when a payment comes from the wrong party the fund sends that notice to review with a note. The ledger itself keeps each LP from reading another LP's notice. Whether this means less matching work for a real fund is a hypothesis, and wires paid outside DRAW still need matching.

Backed by: sources 10 to 12 in [PROBLEM_EVIDENCE.md](../PROBLEM_EVIDENCE.md), [settlement-gates-funded], [negative-settlement].

### Who's it for?

We built DRAW for the fund COO or operations lead at an emerging manager, the person who has to say what's actually been funded, and for the outsourced administrator who runs calls for several emerging managers, since one relationship reaches several funds. Their question, which the dashboard opens on: "How much of this capital call is deployable right now, and what amount remains unresolved?" That this is their question, and that they'd change tools to answer it, is our hypothesis. We haven't set an LP-count band. The interviews will record LPs per fund and calls per year, and we'll band from what they show.

Backed by: [BUSINESS_BRIEF.md](../BUSINESS_BRIEF.md), [PRODUCT.md](../PRODUCT.md), [icp.md](materials/icp.md).

### Who pays for DRAW?

Our hypothesis: the manager pays a per-fund subscription, for a deployable figure tied to verified settlement and an explicit unresolved list. An administrator pays per call, for less matching work across its clients. When an administrator runs the call, the user and the payer differ. No pricing conversation has happened and no price is set. As of 2026-10-07 no interview has been held either, so we can't yet say what funds pay for administration today. Each interview will ask.

Backed by: [BUSINESS_BRIEF.md](../BUSINESS_BRIEF.md), [gtm.md](materials/gtm.md).

### Have you talked to people who run capital calls?

Not yet. As of 2026-10-07, 0 conversations and 0 usability tests are on file. The problem evidence is 12 public sources. 2 argue against, and 3 show fiat tools already handle notices and matching. The two against say LP defaults are rare, so we lead with telling late from funded. Next come 3 to 5 twenty-minute conversations with fund COOs, ops leads, administrators or LPs, and 2 to 3 usability tests on the live site, with results written only from notes.

Backed by: [PROBLEM_EVIDENCE.md](../PROBLEM_EVIDENCE.md), [metrics.md](materials/metrics.md).

### What's missing for production?

Sign-in for every seat, so our server holds no seat's credentials. An LP can already sign in with its own HackCanton login on DevNet, and the fund manager can't yet. USDCx on TestNet and then MainNet, which needs Tokenomics Committee approval and a Super Validator sponsor. Each LP on its own validator or a provider it trusts. Keys held by the parties themselves, since the DevNet run in which each party signs with its own key kept all five keys on one machine. Onboarding and KYC. Export to the administrator's system. A scheduler for overdue. Legal review of paying calls in a tokenized asset.

Backed by: stage 3 of [PILOT_PLAN.md](../PILOT_PLAN.md), [SECURITY.md](../SECURITY.md), [LIMITATIONS.md](../LIMITATIONS.md).

### Does it scale?

Not shown at production size. On LocalNet we ran 100 seeded calls with 191 notices in 238 seconds: 0 false fundings, 0 privacy violations, 0 replays accepted, 0 total mismatches. Issuing a three-LP call took 1 transaction. Campaign cases called at most three LPs, on one machine, so this isn't a production figure, and large calls haven't been tested against transaction size limits.

Backed by: [generalization], [the campaign run](../../evidence/local/campaign/20261002T193724Z/result.json), [WORKLOAD_ECONOMICS.md](../WORKLOAD_ECONOMICS.md).

## The build

### What did you build during the hackathon?

All of it, from scratch during HackCanton Season 3. The first commit is 36069bc on 2026-10-01, inside the build period of 2026-09-18 to 2026-10-09. The Daml model, scripts, app and docs were written during the event. Every result file, receipt and log in the evidence folder was written by a script, and failed runs are kept with a short note. [evidence/manifest.json](../../evidence/manifest.json) lists every run with file hashes.

Backed by: [HACKATHON_DELTA.md](../HACKATHON_DELTA.md), git history, and [GATES.md](../GATES.md#failed-and-aborted-runs) for the failed runs.

### Who built it?

A single author, from scratch. In the README's words: DRAW was built with AI-assisted tools (Claude Code) for code, tests and documentation. The author directed the work and is responsible for all of it. The product itself has no AI features. [CLAUDE.md](../../CLAUDE.md) holds the rules the coding assistant worked under, public as part of that disclosure.

Backed by: [HACKATHON_DELTA.md](../HACKATHON_DELTA.md), git history.

### What if the live demo is busy?

By default the site starts at most 3 new demo funds per visitor per hour and 20 overall. Actions from every demo fund run one at a time through one queue, and when the shared demo parties near their record ceiling, the site answers "The demo is full right now" instead of breaking. If it can't start a fund, the proof page, https://drawcalls.xyz/proof, shows the newest run of the same journey step by step with screenshots, and needs no access code. Reading needs no code either, on the proof page and on every seat of a demo fund the browser has already started. Every action, starting with "Create the demo fund", needs the demo access code. The site doesn't print it yet, and it goes public on submission day, 2026-10-09.

Backed by: [DEPLOY.md](../DEPLOY.md#demo-limits-and-capacity), [the newest live-site journey](../../evidence/devnet/browser/web-journey-20261007205208/result.json), [demo.md](materials/demo.md).

### Can judges hold their own key on DevNet?

No. The shared node doesn't let team logins allocate parties that hold their own keys, and our own allocate call got HTTP 403. For one scripted run the node operator allocated five such parties for us, with all five keys on the machine that ran it, and the live site doesn't use them. Anyone who runs DRAW on LocalNet can: each person creates a key in the browser and signs every action. A judge with a HackCanton login, whose party is onboarded in the node's Canton Coin wallet, can join the live demo as an LP with that login instead and pay from that wallet. The node still holds that party's key. The node operator created a HackCanton login for judges on 2026-10-07, which needs a first-login setup. No run has used a login other than the team's own, and joining needs the demo access code.

Backed by: [non-custodial] limits, [devnet-own-keys] limits, [signed-in-lp].

## Numbers to have ready

| Number | Network | Source |
|---|---|---|
| 83 of 83 checks, package 0.3.0, five external parties each signing its own transactions with its own key, plus 2 checks skipped with their reasons recorded. All five keys sat on the machine that ran the script, and one login, the team's own, submitted for every party and read each settlement back | DevNet | [external-party run](../../evidence/devnet/runs/20261007T130259Z/result.json) |
| 82 of 82 checks, package 0.3.0, plus 1 credential check skipped with its reason recorded, the seats on the backend client and the read-back on a client of its own that can only read as the fund | DevNet | [demo-seat run](../../evidence/devnet/runs/20261007T125638Z/result.json) |
| $750,000 deployable and $250,000 unresolved: LP A's 40 CC and LP B's 35 CC settled, LP C's 25 CC overdue, and the fund received exactly 75 CC | DevNet, scenario dollars | [totals.json](../../evidence/devnet/runs/20261007T130259Z/totals.json), the same in both runs |
| 14 of 14 checks per receipt | DevNet and LocalNet | [DevNet receipt](../../evidence/devnet/runs/20261007T130259Z/receipt-lpA.json), [LocalNet receipt](../../evidence/local/runs/20261001T162427Z/receipt-lpA.json) |
| 5.0 s for LP A and 5.3 s for LP B in the external-party run, and 7.5 s and 5.2 s in the demo-seat run, settlement record time to the read-back receipt, the read-back's clock against the ledger's | DevNet, one run each | external-party [receipt-lpA.json](../../evidence/devnet/runs/20261007T130259Z/receipt-lpA.json) and [receipt-lpB.json](../../evidence/devnet/runs/20261007T130259Z/receipt-lpB.json), demo-seat [receipt-lpA.json](../../evidence/devnet/runs/20261007T125638Z/receipt-lpA.json) and [receipt-lpB.json](../../evidence/devnet/runs/20261007T125638Z/receipt-lpB.json) |
| 7 of 7 payment request checks, each LP's call reaching it as a CIP-0056 AllocationRequest, and LP A's own key signing its allocation from it in the external-party run | DevNet | the `wallet` checks in the [external-party run](../../evidence/devnet/runs/20261007T130259Z/result.json) |
| 10 of 10 steps, live-site browser journey with a demo fund per browser, the seats on the backend client and the read-back on a client of its own | DevNet | [live-site journey](../../evidence/devnet/browser/web-journey-20261007130359/result.json) |
| 7 of 7 and 9 of 9 steps, an LP signed in with HackCanton paying from its own Canton wallet, from DRAW and with Accept in the node's wallet | DevNet, with the team's own login as the LP, the seats on the backend client and the read-back on a client of its own | [paid from DRAW](../../evidence/devnet/browser/web-hackcanton-20261007130106/result.json), [Accept in the wallet](../../evidence/devnet/browser/web-hackcanton-wallet-20261007130229/result.json) |
| 76 of 76 checks, each party signing with its own key | LocalNet | [custody run](../../evidence/local/runs/20261004T183146Z/result.json) |
| 100 of 100 seeded calls, 191 notices, 0 false fundings, 0 privacy violations, 0 replays accepted, 0 total mismatches | LocalNet | [campaign](../../evidence/local/campaign/20261002T193724Z/result.json) |
| 4 of 5 attacks through a database whose attacker had write access, 0 of 5 through DRAW | LocalNet | [ablation](../../evidence/local/ablation/20261002T193830Z/result.json) |
| 15 of 15 broken guards caught, package 0.3.0 | Daml Script | [mutation run](../../evidence/local/mutation/20261006T081625Z/result.json) |
| 1,047 ms (LP A) and 1,037 ms (LP B), payment locked to verified funded | LocalNet, scripted, one machine, not production latency | [workload run](../../evidence/local/workload/20261002T185353Z/result.json) |
| 15 ledger transactions for the three-LP call including setup, 1 of them to issue it | LocalNet | the same workload run |
| 12 public sources: 2 against, 3 showing fiat tools already handle notices and matching. 0 conversations and 0 usability tests | Public sources, as of 2026-10-07 | [PROBLEM_EVIDENCE.md](../PROBLEM_EVIDENCE.md) |

Package 0.3.0 has run only in Daml Script and on DevNet. Every LocalNet number comes from package 0.2.0 or earlier. Canton Coin and Amulet have no monetary value, and the dollar figures are the scenario.

## Never say

- MainNet, real money, or settlement in USDCx.
- Customers, pilots, partners or letters of intent.
- A second person's login on DevNet. Every sign-in run used the team's own login as the LP.
- That separate people held the parties' keys on DevNet. In the run in which each party signs with its own key, all five keys sat on the machine that ran the script.
- That payments are hidden from the network. Per the Splice Scan API docs, the Canton Coin leg of each payment appears in Scan.
- That the server holds no credentials. It holds the backend client for every demo seat.
- A scheduler, partial payments, notifications or KYC.
- That judges can hold their own key on DevNet.
- That any Canton wallet can pay a DRAW request. The node's own Canton Coin wallet did, for a party on the fund's node.
- "Independent" for the read-back on any network, since it runs in the same process as the submitter.
- That every DevNet read-back only reads. In the run in which each party signs with its own key, it used the login that submitted for every party.
- That only the LP and the fund can read a notice. The node operator can read every party it hosts.
- That the notice and the payment are one record. They're two contracts, settled in one transaction.
- That DRAW removes the matching work. For payments made through DRAW, the ledger check replaces off-ledger matching, and wires outside DRAW still need matching.
- A market size, an LP-count band, hours saved or a cost per call.
- A quote from a conversation without the person's permission.
