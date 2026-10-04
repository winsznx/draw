# Problem evidence

Collected 2026-10-04 from public sources. No direct practitioner conversation is on file, so `MARKET_LOCK` stays REVISE. Quotes came back through a fetch summarizer. Spot-check them against the page before using them in submission text. UNVERIFIED means only search-snippet text was available.

Hypothesis under test: until capital-call settlement is reconciled, fund operations cannot safely treat the amount as deployable, and the workflow fragments obligation, payment, reconciliation, and investor-specific information across systems.

## Sources

| # | Source | Date | Actor | What it shows | Label |
|---|---|---|---|---|---|
| 1 | ILPA, "New Template Strengthens Transparency, Communication Around Capital Call & Distribution Notices" (ilpa.org/news/capital-call-and-distribution-update) | 2025-09-11 | LP industry body | "For LPs, capital call and distribution notices are essential tools for monitoring cash flow activity." ILPA updated the notice template to v2.0 | DIRECT |
| 2 | Katten, "ILPA Updates Capital Call & Distribution Template" | 2025-11-26 | Law firm | Aligned terminology is meant "to reduce the reconciliation burden". Completion "will require knowledgeable accounting personnel and enabling technology". This is notice-to-reporting reconciliation, not payment matching | INDUSTRY_PROCESS |
| 3 | Mayer Brown, "Understanding LPA Default Remedies" | 2024 | Law firm | Penalty interest "on the unfunded amount", forced sale at a discount. Default status depends on an exact funded or unfunded amount and date | INDUSTRY_PROCESS |
| 4 | Cohen & Gresser via Private Equity Wire, "Limited Partner Defaults in Private Equity Funds" | 2020-05-11 | Law firm | Cure periods are standard. "Historically, LP default cases appear to be relatively rare" | INDUSTRY_PROCESS, against |
| 5 | RBS International, "Are predictions of limited partner defaults being overstated?" | 2020-06-15 | Bank, practitioner quoted | "Defaulting is hugely punitive and will always be a last resort." Late payments were mostly logistical delays | DIRECT, against defaults, for late-vs-funded visibility |
| 6 | FTI Consulting, "Business Email Compromise at Private Equity Firm" | 2024-06-10 | Incident response | An attacker hijacked a GP-LP email thread about a cash transfer. Only partial recovery | INDUSTRY_PROCESS |
| 7 | SVB, "Funds transfer fraud prevention" | 2026-07-15 | Bank | "Require two people to approve any change to standing payment instructions." "Ensure daily reconciliation to shorten the time window for detecting fraud." | INDUSTRY_PROCESS |
| 8 | Luxembourg FIU (CRF), "Trend alert #2 (BEC)" | 2025-11-19 | Regulator | Scams "using fake capital call or drawdown notices" detected | DIRECT, UNVERIFIED (snippet) |
| 9 | Allocations, "SPV wire instructions and capital call ops" | 2026-10-01 | Vendor | "Admit only when the sheet says cleared." "Cleared funds from the wrong name create AML and ownership headaches." "Silence after a call due date trains LPs to ignore the next one." | INDUSTRY_PROCESS, partly marketing |
| 10 | Juniper Square, "Description of Services" | rev. 2023-05-17 | Vendor contract | Contribution reconciliation needs "a .csv file of recent bank transactions" from the client, and updates happen "up to three times per capital call" | INDUSTRY_PROCESS |
| 11 | Finologee, "Capital Call" product docs | 2026-08-18 | Vendor | Each contribution shows paid, partially paid, or not paid. Users reconcile against candidate transactions "including partial and split payments" | INDUSTRY_PROCESS |
| 12 | Carta, "Simplify capital calls with automated contributions" | undated | Vendor | Per-LP virtual account numbers so contributions can be attributed | VENDOR_CLAIM, UNVERIFIED (403) |

## What the evidence supports

- Notices are how LPs track calls, and the notice format is being standardised (1, 2).
- Funds treat money as in only once it has cleared and been reconciled (9).
- Reconciliation is often batch work on bank exports, with manual handling for partial, split, and wrong-name payments (9, 10, 11).
- Payment-instruction fraud around capital calls is real and handled by process controls (callbacks, dual approval, faster reconciliation), not by the payment rail (6, 7, 8).

## What weakens the hypothesis

- Fiat tools already do notice, payment attribution, and status tracking (10, 11, 12). Matching is a solved product category on bank rails, though batch-based.
- LP defaults are rare (4, 5). Chasing defaulters is a weak pitch. Telling late from funded is the stronger one.
- Nothing found says a GP cannot deploy until reconciliation finishes. Funds often bridge with subscription credit lines (not sourced here), which softens "can't treat it as deployable".

## What this means for DRAW's framing

Lead with the gaps the sources show, not with "nobody can match payments":

1. Funded follows the money in the same transaction, so there is no batch export and no match step to get wrong.
2. The payment carries its obligation reference in a checked field, so wrong-name and misattributed payments are refused instead of investigated.
3. A payment instruction can't be swapped by email, because the LP pays its own on-ledger obligation to the fund party.
4. Each LP sees only its own notice.

Late versus funded, with the late ones explicit, beats "chasing defaulters".

## Not found

Reconciliation hours per call, misattribution rates, days from due date to reconciled funds, late-payment frequency, total capital-call fraud losses, and the notice period in ILPA v2.0 (secondary snippets only).
