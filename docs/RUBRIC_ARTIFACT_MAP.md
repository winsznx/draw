# Rubric to artifact map

The exact Season 3 judging text could not be retrieved (the Tracks and Judging tabs need a login). The rows below use the track expectation from the directive and judge questions found in search-indexed copies of the HackCanton page, which are UNCONFIRMED and may be from Season 2. Replace them with the exact text when available.

| Criterion or judge question | Claim | Live demo moment | Repository artifact | Machine evidence | Fallback | Status |
|---|---|---|---|---|---|---|
| Who is the user? | Fund COO or outsourced administrator | Dashboard opens on "Deployable now" | `docs/PRODUCT.md` | n/a | `docs/BUSINESS_BRIEF.md` | Ready. No practitioner interview |
| What workflow is broken today? | Notices, payments, matching, and follow-up are fragmented, so funded capital lags | Script opening line | `docs/PROBLEM_EVIDENCE.md` | n/a | brief | Public sources only |
| Which parties are involved? | Fund admin, three LPs, unrelated party, token registry | Viewing-as switcher | `docs/ARCHITECTURE.md` | run `parties` | diagram | Ready |
| What should each party see? | Each LP only its own records, admin all, outsider nothing | LP A sees one notice. LP B gets "Not visible to you" on LP A's notice. Outsider gets nothing | `docs/ARCHITECTURE.md` matrix | `visibility-final.json`, campaign privacy 0 | Proof tab matrix | LocalNet ready. DevNet single-credential pending |
| Who can approve or reject actions? | Admin settles, resolves, waives with a note. LP pays and withdraws. Nobody else acts | Settle, Send to review, Waive | `docs/SECURITY.md` | Daml `test_authority`, `test_review_paths` | mutation results | Ready |
| What settles atomically? | Transfer and funded flip in one transaction | Settle click, receipt | `CapitalCall.daml` `Obligation_Settle` | receipts, 14 checks | `SPONSOR_ABLATION.md` | Ready |
| What is auditable? | Every settlement has a receipt. Every decision has a note and a ledger update | Call detail, Details, timeline | `docs/PROOF.md` | receipts, app `actions.jsonl` | Proof tab | Ready |
| Why is Canton the right choice? | Privacy below the app, funded only when money moves, no reuse | Closing line, ablation | `docs/CANTON_ABLATION.md` | ablation `result.json` | `SPONSOR_TRANSFORMATION.md` | Ready |
| Track: create, update state, transfer or fulfil, audit or report | Issue call, settle, review or waive, receipt and totals | Full demo | `docs/TRACK_PROOF_MODALITY.md` | canonical run | `/proof` | Ready on LocalNet |
| Track: role-aware UI | Same pages read with each party's own login | Seat chosen at onboarding | `web/` | browser journey | screenshots | Browser journey blocked on LocalNet |
| Track: business brief and pilot plan | One-page brief, three-stage pilot | n/a | `BUSINESS_BRIEF.md`, `PILOT_PLAN.md` | n/a | n/a | Ready |
| Technical execution | Daml model, tests, mutation, campaign, clean room | n/a | `docs/EVAL_CAMPAIGN.md` | manifest | `docs/CLEAN_ROOM.md` | Ready, DevNet pending |
| Canton integration depth | CIP-0056 allocations executed inside the obligation choice, registry factory, disclosed contracts | Settle | `docs/SPONSOR_FINDINGS.md` | receipts | | Ready on LocalNet |
| Uses real assets on the season's network (S2 recap emphasis) | Real Canton Coin on DevNet | | `docs/DEVNET_DEPLOYMENT.md` | `evidence/devnet/runs/` | LocalNet Amulet | Pending, needs login |

Owner for every row: the builder. Update status after the DevNet run and the browser journey.
