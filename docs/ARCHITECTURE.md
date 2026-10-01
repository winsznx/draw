# Architecture

## Ordering note

The matrix below was designed before the templates were written (it is the Phase 0 report's proposed matrix). It is checked in here after `contracts/daml/daml/Draw/CapitalCall.daml` existed. Every Y/N cell for DRAW templates is asserted by `test_visibility` and `test_settlement_lifecycle`. Cells marked UNVERIFIED have not been run on a participant.

## Actors

| Actor | Daml party | Notes |
|---|---|---|
| Admin | `admin` | fund administrator, executor and receiver of every settlement |
| LP A, LP B, LP C | `lpA`, `lpB`, `lpC` | one party each, each with its own credential on LocalNet |
| Unrelated | `outsider` | allocated on the same network, no relationship |
| Registry admin | DSO on LocalNet, `registrar` in tests | token infrastructure, sees token contracts only |

## Templates

| Template | Signatories | Observers | Created by | Choices (controller) | Archived on | Holds |
|---|---|---|---|---|---|---|
| `Fund` | admin | none | admin | `Fund_InviteInvestor` (admin, nonconsuming), `Fund_IssueCall` (admin, nonconsuming) | never | fund id and name. No LP roster |
| `CommitmentInvitation` | admin | lp | `Fund_InviteInvestor` | `Invitation_Accept` (lp), `Invitation_Decline` (lp), `Invitation_Withdraw` (admin) | any choice | one LP's commitment offer |
| `InvestorCommitment` | admin, lp | none | `Invitation_Accept` | `Commitment_IssueObligation` (admin) | each call, recreated with new called amount | one LP's committed and called amounts |
| `CapitalCall` | admin | none | `Fund_IssueCall` | none | never | call id, due date, obligation refs, totals. No LP parties or per-LP amounts |
| `CapitalCallObligation` | admin, lp | none | `Commitment_IssueObligation` | `Obligation_MarkPaymentPending`, `Obligation_Settle`, `Obligation_MarkOverdue`, `Obligation_FlagManualReview`, `Obligation_Waive` (all admin) | every state change, recreated | one LP's amount due, reference, state, settlement record |
| Token `Allocation` (Amulet on LocalNet) | registry admin, sender (Amulet: UNVERIFIED) | executor, receiver | LP through `AllocationFactory_Allocate` | `Allocation_ExecuteTransfer` (executor + sender + receiver) | on execution | one LP's locked payment for one obligation reference |

## Visibility matrix

| Contract | Admin | LP A | LP B | LP C | Unrelated | Asserted by |
|---|---|---|---|---|---|---|
| Fund | Y | N | N | N | N | `test_visibility` |
| CapitalCall | Y | N | N | N | N | `test_visibility` |
| LP A commitment | Y | Y | N | N | N | `test_visibility` |
| LP B commitment | Y | N | Y | N | N | `test_visibility` |
| LP C commitment | Y | N | N | Y | N | `test_visibility` |
| LP A obligation | Y | Y | N | N | N | `test_visibility`, by query and by `queryContractId` with a known id |
| LP B obligation | Y | N | Y | N | N | same |
| LP C obligation | Y | N | N | Y | N | same |
| LP A obligation after settlement | Y | Y | N | N | N | `test_settlement_lifecycle` |
| LP A allocation | Y | Y | N | N | N | test token only. Amulet: UNVERIFIED |
| Admin's received holding | Y | N | N | N | N | test token only. Amulet: UNVERIFIED |

## What each exercise discloses

| Transaction | Root | What each LP's projection contains | What the unrelated party learns |
|---|---|---|---|
| Issue call | `Fund_IssueCall` on admin-only `Fund` | its own `Commitment_IssueObligation` exercise, its recreated commitment, its new obligation. Not the root, not the `CapitalCall` create, not other LPs' subtrees | nothing |
| Mark pending | `Obligation_MarkPaymentPending` on one obligation | that LP: the exercise, the fetch of its own allocation, the new obligation. Other LPs: nothing | nothing |
| Settle | `Obligation_Settle` on one obligation | that LP: the exercise and everything under it, including `Allocation_ExecuteTransfer` and the admin's received holding create (the LP is a witness of its own payment). Other LPs: nothing | nothing |
| Overdue, review, waive | choice on one obligation | that LP only | nothing |

The registry admin (DSO on LocalNet) is a stakeholder of the allocation and holdings, so it witnesses the `Allocation_ExecuteTransfer` subtree. It is not a stakeholder of the obligation and does not see the parent exercise or the obligation reference outside the allocation's own fields. The allocation's `settlementRef.id` is visible to the DSO. References therefore must not encode LP names or amounts in production. UNVERIFIED on LocalNet until the privacy campaign reads the DSO's view.

## Settlement lifecycle

```text
LP: AllocationFactory_Allocate (settlementRef.id = transferLegId = obligation ref,
    executor = receiver = admin, amount = amountDue)          -> Allocation (ACTION_REQUESTED -> ACKNOWLEDGED)
Admin client, own token: read Allocation from admin ACS       -> Obligation_MarkPaymentPending   (PAYMENT_PENDING)
Admin: Obligation_Settle                                        (one transaction)
  checks ref, leg id, executor, sender, receiver, instrument, exact amount
  exercises Allocation_ExecuteTransfer with admin + LP authority
  fetches every receiver holding: owner = admin, instrument matches, sum = amountDue
  recreates obligation as Funded with SettlementRecord     -> contract state Funded (TRANSFER_EXECUTED, CLAIMED_FUNDED)
Second reader, separate token: read update by id + admin holdings -> evidence VERIFIED_FUNDED
```

The UI may show FUNDED only for obligations whose evidence is `VERIFIED_FUNDED`.

Why the obligation is co-signed: `Allocation_ExecuteTransfer` needs the executor, the sender, and the receiver. The admin is executor and receiver. The LP's authority comes from its signature on the obligation, which it gave by accepting the commitment. Inside `Obligation_Settle` the admin can only use that authority on an allocation that passes every check. The mutation check shows that if the sender or executor check is removed, Daml authorization still blocks the transfer.

Replay: `Allocation_ExecuteTransfer` is consuming, so the same allocation cannot settle twice. A funded obligation also refuses `Obligation_Settle`. Both are tested.

## States

`Issued`, `PaymentPending`, `Funded`, `Overdue`, `Waived`, `ManualReview` map to ISSUED, PAYMENT_PENDING, FUNDED, OVERDUE, WAIVED, MANUAL_REVIEW. No BRIDGED.

| From | To | Choice | Guard |
|---|---|---|---|
| Issued | PaymentPending | `Obligation_MarkPaymentPending` | allocation matches |
| Issued, PaymentPending, Overdue, ManualReview | Funded | `Obligation_Settle` | allocation matches, transfer executes, received holdings sum to amount due |
| Issued, PaymentPending | Overdue | `Obligation_MarkOverdue` | ledger time >= due |
| Issued, PaymentPending, Overdue | ManualReview | `Obligation_FlagManualReview` | none beyond state |
| Overdue, ManualReview | Waived | `Obligation_Waive` | none beyond state |

Overdue is materialized by an admin action after the deadline. There is no scheduler.

## Units

Scenario amounts (USD, for the business story) and settlement amounts (token units actually moved) are separate fields. The canonical scenario is 400,000 / 350,000 / 250,000 USD against 40 / 35 / 25 units. Commitments are tracked in scenario units.

## Aggregation

The admin total is not stored. It is recomputed from admin-visible obligations: funded = sum of scenario amounts in Funded, unresolved = everything not Funded or Waived. `test_settlement_lifecycle` checks 750,000 funded, 250,000 unresolved, the sum equals the call total, and the admin's received holdings equal the funded units.
