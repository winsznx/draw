# DRAW documentation

Private capital calls on Canton. Each LP reads and pays only its own notice, and the fund counts the money as deployable only after a separate read-back step confirms the settlement on the ledger.

This page lists every document in the order to read it, grouped by what it's for, and defines the fund and Canton words they use. It's written for hackathon judges who may know Canton but not private fund operations, and for fund people who don't know Canton.

Short on time? Open the proof page, https://draw.timjosh507.workers.dev/proof, which shows the newest run of each kind step by step and needs no access code. Then read the repository's [README](../README.md). If you have the demo access code, follow its section [Try it in a few minutes](../README.md#try-it-in-a-few-minutes) on the live site, https://draw.timjosh507.workers.dev.

Scoring by criterion? [RUBRIC_ARTIFACT_MAP.md](RUBRIC_ARTIFACT_MAP.md) maps each of the six judging criteria to where DRAW answers it.

## Every document, in reading order

Read top to bottom, or jump to the group you need. File names that start with SPONSOR_ use the hackathon's word for Canton, the sponsor technology. They aren't about a fund's sponsor or GP. [SPONSOR_ABLATION.md](SPONSOR_ABLATION.md) and [SPONSOR_TRANSFORMATION.md](SPONSOR_TRANSFORMATION.md) are short versions of [CANTON_ABLATION.md](CANTON_ABLATION.md), kept as hackathon records.

### Product and business

For anyone who wants to know what DRAW is, who it's for and how it would reach its first fund.

1. [README.md](../README.md), the repository's front page: the product on one page, the live tour, what runs where, the roadmap, what is proven and the limits.
2. [PRODUCT.md](PRODUCT.md): the product description. The decision DRAW owns, who uses and pays for it, a call step by step from both sides, what each side sees, what changes, what the LP needs, LPs who pay by wire, and what DRAW is not.
3. [BUSINESS_BRIEF.md](BUSINESS_BRIEF.md): the one-page business case for a fund person or a business judge. Problem, customer, payer, why now, why Canton, first channel, pricing hypothesis.
4. [PROBLEM_EVIDENCE.md](PROBLEM_EVIDENCE.md): the 12 public sources behind the problem, including the ones that cut against it, what wasn't found, and the conversation record, 0 conversations so far.
5. [PILOT_PLAN.md](PILOT_PLAN.md): a first pilot in three stages, starting with a shadow run of one real call where no money moves, what each stage needs and measures, and when to continue.
6. [FIRST_UNIT_VALUE.md](FIRST_UNIT_VALUE.md): the smallest useful deployment, what the first fund gets, and the cold-start cost on the LP side.

### Why Canton, proof and limits

For anyone checking whether a claim holds, and on which network.

7. [CANTON_ABLATION.md](CANTON_ABLATION.md): why Canton. The same call on an operator database with a paid flag and on DRAW, five attacks, who the attacker is, what a public chain would expose, and what Canton doesn't change.
8. [PROOF.md](PROOF.md): how to check each claim. The proof chain, where each result file lives, how to rerun it, how to read a receipt, and how old commit ids map to the published history.
9. [claims.yaml](../claims.yaml): every claim DRAW makes, with its network, evidence files and limits. Nothing in the README, the docs, the deck or the video may say more.
10. [LIMITATIONS.md](LIMITATIONS.md): what DRAW doesn't do or hasn't shown, by environment, product, security, evidence and business, with DevNet and LocalNet kept apart.

### How it's built

For engineers and Canton judges who want the model and the trust model.

11. [ARCHITECTURE.md](ARCHITECTURE.md): parties, contracts, the visibility matrix, the settlement lifecycle, sign-in, and the live DevNet deployment.
12. [SECURITY.md](SECURITY.md): the trust model. Who can do what on the ledger, what the demo server could and couldn't fake, sign-in, secrets.

### Deeper proof

13. [GATES.md](GATES.md): gate verdicts taken from the result files, every failed and aborted run with its cause, and the four locks.
14. [EVAL_CAMPAIGN.md](EVAL_CAMPAIGN.md): the test layers, the 100-call LocalNet campaign, and how the tests could be fooling us.
15. [WORKLOAD_ECONOMICS.md](WORKLOAD_ECONOMICS.md): ledger transactions per call and step timings on LocalNet, the manual steps left, and what isn't measured.
16. [MECHANISM_HYPOTHESIS.md](MECHANISM_HYPOTHESIS.md): the mechanism hypothesis as fixed on 2026-10-01, and each test that could have falsified it.
17. [BASELINE_AND_COUNTERFACTUAL.md](BASELINE_AND_COUNTERFACTUAL.md): today's workflow, the database counterfactual and DRAW side by side, and which steps DRAW keeps, replaces or removes.
18. [CLEAN_ROOM.md](CLEAN_ROOM.md): rebuilding and testing from a fresh clone, and the result of each clean-room run.
19. [evidence/manifest.json](../evidence/manifest.json): an index of the evidence runs with each one's commit, package id and file hashes.

### Canton integration and operations

20. [SPONSOR_FINDINGS.md](SPONSOR_FINDINGS.md): each Canton, Splice and Token Standard interface DRAW calls, the source it came from, and whether it has run.
21. [DEVNET_DEPLOYMENT.md](DEVNET_DEPLOYMENT.md): the HackCanton DevNet node, the clients NODERS issued for DRAW, the runbooks, and the record of each DevNet run.
22. [DEPENDENCY_GATE.md](DEPENDENCY_GATE.md): what DRAW depends on, the status of each dependency, and the fallback that keeps each claim honest.
23. [DECISIONS.md](DECISIONS.md): design decisions, why each was made, and what would reverse it.
24. [DEPLOY.md](DEPLOY.md): how the web app on Cloudflare and the API on a VPS are deployed, checked and kept up.
25. [deploy/README.md](../deploy/README.md): the files for running the API on a server.
26. [ENVIRONMENT.md](ENVIRONMENT.md): the build machine and tool versions.

### Platform materials and presenting

The six uploads the hackathon platform asks for, one per judging criterion, then the judge Q&A and the presenters' scripts. Drafts, not reviewed yet.

27. [pitch/materials/value.md](pitch/materials/value.md): Value. The problem, why now, why Canton, what's proven.
28. [pitch/materials/icp.md](pitch/materials/icp.md): ICP. The person DRAW is built for, who isn't a fit yet, and what the interviews will test.
29. [pitch/materials/metrics.md](pitch/materials/metrics.md): Metrics. Test numbers today with their files, and the record templates for conversations and usability tests.
30. [pitch/materials/gtm.md](pitch/materials/gtm.md): GTM. First channel, channels to test, the pilot, pricing hypothesis, the path to TestNet and MainNet, risks.
31. [pitch/materials/demo.md](pitch/materials/demo.md): Demo. The live tour and where each step is proven.
32. [pitch/materials/pitch.md](pitch/materials/pitch.md): Pitch. One line, thirty seconds, the slide outline and the numbers with their labels.
33. [pitch/judge-qa.md](pitch/judge-qa.md): short answers to the questions judges are likely to ask, each with what backs it.
34. [DEMO_SCRIPT.md](DEMO_SCRIPT.md): the presenter's script for showing the live site, with labels, timings and narration.
35. [pitch/video-script.md](pitch/video-script.md): scenes and voiceover for the demo video.

The deck, pitch/DRAW-deck.pdf, is v1. The fixes listed in [SUBMISSION.md](SUBMISSION.md#links) are made and the PDF was re-exported on 2026-10-06, and it isn't linked here until the owner has reviewed it.

### Hackathon process records

For judges checking the entry itself. These record how the entry was built and submitted, and they aren't product documents.

36. [SUBMISSION.md](SUBMISSION.md): draft answers for the project page, the links, and the compliance checklist.
37. [RUBRIC_ARTIFACT_MAP.md](RUBRIC_ARTIFACT_MAP.md): each of the six judging criteria, where DRAW answers it, and what's still missing.
38. [HACKATHON_DELTA.md](HACKATHON_DELTA.md): what was built during the event. First commit, build period, third-party material.
39. [TRACK_PROOF_MODALITY.md](TRACK_PROOF_MODALITY.md): the track DRAW proposes to enter, pending the owner's confirmation, and what that track expects.
40. [JUDGE_NOTE.md](JUDGE_NOTE.md): what a judge should be able to say back after 10 seconds, 30 seconds and 2 minutes, and the words that mean the story failed.
41. [JUDGE_SCORECARD.md](JUDGE_SCORECARD.md): our own check against the six criteria, without scores, and the next action for each.
42. [PORTFOLIO_NOVELTY.md](PORTFOLIO_NOVELTY.md): how DRAW differs from the author's earlier products.
43. [BUILD_STATUS.md](BUILD_STATUS.md): one status row per build requirement, with the evidence for each.
44. [SPONSOR_ABLATION.md](SPONSOR_ABLATION.md): the question of what DRAW would lose if a paid flag replaced the Token Standard.
45. [SPONSOR_TRANSFORMATION.md](SPONSOR_TRANSFORMATION.md): what Canton changes in the capital-call workflow.
46. [CLAUDE.md](../CLAUDE.md): the rules the AI coding assistant worked under, public as part of the AI-use disclosure.

## Words used in these docs

### Fund words

| Word | Meaning |
|---|---|
| Capital call | How a fund collects money its investors already promised. An LP commits money to a fund up front, and the fund draws it in parts when it needs it by sending each LP a notice for its share with a due date. Also called a drawdown. In DRAW the fund enters each LP's amount, and DRAW doesn't compute pro-rata shares. |
| LP | A limited partner, meaning an investor in the fund. Each LP commits an amount and pays its share of each call, and in DRAW each LP is its own party on the ledger. |
| Fund manager | The firm that runs the fund and issues its calls, also called the GP (general partner). In the app it's the Fund manager seat, and on the ledger it's the party called admin. |
| Outsourced fund administrator | A firm a manager hires to run fund operations such as issuing calls and matching payments. One administrator can serve several managers. In these docs "fund administrator" means only this firm. |
| Emerging manager | A newer, smaller fund manager. We built DRAW for the operations lead at one. |
| Commitment, remaining commitment | The total an LP agreed to put into the fund, and the part of it not yet called. DRAW's contract refuses a call above an LP's remaining commitment, which is tested in Daml Script and hasn't run on a ledger yet. |
| Notice | One LP's share of one call, with its amount, due date and reference. In DRAW it's a contract between the fund and that LP that no other LP or unrelated party can read, though the operator of the node that hosts them can. The code calls it an obligation (`CapitalCallObligation`). |
| Scenario dollars | The dollar figure on each notice, for the business story. The coin amount that actually moves is a separate field. The demo's call form fills in 1 CC for every $10,000, so a $400,000 notice is paid as 40 CC. That's a demo convention, and DRAW doesn't convert between the two. |
| Deployable now | Called money that is funded and confirmed by the read-back step, meaning received and verified in the fund's own holdings on the ledger. Moving it into a bank account isn't part of DRAW. The fund's dashboard opens on this figure. |
| Unresolved | Everything called that isn't verified funded and isn't waived, whether unpaid, overdue, mismatched or in review. |
| Overdue | A notice still unpaid after its due time. The fund marks it with a click, and the ledger refuses that before the due time. |
| In review | A notice the fund has set aside with a note, for example after a payment from the wrong party or a wire paid outside DRAW. |
| Waived | A notice the fund has decided, with a note, not to collect. Only an overdue or reviewed notice can be waived. It leaves the unresolved total, and the LP sees that it was waived. |
| Reconciliation | Matching the money received against what was owed, and updating the fund's records. At least one fund administration vendor does it in batches from a bank export the client provides. |
| LP book | The list of a fund's LPs with each one's commitment, amounts due and payment status. DRAW keeps each LP's part of it from the other LPs. |
| ILPA | The Institutional Limited Partners Association, an LP industry body. It publishes a standard template for capital call and distribution notices, and released v2.0 of it in September 2025. |

### Canton words

| Word | Meaning |
|---|---|
| Canton Network | The public network DRAW runs on. Applications on it write their contracts in Daml, and the ledger shows each contract only to the parties on it. |
| Daml | The language Canton contracts are written in. DRAW's model is the Daml package `draw`, version 0.3.0 on DevNet. |
| Party | An identity on the ledger that signs and sees contracts. The fund, each LP and an unrelated party are separate parties. |
| Party id hint | The readable start of a party id, such as `draw-lpa`. |
| Participant node, validator | A participant node hosts parties. It stores their contracts and submits and confirms their transactions, and its operator can read every party it hosts. A validator is a participant node on the Canton Network. |
| Signatory, observer | A signatory is a party whose authority a contract needs, and it sees the contract. An observer sees a contract without signing it. Each DRAW notice has two signatories, the fund and its LP. |
| Splice | The open-source code behind Canton Network's validator and Super Validator apps, Canton Coin, the wallet, Scan and the Token Standard APIs. DRAW's Token Standard packages come from its 0.8.4 release, and DRAW's LocalNet and the HackCanton node run Splice 0.8.4. |
| Token Standard (CIP-0056) | Canton's common interface for tokens, so apps and wallets can handle any token that implements it. CIP-0056 is the proposal that defines it. |
| Allocation | A Token Standard contract in which a payer locks an exact amount for one settlement, naming the reference, payer, receiver, amount and instrument. Nothing moves until it's executed. A DRAW payment is an allocation that carries the notice's reference. |
| AllocationRequest, payment request | The Token Standard interface an app uses to ask a user for an allocation. DRAW sends one with each notice, and on the HackCanton node the node's Canton Coin wallet lists it under Allocations with Accept. |
| Settle | The fund's action that checks a payment against its notice, moves the coin to the fund and marks the notice funded, all in one transaction. The code calls it `Obligation_Settle`. |
| Read-back step, receipt | After settlement, a separate read-back step reads the settlement and the fund's holdings from the ledger and runs 14 checks. Only a receipt that passes all 14 counts as verified funded. Why a second step: the app's own record that it submitted a settlement isn't proof that money arrived, so the read-back checks the ledger, and a claim the ledger doesn't back is marked CONTRADICTED and never counts. It runs in the same process as the step that submitted the settlement. |
| Verifier party | An optional party a fund can name in package 0.3.0 to read the fund, its calls and its notices without acting. Daml Script only so far. It isn't the verifier client, the DevNet login the scripted run's read-back used, and it isn't the read-back step itself. |
| Broken guards, mutation testing | Copies of DRAW's contract with one check removed or changed. The tests have to fail on every copy, and they caught 15 of 15 on package 0.3.0. |
| Canton Coin (CC), Amulet | Canton Coin is the network's own token, and Amulet is the Splice token implementation behind it. DRAW's runs use Canton Coin from the DevNet faucet and Amulet on LocalNet, and neither has monetary value. The DevNet proof page shows the instrument id Amulet, because Amulet is Canton Coin's implementation. |
| USDCx | A CIP-0056 token that represents USDC deposited into Circle's xReserve, documented for TestNet and MainNet. Its registry lists the allocation API DRAW settles through. DRAW hasn't run with USDCx. |
| DevNet, TestNet, MainNet | Canton's public networks. DevNet is for development and resets about every three months. TestNet resets every 3 to 6 months, and joining it needs Tokenomics Committee approval. MainNet carries real value. Of the three, DRAW runs on DevNet only. |
| Super Validator, Tokenomics Committee | Super Validators are the operators that run the Global Synchronizer, Canton Network's shared infrastructure, and sponsor new validators. The Tokenomics Committee of the Canton Foundation approves a validator for TestNet and MainNet. |
| LocalNet | A small Canton network that runs on one machine in Docker, from the Splice release. DRAW's LocalNet runs used Splice 0.8.4. |
| HackCanton DevNet node, NODERS | NODERS runs a shared DevNet participant for HackCanton, on Canton 3.5.19 and Splice 0.8.4. DRAW's live site and DevNet runs use it, and every party there sits on that one participant. |
| Seat, demo fund | A seat is one role in the live demo: Fund manager, LP A, LP B, LP C or an unrelated party. Each seat reads the ledger as its own party. Each browser gets its own demo fund, and every demo fund uses the same five parties, so the app keeps one browser out of another's fund and the ledger keeps each LP out of the others' records. |
| Backend client, verifier client | Two of the three Keycloak clients NODERS issued for DRAW on 2026-10-06. The third is DRAW's public web client for sign-in. The backend client acts for the five demo parties and nothing else, and DRAW's server uses it for every demo seat. The site's network note calls it DRAW's backend login. The verifier client did the read-back in the scripted DevNet run, but it can also act and read as the team's personal wallet party, so it isn't read-only and the live server doesn't use it. |
| Keycloak | The login server on the HackCanton node. An LP that signs in with HackCanton does so there, from its own browser, and gets its own token. |
| Scan | The network's public explorer. Per the Splice Scan API docs, the Canton Coin leg of each payment appears in Scan with its random reference and the party ids, whose hints such as `draw-lpa` are readable, and the notices don't. We inferred this from the docs and haven't checked it against Scan. |
| The DSO | The party behind Canton Coin's token registry. Per the Splice token design, it's a stakeholder of each Canton Coin allocation and so sees its reference, which in DRAW is random and names no one. No run has read the DSO's view. |
| Package vetting | A participant approves a Daml package before it confirms transactions that use it. Every participant that confirms a DRAW transaction must have vetted DRAW's package, so an LP's wallet works with DRAW only if its validator has. |

## Labels for anyone quoting DRAW

Every claim carries its network, and DevNet and LocalNet claims stay separate. A DevNet result is never used to stand in for a LocalNet one, or the other way round. [claims.yaml](../claims.yaml) keeps them as separate entries.

Where a screen, a slide or a claim needs a label, these are used word for word:

| Where it applies | Label |
|---|---|
| DevNet | DevNet, HackCanton shared node. DRAW's backend login signs for every demo seat. |
| The asset on DevNet | Settles in Canton Coin from the DevNet faucet. Dollar figures are the scenario. |
| The LocalNet custody run and browser-key journey | LocalNet. Each party signs with its own key. |
| The other LocalNet runs | LocalNet, a separate ledger login per party. |
| The production asset | Uses the Token Standard allocation interface, which the USDCx registry supports. Not run with USDCx. |
| An LP signed in with HackCanton | The LP here is signed in with the team's own HackCanton login. |

The README's claims table says who signed each run in these words:

- One backend client for every demo seat: the DevNet demo seats in the newest runs.
- One shared hackathon login for every party: the earlier DevNet runs.
- The LP's own HackCanton login (the team's own in every run): the sign-in runs on DevNet.
- A separate ledger login per party: the standard LocalNet runs.
- Each party's own key: the LocalNet custody run and the browser-key journey.
- Test runner: Daml Script tests, which run with no participant node and a test token.

Two more rules hold everywhere. Package 0.3.0 has run only in Daml Script and on DevNet, and every LocalNet run used 0.2.0 or earlier. The dollar figures are a scenario: the canonical call asks three LPs for $400,000, $350,000 and $250,000, which on DevNet are 40, 35 and 25 Canton Coin, and the coin has no monetary value.
