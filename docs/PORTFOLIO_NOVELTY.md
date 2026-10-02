# Portfolio novelty

Compared with the builder's most recent products, read from their repositories on 2026-10-02 (README and top-level docs only).

| Product | Last commit | Product object | Mechanism | Judge story | Category |
|---|---|---|---|---|---|
| Kyrve | 2026-09-26 | A lending quote | Private lender and borrower terms compared on encrypted data, one quote revealed and settled on Morpho | "One quote. The curve stays private." Judges sent to `/proof` | Private market, proof console |
| Limen | 2026-09-07 | A capital challenge and its clearance | STRK20 shielded balance proves at least T, triggers an action, re-shields | "Prove enough. Keep the rest private." `/evidence` console, 100-case adversarial campaign | Verifier, authorization gate |
| Afterstate | 2026-08-31 | A principal-signed mandate | Post-state checks inside the transaction, revert on violation | "37 of 80 agent transactions broke the rules. Now 0." Evidence console, benchmark, ablation | Agent guardrail, policy layer |
| Untch | 2026-08-07 | An agent spend decision | Deterministic authority layer before money moves, receipt on-chain | "The model never touches the money" | Policy layer, guardrail |
| Hatch | 2026-06-04 | A sealed, time-locked content item | Encrypted vault opened on a timer, licensing, oracle track record | "Sealed alpha. Public on timer." | Content marketplace |
| Sluize | 2026-04-04 | An agent's credit line | Spend policy limits borrowed funds, revenue split repays the pool | "POLICY IS THE PRODUCT" | Agent credit, policy |

## DRAW against them

| Axis | DRAW | Overlap |
|---|---|---|
| Product object | A capital call and each LP's obligation | None of the six models a fund call or per-LP obligations |
| Privacy model | Per-party ledger visibility: each LP's participant never receives other LPs' contracts | Others use ZK shielded notes (Limen), confidential compute (Kyrve), encrypted vaults (Hatch), or are public (Sluize) |
| Chain | Canton, Daml, CIP-0056 | None of the six uses Canton |
| Mechanism | Settlement-coupled state: the obligation flips in the transaction that moves the asset | Afterstate also gates state on what actually happened, for agents |
| Judge surface | `/proof` page, 100-case campaign, ablation, independent verifier | Same pattern as Limen, Afterstate, and Kyrve |
| Vocabulary | "deployable capital", "verified" | Kyrve uses "how much they can deploy". Limen uses "capital threshold" and "private capital" |

## Verdict: ADJACENT

The product is distinct. The proof style is not. A judge who has seen Limen or Afterstate could file DRAW as "another verifier with an evidence console" if the demo leads with the proof.

## What we do about it

- The demo and README open on the fund: a call, three LPs, two paid, one didn't, what's deployable. `/proof` is the last tab and is not shown in the first 30 seconds.
- The UI says "funded", "settle", "notice", "receipt". The verifier appears inside a receipt, not as a feature.
- Avoid "prove", "mandate", "capital threshold", and "keep the rest private" in taglines and headings.
- The 10-second judge note is about the fund (`JUDGE_NOTE.md`), and its check is "if a judge remembers a verifier, the story failed".
