# Submission V0

Draft answers. Keep in sync with `claims.yaml`. DevNet claims carry the single-credential caveat.

**Project name:** DRAW

**One-line description:** Private capital calls on Canton: each investor sees and funds only its own obligation, while the fund sees what capital is actually deployable.

**Problem:** When a fund calls capital, each LP pays by wire and fund software attributes the wires in batches from bank exports, with partial, split, and wrong-name payments handled by hand. Money counts as in only once it clears and is reconciled, and fake capital-call notices with swapped payment details are a known fraud pattern.

**Solution:** DRAW issues one private obligation per LP on Canton. LPs pay with a Token Standard allocation that carries the obligation's reference. The fund's settle step checks the reference, payer, amount, and asset, moves the money, and marks the obligation funded in one transaction. A separate read-only check confirms each settlement before the dashboard counts it. Unpaid obligations stay explicit: overdue, in review, or waived with a note.

**Target customer:** Emerging fund managers and the outsourced fund administrators who run their calls.

**Business model:** Hypothesis: per-fund subscription for managers, per-call pricing for administrators. Not validated.

**Why Canton:** We ran the same call on an operator database with a paid flag and tried five attacks on both. Four succeeded on the database (marking an unpaid LP funded, reading another LP's obligation, reusing a payment, counting a payment row as money). None succeeded on DRAW. Canton puts privacy below the application and makes funded a consequence of the token moving.

**Technical architecture:** Daml package `draw` (Fund, CapitalCall, InvestorCommitment, CapitalCallObligation), CIP-0056 Allocation V1 with Amulet through the Splice registry, a Node server that reads and acts with one ledger user per party, a React + TypeScript app, and an independent read-only verifier.

**Working demo:** Runs end to end on the HackCanton DevNet node with real Canton Coin (72 of 72 checks, one shared hackathon login for all demo parties), and on Splice LocalNet with a separate login per party. 100 generated calls with no false funding or privacy leaks, an ablation, and a role-aware app. See `docs/PROOF.md`.

**Repository:** (public URL to add)

**Track:** Real-World Asset and Business Workflows. Secondary: Investment Infrastructure.

**Pilot plan:** Shadow one real call with an administrator, then a controlled test settlement with two or three LPs on DevNet or TestNet, then the integrations a real pilot needs (`docs/PILOT_PLAN.md`).

**Post-hackathon plan:** DevNet and TestNet runs, a tokenized-dollar settlement asset, LP sign-in through each LP's own wallet, automatic settlement on a matching payment, and one administrator conversation that tests the problem.

**Video:** (to record, `docs/DEMO_SCRIPT.md`)
