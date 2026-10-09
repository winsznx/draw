# Submission

This hackathon process record holds the draft answers for the HackCanton project page, the links, the six materials and the compliance checklist, updated 2026-10-09. The product is in the [README](../README.md) and [PRODUCT.md](PRODUCT.md), and the proof in [PROOF.md](PROOF.md). Every answer stays inside [claims.yaml](../claims.yaml), and DevNet and LocalNet facts stay apart. HackCanton runs on AppsFactory, whose project dashboard gates a submission on Mana, the platform's points, which an account earns through daily activity and burns toward a project.

## Answers

Project name: DRAW

Track: Track 3, Investment Infrastructure: Funds, DAOs & Governance Tools, confirmed by the owner on 2026-10-07. Its wishlist asks for "A Daml workflow for the full lifecycle of private fund subscriptions, capital calls, distributions and redemptions", and DRAW covers the capital-call part. Fallback: Track 1, Real-World Assets (RWA) & Business Workflows.

One-line description: Private capital calls on Canton. Each LP reads and pays only its own notice, and the fund counts the money as deployable only after a read-back step confirms the settlement on the ledger.

Problem: When a fund calls capital, each LP gets a notice for its share and pays by wire. Our hypothesis, from 12 public sources: fund software attributes the wires to LPs, at least one administrator in batches from a bank export the client provides, and partial, split and wrong-name payments are worked by hand. One vendor guide advises counting money only once it has cleared, and Luxembourg's Financial Intelligence Unit reports scams using fake capital call notices, which funds fight with procedures. 2 of the sources argue against, and 3 show fiat tools already handle notices and matching. No conversation with someone who runs capital calls has happened yet.

Solution: DRAW issues one notice per LP on Canton, a contract between the fund and that LP that no other LP or unrelated party can read, though the operator of the node that hosts them can. The LP pays with a Token Standard allocation that locks the exact amount. The payment carries the notice's reference, and the notice turns funded in the same transaction that moves the money, once the ledger has checked the reference, payer, amount and asset. A read-back step confirms each settlement before the dashboard counts it as deployable. Notices that aren't paid stay on an explicit unresolved list: overdue, in review, or waived with a note.

Target customer: Our hypothesis is the fund COO or operations lead at an emerging manager, reached first through an outsourced fund administrator who runs calls for several managers. Nobody has agreed to a pilot.

Business model: A hypothesis. Managers would pay a subscription per fund, and administrators a price per call. No pricing conversation has happened and no price is set.

Why Canton: On LocalNet we ran the same call on an operator database with a paid flag and role filtering in the app, and tried five attacks on both. Four got through the database (marking an unpaid LP funded, reading another LP's notice, reusing a payment, counting a payment row as money) and none got through DRAW. The database attacker had write access, as an operator or a compromised app server would. On Canton, privacy sits below the app, funded follows the money, and a settled payment can't be reused.

Technical architecture: Daml package `draw` 0.3.0, with Fund, CapitalCall, InvestorCommitment, CapitalCallObligation, and a PaymentRequest per LP that implements the CIP-0056 AllocationRequest interface. Settlement goes through CIP-0056 Allocation V1 and the Splice token registry. A Node API runs on a VPS and a Next.js web app on Cloudflare Workers. An LP with its own HackCanton login can sign in from the browser, read its notices and pay from its own Canton wallet with its own token, and DRAW's server never receives that token. Who signs for each party on each network is in [ARCHITECTURE.md](ARCHITECTURE.md) and [LIMITATIONS.md](LIMITATIONS.md).

Working demo: Live at https://drawcalls.xyz. DevNet, HackCanton shared node. DRAW's backend login signs for every demo seat, and a different login reads each settlement back. Settles in Canton Coin from the DevNet faucet. Dollar figures are the scenario. On the same node, in [a scripted run](../evidence/devnet/runs/20261007T130259Z) on package 0.3.0, five parties each signed their own transactions with their own key, and 83 of 83 checks passed, with two credential checks skipped and their reasons recorded. All five keys sat on the machine that ran the script. One login, the team's own, submitted for every party and read each settlement back, but the ledger refused it when it tried to act for LP A without LP A's key. [The scripted run on the live site's setup](../evidence/devnet/runs/20261007T125638Z) passed 82 of 82, plus one credential check skipped. On the live site an LP can also sign in with its own HackCanton login and pay from its own Canton wallet, and every run of that but the newest used the team's personal login as the LP. The newest signed in with a second login NODERS created for the team, whose party is not the team's personal party. The team ran it too, so no outside LP has used DRAW. On LocalNet, in a run where each party signs with its own key, 76 of 76 checks passed, and with a separate ledger login per party 100 seeded calls ran with 0 false fundings and 0 privacy violations. The proof is in [PROOF.md](PROOF.md) and the limits in [LIMITATIONS.md](LIMITATIONS.md).

AI use: DRAW was built with AI-assisted tools (Claude Code) for code, tests and documentation. The author directed the work and is responsible for all of it.

Pilot plan: Shadow one real call with no money moving, then a small test settlement with two or three LPs, then the integrations a real pilot needs ([PILOT_PLAN.md](PILOT_PLAN.md)). Nobody has agreed to a pilot yet.

Post-hackathon plan: Conversations and usability tests first, then the shadow pilot of one real call. On DevNet, a sign-in run with a second person's login, LP keys held by separate people instead of on one machine, and demo seats on the live site that sign with their own keys. The first two need a second person. Sign-in for every seat, the fund manager included. Automatic settlement on a matching payment. TestNet with USDCx, which needs Tokenomics Committee approval, then MainNet. Export to the administrator's system, and a scheduler for overdue.

## Links

| Item | Status on 2026-10-09 |
|---|---|
| Live demo, DevNet | https://drawcalls.xyz |
| Proof page | https://drawcalls.xyz/proof |
| Repository | https://github.com/winsznx/draw, public since 2026-10-09, Apache-2.0 |
| Demo video | https://youtu.be/F4atPdV72M8, 4:30: the pitch, the live demo on DevNet, then the results and the ask |
| Deck | v2, rebuilt on 2026-10-08 as 11 statement-led slides from [deck.html](pitch/deck.html): one idea per slide, the run ids and file paths moved to the proof page, the limits kept in short lines and checked against [claims.yaml](../claims.yaml). Re-exported on 2026-10-09 with the video and code links on slide 11, and used in the video: [DRAW-deck.pdf](pitch/DRAW-deck.pdf) |
| Demo access code | `dda6f17bcea06d14`, public since 2026-10-09 as the owner decided on 2026-10-07. `DRAW_ACCESS_CODE_PUBLIC=true` is set on the API, so the site prints it and the access dialog fills it in |

## The six materials

The project dashboard asks for six uploads: Value, ICP, Metrics, GTM, Demo and Pitch. Each matches one judging criterion. Drafts of all six are in [docs/pitch/materials/](pitch/materials) and haven't been reviewed yet.

| Material | Criterion | What judges look for | File |
|---|---|---|---|
| Value | Value / Problem Statement | Clarity of the problem, why it matters and why now | [value.md](pitch/materials/value.md) |
| ICP | ICP / Audience | Specificity and understanding of the target user | [icp.md](pitch/materials/icp.md) |
| Metrics | Metrics / Validation | Evidence from user research, interviews, tests and key metrics | [metrics.md](pitch/materials/metrics.md) |
| GTM | GTM Materials | Plausibility of the distribution strategy and audience fit | [gtm.md](pitch/materials/gtm.md) |
| Demo | MVP Materials | Working prototype, code quality and depth of Canton integration | [demo.md](pitch/materials/demo.md) |
| Pitch | Pitch Materials | Quality and conciseness of the overall presentation | [pitch.md](pitch/materials/pitch.md), with the deck and the video |

## Compliance checklist

From the Season 3 rules.

| Requirement | Status on 2026-10-09 |
|---|---|
| Submitted by 2026-10-09 23:59 UTC. Aim for 18:00 UTC. Nothing changed after the deadline counts | Open |
| Public repository with all code and a README describing the project | Done. Public at https://github.com/winsznx/draw since 2026-10-09, with an Apache-2.0 [LICENSE](../LICENSE). The secret scans of the full history are recorded in [SECURITY.md](SECURITY.md) |
| Demo: working prototype, live demo or recorded video, at most 5 minutes | The live site works, and the 4:30 video is at https://youtu.be/F4atPdV72M8 |
| Pitch materials: problem and why it matters, solution and how Canton is used, target users and go-to-market, key metrics or validation | Drafts of the six materials, not yet reviewed. The deck is final, v2, and the video presents it |
| One track, selected at submission | Track 3, confirmed by the owner on 2026-10-07. Select it in the submission form |
| 1,000 Mana burned toward the project | Done. On 2026-10-09 the dashboard shows 1,000 of 1,000 Mana burned, "Full mana reached". It was 100 of 1,000 on 2026-10-04 |
| Completed project profile: description, team information, track | Open |
| Non-empty journal, ideally an entry every day | Done. 6 entries and a 6-day streak on the dashboard on 2026-10-09 |
| Everything public: no private links, "request access" pages or files judges can't open | Open. The live site and the proof page are open to read, and actions need the access code (see Links). Question for AppsFactory: does an access code that the site prints still count as a "request access" page? Check every link in a private window before submitting |
| Meaningful Canton integration | Done. On package 0.3.0 the scripted DevNet runs passed 83 of 83 with each party signing with its own key, all five keys on one machine, and 82 of 82 on the live site's setup. The live web app settles through CIP-0056, each LP gets a CIP-0056 AllocationRequest, and an LP signed in on the node's Keycloak paid from its own Canton wallet, with the team's personal login and, in the newest run, with a second login NODERS created for the team, which the team also ran |
| AI-assisted tools used transparently | Done. Disclosed in the README, in the AI use answer above and in [HACKATHON_DELTA.md](HACKATHON_DELTA.md) |
| No inflated activity or Mana | No Mana bought before AppsFactory answers |
| Teammates only if registered by 2026-09-17 | Done. Single author |
| LocalNet and DevNet claims labeled separately, nothing beyond claims.yaml | README, docs, the deck and [claims.yaml](../claims.yaml) synced on 2026-10-06, and again on 2026-10-07 for runs 20261007T125638Z and 20261007T130259Z and the live site's verifier client. The web copy was checked line by line on 2026-10-06, and its 2026-10-07 changes to the proof page's custody note and the keys FAQ still need that check. The landing headline, the privacy tile, the read-back step's label, and the FAQ answers on paying from a Canton wallet and on Scan now stay within claims.yaml. Illustrations are labeled examples or read the run records, and wherever the live read-back runs on the login that settled, the site says so. The six materials and the video still need the same check at the freeze |
