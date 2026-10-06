# Submission

Draft answers for the AppsFactory project page, updated 2026-10-06. Keep them inside `claims.yaml`. DevNet claims carry the single-login label, and LocalNet claims stay separate.

## Answers

Project name: DRAW

Track: Track 3, Investment Infrastructure (pending owner confirmation). Its wishlist asks for "A Daml workflow for the full lifecycle of private fund subscriptions, capital calls, distributions and redemptions", and DRAW covers the capital-call part. Fallback: Track 1, Real-World Assets and Business Workflows.

One-line description: Private capital calls on Canton. Each investor sees and pays only its own notice, and the fund counts money as deployable only after the settlement is read back from the ledger.

Problem: When a fund calls capital, each LP pays by wire and fund software attributes the wires in batches from bank exports, with partial, split, and wrong-name payments handled by hand. Money counts as in only once it clears and is reconciled, and fake capital-call notices with swapped payment details are a known fraud pattern.

Solution: DRAW issues one private obligation per LP on Canton. LPs pay with a Token Standard allocation that carries the obligation's reference. The fund's settle step checks the reference, payer, amount, and asset, moves the money, and marks the obligation funded in one transaction. A separate read-back step confirms each settlement before the dashboard counts it. Unpaid obligations stay explicit: overdue, in review, or waived with a note.

Target customer: Emerging fund managers and the outsourced fund administrators who run their calls.

Business model: Hypothesis: a per-fund subscription for managers, per-call pricing for administrators. Not validated.

Why Canton: On LocalNet we ran the same call on an operator database with a paid flag and tried five attacks on both. Four succeeded on the database (marking an unpaid LP funded, reading another LP's obligation, reusing a payment, counting a payment row as money). None succeeded on DRAW. Canton puts privacy below the application and makes funded a consequence of the token moving.

Technical architecture: Daml package `draw` 0.3.0 (Fund, CapitalCall, InvestorCommitment, CapitalCallObligation, and a PaymentRequest per LP that implements the CIP-0056 AllocationRequest interface), CIP-0056 Allocation V1 through the Splice token registry, a Node API on a VPS that reads and acts as each party and answers only the web app, and a Next.js web app on Cloudflare Workers. A read-back step reads every settlement from the ledger before it counts. On LocalNet it has its own read-only login. On the shared DevNet node it uses the same hackathon login as everything else.

Working demo: Live on the HackCanton DevNet node at https://draw.timjosh507.workers.dev, settling in Canton Coin from the DevNet faucet, with one hackathon login for every seat. The scripted DevNet run on package 0.3.0 passed 79 of 79 checks. In it each LP's call also reached it as a CIP-0056 AllocationRequest, which other LPs and outsiders couldn't see, and LP A paid by creating the allocation from that request, the same factory call a wallet makes, with the shared login. No wallet app has been shown listing or approving a DRAW request yet. On Splice LocalNet, each party has its own login, and in a separate run each party signs with its own key (76 of 76). LocalNet also ran 100 generated calls with no false funding or privacy leaks, and an ablation against a database with a paid flag. See `docs/PROOF.md`.

AI use: DRAW was built with AI-assisted tools (Claude Code) for code, tests and documentation. The author directed the work and is responsible for all of it.

Pilot plan: Shadow one real call with an administrator, then a controlled test settlement with two or three LPs, then the integrations a real pilot needs (`docs/PILOT_PLAN.md`).

Post-hackathon plan: On DevNet, a read-only login for the read-back step and LPs that hold their own keys, both through the node operator. TestNet with USDCx, which needs Tokenomics Committee approval. LP sign-in where the server holds no LP credentials, automatic settlement on a matching payment, and conversations with fund administrators to test the problem.

## Links

| Item | Where |
|---|---|
| Live demo, DevNet | https://draw.timjosh507.workers.dev |
| Proof page | https://draw.timjosh507.workers.dev/proof |
| Repository | Public URL added when the repository is published |
| Demo video | Link added at submission |
| Deck | v1 draft at [`docs/pitch/DRAW-deck.pdf`](pitch/DRAW-deck.pdf), not yet reviewed |
| Demo access code | Printed on the live site's landing page and filled in whenever the site asks for it |

## The six materials

The project dashboard asks for six uploads: Value, ICP, Metrics, GTM, Demo and Pitch. Each matches one judging criterion. Drafts of all six are in `docs/pitch/materials/` and haven't been reviewed yet.

| Material | Criterion | What judges look for | File |
|---|---|---|---|
| Value | Value / Problem Statement | Clarity of the problem, why it matters and why now | [`docs/pitch/materials/value.md`](pitch/materials/value.md) |
| ICP | ICP / Audience | Specificity and understanding of the target user | [`docs/pitch/materials/icp.md`](pitch/materials/icp.md) |
| Metrics | Metrics / Validation | Evidence from user research, interviews, tests and key metrics | [`docs/pitch/materials/metrics.md`](pitch/materials/metrics.md) |
| GTM | GTM Materials | Plausibility of the distribution strategy and audience fit | [`docs/pitch/materials/gtm.md`](pitch/materials/gtm.md) |
| Demo | MVP Materials | Working prototype, code quality and depth of Canton integration | [`docs/pitch/materials/demo.md`](pitch/materials/demo.md) |
| Pitch | Pitch Materials | Quality and conciseness of the overall presentation | [`docs/pitch/materials/pitch.md`](pitch/materials/pitch.md), with the deck and the video |

## Compliance checklist

From the Season 3 rules and the plan's eligibility workstream. Status as of 2026-10-06.

| Requirement | Status | Owner |
|---|---|---|
| Submitted by 2026-10-09 23:59 UTC. Aim for 18:00 UTC. Nothing changed after the deadline counts | Open | Owner |
| Public repository with all code and a README describing the project | README drafted. Not published yet. On 2026-10-06 gitleaks 8.30.1 and a check for every `.env` value found nothing in the 45 commits up to `94ffc14`. The files not yet committed, including `docs/pitch/`, have to be committed, and the scan re-run on the release commit at the freeze, with its id and date recorded in `SECURITY.md`. A license still has to be chosen | Owner approves, agent pushes |
| Demo: working prototype, live demo or recorded video, at most 5 minutes | Live site works. Video not recorded | Owner records, agent edits |
| Pitch materials: problem and why it matters, solution and how Canton is used, target users and go-to-market, key metrics or validation | Deck v1 draft at `docs/pitch/DRAW-deck.pdf`, not yet reviewed. Drafts of the six materials in `docs/pitch/materials/`. The README links the deck once it passes the `claims.yaml` parity check and `docs/pitch/` is committed | Agent drafts, owner reviews |
| One track, selected at submission | Track 3 proposed, pending owner confirmation | Owner |
| 1,000 Mana burned toward the project | 100 of 1,000 on 2026-10-04. Ask AppsFactory whether bought Mana counts (plan question Q1) before buying any | Owner |
| Completed project profile: description, team information, track | Open | Owner |
| Non-empty journal, ideally an entry every day | One entry as of 2026-10-04. Plan: one a day from 2026-10-06 | Owner posts, agent drafts |
| Everything public: no private links, "request access" pages or files judges can't open | The live site is open to read. Actions need the access code, and the README says the site prints it. That is true only once the API runs with `DRAW_ACCESS_CODE_PUBLIC=true`, so check the landing page in a private window after deploying. Plan question Q2 asks AppsFactory whether a printed code still counts as a "request access" page. Check every link in a private window before submitting | Owner |
| Meaningful Canton integration | DevNet run 79 of 79 on package 0.3.0, live web app, CIP-0056 settlement, and a CIP-0056 AllocationRequest per LP | Done |
| AI-assisted tools used transparently | Disclosed in the README and above | Done |
| No inflated activity or Mana | No Mana bought before AppsFactory answers | Owner |
| Teammates only if registered by 2026-09-17 | Single author | Done |
| LocalNet and DevNet claims labelled separately, nothing beyond `claims.yaml` | README, docs and claims synced 2026-10-06. Deck, materials, video and web copy still to check at the freeze | Agent |
