# Track proof modality

Primary track: Track 3, Investment Infrastructure: Funds, DAOs & Governance Tools (pending owner confirmation). Fallback: Track 1, Real-World Assets (RWA) & Business Workflows.

Modality: FINANCIAL / BUSINESS WORKFLOW.

## What the track expects

Track 3's expected output, from the Season 3 rules: "An MVP for fund management, DAO governance or capital coordination", "Role-based workflows (e.g., managers, investors, voters)", "A demonstration of transparency, auditability and operational logic", and "A brief describing the target users and operational use case". The directive's earlier reading asked for the same shape: a workflow that creates something, updates its state, transfers or fulfils it, and can be audited, plus a role-aware UI, a business brief, and a pilot plan. `RUBRIC_ARTIFACT_MAP.md` maps each item.

## The proof, end to end

`call issued → private LP obligation → real supported settlement → settlement read back separately → obligation truth updated → admin deployable-capital view recomputed → unpaid obligation stays explicitly unresolved`

| Step | What binds it | Evidence |
|---|---|---|
| Call issued | `Fund_IssueCall` creates one obligation per LP and an admin-only call header | `evidence/local/runs/<run>/steps.jsonl`, `capital call issued` |
| Private LP obligation | Each party's own ledger user reads the ACS. Leak check over everything it can see | `visibility-after-issue.json`, `visibility-final.json` |
| Real supported settlement | Allocation (CIP-0056 Allocation V1) created by the LP, executed inside `Obligation_Settle`. Canton Coin on DevNet, Amulet on LocalNet | `receipt-lpA.json`, `receipt-lpB.json` |
| Observed by a separate read-back | The verifier re-reads the update and the admin's holdings. On LocalNet it is a read-only user that can't submit. On DevNet the canonical run gave it a client of its own, which the ledger refused as the fund but which isn't read-only, and the live site uses the backend client the seats use | same receipts, `checks`, `verifierUser` |
| Obligation truth updated | Obligation recreated as `Funded` in the same transaction as the transfer | receipts `stateBefore`, `stateAfter` |
| Deployable capital recomputed | Sum of verified-funded obligations compared with the call total and the admin's Amulet balance | `totals.json` |
| Unpaid stays unresolved | LP C: overdue refused before due time, set after it, never funded | `result.json` checks `deadline`, `unpaid` |

Judge-visible artifacts:

| Required | Where |
|---|---|
| One canonical end-to-end run | `evidence/devnet/runs/20261006T131900Z` (package 0.3.0), `evidence/local/runs/20261004T183146Z` (package 0.2.0), the `/proof` page |
| One actual supported token movement | Canton Coin on DevNet, Amulet on LocalNet, receipts |
| One role-privacy proof | visibility matrix and leak check |
| One settlement read-back | verifier receipts: a separate read-only login on LocalNet, the verifier client's own ledger user on DevNet |
| One non-happy-path result | wrong amount, wrong payer, wrong reference, replay, LP C overdue |
| Business brief | `docs/BUSINESS_BRIEF.md` |
| Pilot path | `docs/PILOT_PLAN.md` |

## What would make this modality invalid

- The proof shrinks to "the tests passed" with no business consequence shown.
- FUNDED is shown on any path other than a verifier receipt.
- The only token movement is on a test implementation (the `draw-tests` package) instead of Amulet.
- The README or UI says DevNet before a DevNet run exists.
- Privacy is demonstrated by filtering one admin dataset in the app.
