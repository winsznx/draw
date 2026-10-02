# Track proof modality

Primary track: Real-World Asset and Business Workflows. Secondary: Investment Infrastructure (Funds, DAOs and Governance).

Modality: FINANCIAL / BUSINESS WORKFLOW.

## What the track expects

From the directive's reading of the track: a real business workflow that creates something, updates its state, transfers or fulfils it, and can be audited or reported, plus a role-aware UI, a business brief, and a pilot plan.

## The proof, end to end

`call issued → private LP obligation → real supported settlement → settlement independently observed → obligation truth updated → admin deployable-capital view recomputed → unpaid obligation stays explicitly unresolved`

| Step | What binds it | Evidence |
|---|---|---|
| Call issued | `Fund_IssueCall` creates one obligation per LP and an admin-only call header | `evidence/local/runs/<run>/steps.jsonl`, `capital call issued` |
| Private LP obligation | Each party's own ledger user reads the ACS. Leak check over everything it can see | `visibility-after-issue.json`, `visibility-final.json` |
| Real supported settlement | Amulet allocation (CIP-0056 Allocation V1) created by the LP, executed inside `Obligation_Settle` | `receipt-lpA.json`, `receipt-lpB.json` |
| Independently observed | Read-only verifier user re-reads the update and the admin's holdings | same receipts, `checks` |
| Obligation truth updated | Obligation recreated as `Funded` in the same transaction as the transfer | receipts `stateBefore`, `stateAfter` |
| Deployable capital recomputed | Sum of verified-funded obligations compared with the call total and the admin's Amulet balance | `totals.json` |
| Unpaid stays unresolved | LP C: overdue refused before due time, set after it, never funded | `result.json` checks `deadline`, `unpaid` |

Judge-visible artifacts:

| Required | Where |
|---|---|
| One canonical end-to-end run | `evidence/local/runs/` (latest), `/proof` page |
| One actual supported token movement | LocalNet Amulet, receipts |
| One role-privacy proof | visibility matrix and leak check |
| One independent settlement verification | verifier receipts |
| One non-happy-path result | wrong amount, wrong payer, wrong reference, replay, LP C overdue |
| Business brief | `docs/BUSINESS_BRIEF.md` |
| Pilot path | `docs/PILOT_PLAN.md` |

## What would make this modality invalid

- The proof shrinks to "the tests passed" with no business consequence shown.
- FUNDED is shown on any path other than a verifier receipt.
- The only token movement is on a test implementation (the `draw-tests` package) instead of Amulet.
- The README or UI says DevNet before a DevNet run exists.
- Privacy is demonstrated by filtering one admin dataset in the app.
