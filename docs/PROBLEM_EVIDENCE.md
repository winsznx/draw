# Problem evidence

The public evidence behind the problem DRAW addresses, for anyone who wants to check whether the problem is real before looking at the product. Collected on 2026-10-04 from public sources. The quotes from sources 1, 8 and 10 were checked word for word against saved copies of the pages on 2026-10-06, and the text of sources 2 to 6, 9 and 11 against the live pages the same day. Sources 7 and 12 refused automated fetches (HTTP 403) on 2026-10-06, so their text is as summarized when collected. No conversation with someone who runs capital calls is on file yet.

Hypothesis under test: until capital-call settlement is reconciled, fund operations can't safely treat the amount as deployable, and the workflow splits obligation, payment, reconciliation and investor information across systems.

## Sources

| # | Source | Date | Actor | What it shows | Label |
|---|---|---|---|---|---|
| 1 | ILPA, ["New Template Strengthens Transparency, Communication Around Capital Call & Distribution Notices"](https://ilpa.org/news/capital-call-and-distribution-update/) | 2025-09-11 | LP industry body | "For LPs, capital call and distribution notices are essential tools for monitoring cash flow activity," said Neal Prunier, ILPA Managing Director of Industry Affairs. ILPA updated the notice template to v2.0 | DIRECT |
| 2 | Katten, ["ILPA Updates Capital Call & Distribution Template: Implications for GPs and LPs"](https://katten.com/ilpa-updates-capital-call-distribution-template-implications-for-gps-and-lps) | 2025-11-26 | Law firm | Aligned terminology is meant "to reduce the reconciliation burden". Completion "will require knowledgeable accounting personnel and enabling technology". This is notice-to-reporting reconciliation, which is a different job from payment matching | INDUSTRY_PROCESS |
| 3 | Mayer Brown, ["Understanding LPA Default Remedies"](https://www.mayerbrown.com/en/insights/publications/2024/08/understanding-lpa-default-remedies) | 2024 | Law firm | Penalty interest "on the unfunded amount", forced sale at a discount. Default status depends on an exact funded or unfunded amount and date | INDUSTRY_PROCESS |
| 4 | Cohen & Gresser, "Limited Partner Defaults in Private Equity Funds", [via Private Equity Wire](https://www.privateequitywire.co.uk/consequences-lp-defaults-due-capital-calls/) | 2020-05-11 | Law firm | Cure periods are standard. "Historically, LP default cases appear to be relatively rare" | INDUSTRY_PROCESS, against |
| 5 | RBS International, ["Are predictions of limited partner defaults being overstated?"](https://www.rbsinternational.com/insights/2020/06/are-predictions-of-limited-partner-defaults-being-overstated.html) | 2020-06-15 | Bank, practitioner quoted | "Apart from anything else, defaulting is hugely punitive and will always be a last resort." Late payments were mostly logistical delays | DIRECT, against defaults, for late-vs-funded visibility |
| 6 | FTI Consulting, ["Business Email Compromise for Private Equity Firm"](https://www.fticonsulting.com/insights/case-studies/business-email-compromise-private-equity-firm) | 2024-06-10 | Incident response | An attacker hijacked a GP-LP email thread about a cash transfer. Only part of the money was recovered | INDUSTRY_PROCESS |
| 7 | SVB, ["Funds transfer fraud prevention"](https://www.svb.com/private-funds-cfo-insights/pe-operating-best-practices/funds-transfer-fraud-prevention/) | 2026-07-15 | Bank | "Require two people to approve any change to standing payment instructions." "Ensure daily reconciliation to shorten the time window for detecting fraud." | INDUSTRY_PROCESS. The page refused a recheck on 2026-10-06 (403) |
| 8 | Luxembourg FIU (CRF), ["Trend alert #2: Business Email Compromise (BEC) targeting the investment sector"](https://crf.public.lu/dam-assets/news/trend-alert-2-bec.pdf), Ref. TA-2025-002 | November 2025 | Regulator | "A wide range of scams using fake capital call or drawdown notices, falsified invoices or fraudulent loan repayment instructions has been detected." | DIRECT |
| 9 | Allocations, ["SPV wire instructions and capital call ops"](https://www.allocations.com/insights/spv-wire-instructions-and-capital-call-ops) | 2026-10-01 | Vendor | "Admit only when the sheet says cleared." "Cleared funds from the wrong name create AML and ownership headaches." "Silence after a call due date trains LPs to ignore the next one." | INDUSTRY_PROCESS, partly marketing |
| 10 | Juniper Square, ["Description of Services"](https://www.junipersquare.com/terms-and-policies/description-of-services) | rev. 2023-05-17 | Vendor contract | Under contribution reconciliation: "Update the Software to reflect contributions up to three times per capital call." "Client must provide a .csv file of recent bank transactions in order for Juniper Square to perform contribution reconciliation." | INDUSTRY_PROCESS |
| 11 | Finologee, ["Capital Call" product docs](https://docs.bko.finologee.com/docs/capital-call) | 2026-08-18 | Vendor | Each contribution shows paid, partially paid, or not paid. Users reconcile against candidate transactions "including partial and split payments" | INDUSTRY_PROCESS |
| 12 | Carta, ["Simplify capital calls with automated contributions"](https://carta.com/product-updates/automated-money-movement-contributions/) | undated | Vendor | Per-LP virtual account numbers so contributions can be attributed | VENDOR_CLAIM, UNVERIFIED (403) |

What the labels mean, as used in this table. DIRECT is a first-hand statement by an industry body, a regulator or a quoted practitioner. INDUSTRY_PROCESS describes how the process runs, from law firms, banks, incident responders or vendor documents. VENDOR_CLAIM is a vendor's claim about its own product. UNVERIFIED means the page couldn't be opened, and only search-snippet text was available. "Against" marks a source that cuts against the hypothesis.

## What the evidence supports

- Notices are how LPs track calls, and the notice format is being standardized (1, 2).
- One vendor guide, partly marketing, advises admitting money only once it has cleared (9).
- At least one administration vendor reconciles in batches from a bank export the client provides (10), and vendor docs describe manual handling of partial, split and wrong-name payments (9, 11).
- Payment-instruction fraud around capital calls is real, and funds fight it with process controls such as callbacks, dual approval and faster reconciliation, outside the payment itself (6, 7, 8).

## What weakens the hypothesis

12 public sources. 2 argue against, and 3 show fiat tools already handle notices and matching.

- Fiat tools already do notices, payment attribution and status tracking (10, 11, 12). Matching is a solved product category on bank rails, though batch-based.
- LP defaults are rare (4, 5). Chasing defaulters is a weak pitch, and telling late from funded is the stronger one, so DRAW leads with that and leaves chasing defaulters out.
- Nothing found says a GP can't deploy until reconciliation finishes. Funds may bridge with subscription credit lines (not sourced here), which would soften "can't treat it as deployable".

## What this means for DRAW's framing

Lead with the gaps the sources show. Fiat tools already match payments, so "nobody can match payments" would be the wrong pitch.

1. Funded follows the money in the same transaction, so there is no off-ledger matching for payments made through DRAW. Wires paid outside DRAW still need matching.
2. The payment carries its notice's reference in a checked field, so a wrong-name or misattributed payment is refused with a reason instead of investigated. A payment from the wrong party goes to review with a note.
3. A payment instruction can't be swapped by email, because the LP pays its own on-ledger notice to the fund's party. That depends on the LP knowing the fund's real party, and DRAW doesn't build that onboarding. DRAW can't stop fake instructions emailed outside DRAW, and no run has tested a fake-notice attack.
4. Each LP's notice is a contract between the fund and that LP that no other LP or unrelated party can read, though the operator of the node that hosts them can.

Late versus funded, with the late ones explicit, beats "chasing defaulters".

## Not found

Reconciliation hours per call, misattribution rates, days from due date to reconciled funds, late-payment frequency, total capital-call fraud losses, and the notice period in ILPA v2.0 (secondary snippets only). DRAW's documents give no figure for any of these.

## Conversations

None as of 2026-10-07, and no usability test with an outside person either. The plan is 3 to 5 twenty-minute conversations with fund COOs, operations leads, administrators or LPs, each about their last real call, with the demo held to the end.

When they happen, each conversation is recorded here by role, never by name, and quotes appear only with the person's permission. The record template and the results tables are in [pitch/materials/metrics.md](pitch/materials/metrics.md), and the assumptions each question tests are in [pitch/materials/icp.md](pitch/materials/icp.md#what-the-interviews-will-test). The first conversation recorded here is what moves the market lock in [GATES.md](GATES.md#four-locks).
