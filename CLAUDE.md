# DRAW project rules

DRAW is fund-operations software: Capital Call, LP Obligation, Settlement Receipt. The business workflow is the product. Canton is infrastructure.

Non-negotiable:

- Business workflow before architecture. Do not broaden scope until the primary lifecycle works.
- Read current official Daml, Canton, Splice, CIP-0056, and AppsFactory docs before assuming an API. Record sources in `docs/SPONSOR_FINDINGS.md`.
- No fake integration and no silent mock fallback on the claim path.
- Ledger state over frontend state. Party context must change the ledger query, not filter an admin payload.
- Role privacy is tested, never assumed. No single credential pretending to be every party in a proof.
- Only an independently observed, correctly correlated Token Standard settlement may move an obligation to funded. A submitted transaction, signature, or hash is not funded. No `paid = true`.
- Separate execution from verified outcome: ACTION_REQUESTED, ACKNOWLEDGED, TRANSFER_EXECUTED, SETTLEMENT_OBSERVED, CLAIMED_FUNDED, VERIFIED_FUNDED.
- Never write a PASS into evidence by hand. Tests and scripts write results. Preserve failed and negative evidence.
- `claims.yaml` is the ceiling for README, UI, video, and submission text.
- LocalNet and DevNet claims stay separate. README may not say DevNet until a DevNet run exists.
- Maintain the four lock states in `docs/GATES.md`. Do not polish past a failed mechanism gate.
- No AI features, no audit/security product, no Grofty, BitSafe, or lender view in the core pass.
- Never commit secrets, `.env`, or `internal/`.
