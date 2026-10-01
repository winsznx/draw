# Decisions

Each entry records what was decided, why, and what would reverse it.

## D-001 Grofty is out of this pass (2026-10-01)

Grofty is MainNet-only, invite-only, and its wallet submits only as the single connected party. It cannot be the settlement proof for DRAW, and it cannot carry the admin or privacy flows.

This pass proves the capital-call lifecycle on LocalNet with party-scoped credentials. Grofty is an optional bounty slice (directive addendum, Phase 9b) that may start only after `DAML_CORE`, `LOCAL_SETTLEMENT`, and `PRIVACY_CAMPAIGN` pass. It is `BLOCKED_ON_HUMAN` until there is an invite, a funded MainNet party, receive preapproval on the fund party, and a human OK for tiny real transfers.

A Grofty signature would be `ACKNOWLEDGED` or `TRANSFER_EXECUTED`, never `VERIFIED_FUNDED`, until an independent read confirms the holding or update.

## D-002 BitSafe is not entered (2026-10-01)

No decentralized-party or decentralization-manager module. Fit is unverified and it would bend DRAW away from the capital-call workflow.

## D-003 No BRIDGED state (2026-10-01)

Financing is a separate product hypothesis. States are ISSUED, PAYMENT_PENDING, FUNDED, OVERDUE, WAIVED, MANUAL_REVIEW.

## D-004 Settle through CIP-0056 allocation, not a plain transfer (2026-10-01)

An allocation carries the obligation reference in `settlementRef.id` and `transferLegId`, plus sender, receiver, executor, amount, and instrument, in its on-ledger view. `Obligation_Settle` checks all of them in Daml and executes the transfer in the same transaction, so correlation does not depend on an off-ledger matcher reading transfer metadata. A plain `TransferFactory_Transfer` would put the reference only in choice-argument metadata, which Daml cannot read back.

Reverse if: the season environment does not support Amulet allocations. LocalNet 0.8.4 does (run 20261001T162427Z).

## D-005 Obligations are co-signed by admin and LP (2026-10-01)

`Allocation_ExecuteTransfer` requires executor, sender, and receiver authority. The LP's signature on the obligation, given once at commitment acceptance, supplies sender authority inside `Obligation_Settle` and nowhere else. Mutation runs show removing the sender or executor check still fails on Daml authorization.

## D-006 Deadline check uses isLedgerTimeGE (2026-10-01)

`assertDeadlineExceeded` is not in the LF 2.1 stdlib that SDK 3.5.12 ships. `--target=2.1` matches the Splice token-standard DARs. `isLedgerTimeGE` is available and used instead.

## D-007 Test token lives only in the test package (2026-10-01)

`draw-tests` implements Holding and Allocation for `dpm test`. It is not uploaded to any participant and is never cited as settlement evidence. LocalNet evidence uses Amulet.

## D-008 Participant placement on LocalNet (2026-10-01)

Admin on `app-provider`, LPs and the unrelated party on `app-user`. Each party has its own ledger user with actAs and readAs on that party only. The verifier is a separate user on `app-provider` with readAs admin and no actAs. The participant operator could read every hosted party. That is a LocalNet limit, not a product claim.

## D-009 Opaque obligation references (2026-10-01)

The DSO is a stakeholder of every Amulet allocation and sees `settlementRef.id`. References are random (`DRAW-<16 hex>`) so the registry view does not reveal LP names, fund, or call.
