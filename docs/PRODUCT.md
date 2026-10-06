# Product

DRAW is a capital-call application. A fund requests capital from its investors, each investor sees only its own obligation, payment settles through Canton token infrastructure, and the fund administrator sees what is funded, pending, overdue, waived, or in review without exposing the LP book to any participant.

## The decision it owns

"How much of this capital call is deployable right now, and what amount remains unresolved?"

The dashboard opens on that number. Deployable means funded and confirmed by the read-back step. Unresolved is everything called that is not verified funded and not waived.

## Product object

`Capital Call → LP Obligation → Settlement Receipt / Resolution`

The admin creates calls, works obligations to resolution, and reads receipts. The LP reads its notice and pays it. Everything else (privacy, the verifier, the proof page) exists to make those objects trustworthy.

## Actor map

| Role | Who | What they get | Notes |
|---|---|---|---|
| Originator | Fund manager or outsourced fund administrator issuing the call | Issue a call in one action. One private notice per LP | The admin party on the ledger |
| Beneficiary | Fund operations | A deployable-capital figure tied to verified settlement, and an explicit list of what is unresolved | Same organisation as the originator in most small funds |
| Payer for the software | Fund manager or outsourced administrator | Fewer reconciliation ambiguities, one view of call status | Hypothesis. No pricing conversation has happened |
| Counterparty | LP | A notice only they can see, a payment that either matches or is refused with a reason, a receipt | Needs a Canton party and holdings in the settlement asset |
| Integrator | Whoever connects the fund's admin system, the LP's wallet or custodian, and the settlement asset | | Not built. Pilot stage 3 |
| Operator | DRAW application operator | Runs the app server and the admin's ledger access | In production it should hold no LP credentials (`SECURITY.md`) |
| Distribution owner | A fund administrator serving several emerging managers is the likely first channel | | Hypothesis |
| Optional external party | Auditor, lender, custodian | A limited projection | Not built, deliberately out of the core pass |

User and payer differ when an outsourced administrator runs the call for a manager. The manager pays for fewer surprises in reported funded capital. The administrator pays for less matching work.

## Obligation states

| Ledger state | Admin sees | LP sees |
|---|---|---|
| Issued, no payment | Awaiting payment | Due |
| Issued, matching payment locked | Payment received, ready to settle | Payment locked, waiting for the fund |
| Issued, non-matching payment | Payment does not match | Your payment does not match the amount due |
| PaymentPending | Settling | Payment locked, the fund is settling it |
| Funded with verifier receipt | Funded | Funded, with receipt |
| Funded without receipt | Settled, verification pending | Settled, verification pending |
| Overdue | Overdue | Overdue |
| ManualReview | In manual review | Under review by the fund |
| Waived | Waived | Waived by the fund |

## What DRAW is not

Not fund accounting, NAV, a KYC platform, a secondary market, a lending product, an audit console, or a generic dashboard. It does one call workflow end to end.
