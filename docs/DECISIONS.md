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
