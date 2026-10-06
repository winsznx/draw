# Architecture

## Ordering note

The matrix below was designed before the templates were written (it is the Phase 0 report's proposed matrix). It is checked in here after `contracts/daml/daml/Draw/CapitalCall.daml` existed. Every Y/N cell for DRAW templates is asserted by `test_visibility`, `test_settlement_lifecycle` and, for payment requests, `test_payment_request`. Cells marked UNVERIFIED have not been run on a participant. The tables describe package 0.3.0, a Smart Contract Upgrade of 0.2.0 that adds `PaymentRequest` and the optional verifier party.

## Actors

| Actor | Daml party | Notes |
|---|---|---|
| Admin | `admin` | fund administrator, executor and receiver of every settlement |
| LP A, LP B, LP C | `lpA`, `lpB`, `lpC` | one party each, each with its own credential on LocalNet. On the DevNet node one hackathon login acts for all the demo seats |
| Signed-in LP (DevNet) | the wallet party of a HackCanton login | joins a demo fund as itself and acts only with its own login, from its browser. See "Sign in with HackCanton" below |
| Unrelated | `outsider` | allocated on the same network, no relationship |
| Verifier (optional, 0.3.0) | `verifier` | named on a fund when it is created, and an observer of that fund, its calls and its obligations. Daml Script only so far |
| Registry admin | DSO on LocalNet and DevNet, `registrar` in tests | token infrastructure, sees token contracts only |

## Templates

| Template | Signatories | Observers | Created by | Choices (controller) | Archived on | Holds |
|---|---|---|---|---|---|---|
| `Fund` | admin | verifier, if named | admin | `Fund_InviteInvestor` (admin, nonconsuming), `Fund_IssueCall` (admin, nonconsuming) | never | fund id and name, the optional verifier. No LP roster |
| `CommitmentInvitation` | admin | lp | `Fund_InviteInvestor` | `Invitation_Accept` (lp), `Invitation_Decline` (lp), `Invitation_Withdraw` (admin) | any choice | one LP's commitment offer |
| `InvestorCommitment` | admin, lp | none | `Invitation_Accept` | `Commitment_IssueObligation` (admin) | each call, recreated with new called amount | one LP's committed and called amounts |
| `CapitalCall` | admin | verifier, if named | `Fund_IssueCall` | none | never | call id, due date, obligation refs, totals. No LP parties or per-LP amounts |
| `CapitalCallObligation` | admin, lp | verifier, if named | `Commitment_IssueObligation` | `Obligation_MarkPaymentPending`, `Obligation_Settle`, `Obligation_MarkOverdue`, `Obligation_FlagManualReview`, `Obligation_ReleasePending`, `Obligation_Reopen`, `Obligation_Waive` (all admin). `Obligation_Settle` and `Obligation_Waive` take an optional `paymentRequestCid` and archive that request | every state change, recreated | one LP's amount due, reference, state, settlement record, issue time |
| `PaymentRequest` (0.3.0), implements CIP-0056 `AllocationRequest` V1 | admin | lp | `Commitment_IssueObligation`, next to each obligation | `AllocationRequest_Reject` (the LP only, checked in the choice), `AllocationRequest_Withdraw` (the executor, which is the admin) | reject, withdraw, or the settle or waive of its obligation when its id is passed | the request the LP reads as an AllocationRequest: settlement (executor admin, reference the obligation ref, requested at issue, allocate before the due time, settle before the due time plus 7 days) and one transfer leg keyed by the obligation ref, LP to admin, for the amount and instrument due |
| Token `Allocation` (Amulet on LocalNet) | registry admin, sender (Amulet: UNVERIFIED) | executor, receiver | LP through `AllocationFactory_Allocate`, either from its payment request's settlement and leg or with the reference set directly | `Allocation_ExecuteTransfer` (executor + sender + receiver) | on execution | one LP's locked payment for one obligation reference |

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
| LP A payment request | Y | Y | N | N | N | `test_payment_request`. On DevNet: the run's `wallet` checks |
| LP B payment request | Y | N | Y | N | N | same |
| LP C payment request | Y | N | N | Y | N | same |
| LP A allocation | Y | Y | N | N | N | test token only. Amulet: UNVERIFIED |
| Admin's received holding | Y | N | N | N | N | test token only. Amulet: UNVERIFIED |

A named verifier party sees the fund, every call and every obligation, including the settlement record, and no commitment, invitation or payment request (`test_verifier`). A fund that names no verifier shows it nothing (`test_no_verifier`). It can't act on what it sees: flagging an obligation for review and inviting an investor both fail authorization.

## What each exercise discloses

| Transaction | Root | What each LP's projection contains | What the unrelated party learns |
|---|---|---|---|
| Issue call | `Fund_IssueCall` on `Fund`, which no LP can see | its own `Commitment_IssueObligation` exercise, its recreated commitment, its new obligation and its payment request. Not the root, not the `CapitalCall` create, not other LPs' subtrees | nothing |
| Mark pending | `Obligation_MarkPaymentPending` on one obligation | that LP: the exercise, the fetch of its own allocation, the new obligation. Other LPs: nothing | nothing |
| Settle | `Obligation_Settle` on one obligation | that LP: the exercise and everything under it, including the archive of its payment request when its id is given, `Allocation_ExecuteTransfer` and the admin's received holding create (the LP is a witness of its own payment). Other LPs: nothing | nothing |
| Overdue, review, waive | choice on one obligation | that LP only | nothing |

The registry admin (DSO on LocalNet) is a stakeholder of the allocation and holdings, so it witnesses the `Allocation_ExecuteTransfer` subtree. It is not a stakeholder of the obligation and does not see the parent exercise or the obligation reference outside the allocation's own fields. The allocation's `settlementRef.id` is visible to the DSO. References therefore must not encode LP names or amounts in production. All of this is UNVERIFIED on both networks, since no run has read the DSO's view. Scan serves what the DSO observes, which per the Splice Scan API docs includes Canton Coin transfers and excludes most other things. So the Canton Coin leg of each DevNet payment should appear in Scan and the obligation shouldn't. That is inferred from the docs and hasn't been checked against Scan.

## Settlement lifecycle

```text
Issue: one obligation and one PaymentRequest per LP. The LP reads the request as a CIP-0056 AllocationRequest
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

On the DevNet node the second reader uses the same shared hackathon login as every other step, so there the read-back is a separate step with the same credential. When a fund names a verifier party, the second reader reads through that party instead of the admin. The verifier party's view is tested in Daml Script only, and no ledger run has read back through it yet.

The payment request's settlement and leg are exactly what `Obligation_Settle` checks, so an allocation created from the request passes unchanged (`test_payment_request`). On DevNet, LP A paid that way in run `20261006T091531Z`, through the run script with the shared login, using the same factory call a wallet makes. A signed-in LP paid from its own Canton wallet in the sign-in runs, once from DRAW and once with Accept in the node's Canton Coin wallet (next section).

The UI may show FUNDED only for obligations whose evidence is `VERIFIED_FUNDED`.

Why the obligation is co-signed: `Allocation_ExecuteTransfer` needs the executor, the sender, and the receiver. The admin is executor and receiver. The LP's authority comes from its signature on the obligation, which it gave by accepting the commitment. Inside `Obligation_Settle` the admin can only use that authority on an allocation that passes every check. The mutation check shows that if the sender or executor check is removed, Daml authorization still blocks the transfer.

Replay: `Allocation_ExecuteTransfer` is consuming, so the same allocation cannot settle twice. A funded obligation also refuses `Obligation_Settle`. Both are tested.

## Sign in with HackCanton (DevNet)

An LP with its own HackCanton login can join a demo fund as itself. The API turns this on with `DRAW_SIGN_IN=true`, and only when each browser has its own demo fund. Both runs of it, `evidence/devnet/browser/web-hackcanton-20261006100912` and `web-hackcanton-wallet-20261006101052`, signed in with the team's own login.

```text
LP's browser -> node's Keycloak (realm noders-appsfactory, public client web-app-ui-hackcanton-01-devnet)
                authorization code with PKCE, back to https://draw.timjosh507.workers.dev/auth/callback
                token kept in this tab's sessionStorage, renewed with the refresh token
LP's browser -> JSON Ledger API GET /v2/authenticated-user     -> primaryParty, the login's wallet party
LP's browser -> DRAW API action "join" { party }               (the party id is all DRAW receives)
DRAW API     -> Fund_InviteInvestor as the fund manager        -> invitation to commit $200,000
LP's browser -> JSON Ledger API, with its own token:
                POST /v2/state/active-contracts-page           CommitmentInvitation, InvestorCommitment,
                                                               CapitalCallObligation, Allocation and
                                                               AllocationRequest interfaces
                POST /v2/commands/submit-and-wait-for-transaction  Invitation_Accept
Fund manager seat (demo login) issues the call               -> obligation + PaymentRequest for the LP
LP pays from its own Canton wallet, with its own token:
                DRAW's Pay button -> POST {validator}/api/validator/v0/allocations
                or Accept on the request under Allocations in the node's Canton Coin wallet
Fund manager seat settles -> read-back step -> receipt          (as for every LP)
LP's browser -> DRAW API GET /api/record?ref=                  -> DRAW's own receipt and logged steps
```

Who reads what:

| Reader | Credential | Reads |
|---|---|---|
| The signed-in LP's browser | its own HackCanton token | its invitation, commitment, notices, payment requests and allocations, from the JSON Ledger API. Its balance from `GET /api/validator/v0/wallet/balance`. It classifies its own payments with `scripts/demo/lib/reconcile.mjs`, the module the server uses |
| DRAW's API | the shared demo login, as the fund manager party | the fund's own records, which include the LP's commitment, notices and the payments addressed to the fund, since the fund is a party to each. It keeps DRAW's own record per notice, the read-back receipt and logged steps, and serves only that to the LP at `GET /api/record?ref=` |
| The node's Canton Coin wallet | the LP's own login | each DRAW notice as a V1 allocation request, with Accept, Reject and, after Accept, Withdraw |

The LP pays, withdraws its own payment (`POST /api/validator/v0/allocations/{cid}/withdraw`) and taps test CC (`POST /api/validator/v0/wallet/tap`) through its wallet's API. A late LP can still pay from DRAW: the wallet call gets a fresh one-hour allocate window, which works because `Obligation_Settle` checks reference, leg id, executor, payer, receiver, instrument and amount, and no times. When a demo fund closes, on start over or when the API forgets the tour, the fund manager withdraws its open payment requests with `AllocationRequest_Withdraw` as the executor, so no LP's wallet keeps offering a closed fund's notice. An LP withdraws its own locked coin in its wallet.

The LP's party is its login's wallet party on the same NODERS participant as the fund, which has DRAW's package vetted. A login with no wallet party yet has to onboard in the node's wallet first.

## States

`Issued`, `PaymentPending`, `Funded`, `Overdue`, `Waived`, `ManualReview` map to ISSUED, PAYMENT_PENDING, FUNDED, OVERDUE, WAIVED, MANUAL_REVIEW. No BRIDGED.

| From | To | Choice | Guard |
|---|---|---|---|
| Issued | PaymentPending | `Obligation_MarkPaymentPending` | allocation matches |
| Issued, PaymentPending, Overdue, ManualReview | Funded | `Obligation_Settle` | allocation matches, transfer executes, received holdings sum to amount due |
| Issued, PaymentPending | Overdue | `Obligation_MarkOverdue` | ledger time >= due |
| Issued, PaymentPending, Overdue | ManualReview | `Obligation_FlagManualReview` | none beyond state |
| PaymentPending | Issued | `Obligation_ReleasePending` | none beyond state, with a note |
| ManualReview | Issued | `Obligation_Reopen` | none beyond state, with a note |
| Overdue, ManualReview | Waived | `Obligation_Waive` | none beyond state. A payment request passed with it must be this obligation's |

Overdue is materialized by an admin action after the deadline. There is no scheduler.

## Units

Scenario amounts (USD, for the business story) and settlement amounts (token units actually moved) are separate fields. The canonical scenario is 400,000 / 350,000 / 250,000 USD against 40 / 35 / 25 units. Commitments are tracked in scenario units.

## Aggregation

The admin total is not stored. It is recomputed from admin-visible obligations: funded = sum of scenario amounts in Funded, unresolved = everything not Funded or Waived. `test_settlement_lifecycle` checks 750,000 funded, 250,000 unresolved, the sum equals the call total, and the admin's received holdings equal the funded units.
