# Sponsor transformation

Transformation class: PRIVATE MULTI-PARTY WORKFLOW + SETTLEMENT-COUPLED BUSINESS STATE.

## Before

A capital call today, as the directive describes the baseline (direct practitioner evidence is still missing, see `PROBLEM_EVIDENCE.md`): a notice per LP from a fund-admin system or spreadsheet, payment by wire on a separate rail, someone matching incoming wires to expected amounts, follow-up by email for anything short, late, or unidentified, and a funded figure that is only as current as the last reconciliation.

## With Canton

| Property | How DRAW gets it | Proven by |
|---|---|---|
| Each party receives only the state its role needs | One obligation contract per LP with signatories admin and that LP. Fund and call header are admin-only | visibility matrix, leak check, 100-case campaign |
| Economic parties share enforceable workflow state | The LP co-signs its commitment once. Every obligation is co-signed, so the admin cannot invent one and the LP cannot change one | Daml `test_authority`, ablation |
| Supported settlement evidence advances the obligation | Amulet allocation carrying the obligation reference, executed inside `Obligation_Settle` | receipts, campaign 0 false funded |
| The administrator recomputes funded and unresolved from that state | Sum over admin-visible obligations with verifier receipts | `totals.json`, campaign 0 aggregate mismatches |

## Removal test

Run, not imagined: `CANTON_ABLATION.md`. Replacing party-scoped contracts with database permissions, and settlement with a paid flag, keeps the honest-path totals identical and lets four of five attacks through. The judge-visible proof changes from "the ledger refused it" to "the app promised to check".

## What Canton does not transform here

- Commitments, fund terms, LP onboarding and KYC stay off-ledger.
- The decision to waive, review, or chase an LP is still a human decision. DRAW records it with a note.
- Bank wires. DRAW settles in a Canton token. A fund paid by wire would still reconcile that wire elsewhere.
