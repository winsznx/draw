# Ideal customer profile

The ICP material: who we built DRAW for, their job and their question, what frustrates them, what they've tried, what would make them try DRAW, who isn't a fit, the administrator, the LP, who pays, how we'd size it, and what the first interviews will test. It's for judges scoring the audience, and it's the list of assumptions we'll check with the first people we talk to.

Status on 2026-10-07: built from 12 public sources and our product docs, [BUSINESS_BRIEF.md](../../BUSINESS_BRIEF.md) and [PRODUCT.md](../../PRODUCT.md). No conversation with a practitioner has been held yet, so everything here is a hypothesis until the interviews in [metrics.md](metrics.md) test it. Numbers in brackets point to the source list in [PROBLEM_EVIDENCE.md](../../PROBLEM_EVIDENCE.md).

A capital call, for readers new to funds: an LP commits money to a fund up front, and the fund draws it in parts when it needs it, by sending each LP a notice for its share with a due date. It's also called a drawdown.

## The person: the fund COO or operations lead at an emerging manager

| | |
|---|---|
| Firm | An emerging manager, meaning a newer, smaller fund manager. Our assumption, which the first interviews test: at a small fund, operations issues the call and works it through to the end |
| Role | The fund COO or operations lead |
| Owns | Issuing the call, matching wires to LPs, chasing late payers, and reporting funded versus outstanding |
| Tools today | A spreadsheet or admin system to build notices, email to send them, wires into the fund's bank account, a bank export to match them, and a spreadsheet to track who has paid |
| Their question | "How much of this capital call is deployable right now, and what amount remains unresolved?" DRAW's dashboard opens on it |
| LPs per fund, calls per year | Not set yet. The interviews will record both, and we'll band the ICP from what they show instead of guessing. None has been held as of 2026-10-07 |

### What frustrates them (hypothesis from public sources)

- Wires arrive as partial or split payments, or from an account name that doesn't match the LP, and each one is reconciled by hand against candidate transactions [9, 11].
- At least one fund administration vendor matches payments in batches from bank exports the client provides, and updates contributions "up to three times per capital call" [10], so the funded figure can lag the money.
- Fake notices with swapped bank details are a known fraud, and the defenses are procedures such as callbacks, dual approval and daily reconciliation [6, 7, 8].
- Notices are how LPs monitor cash flow activity [1]. Our hypothesis is that LPs also care that no other LP can see their share.

### What they've tried

- Fund administration software that reconciles contributions from "a .csv file of recent bank transactions" the client provides, a few times per call [10].
- Per-LP virtual account numbers, so each wire can be attributed to one LP [12, a vendor claim we couldn't open].
- Process controls against payment fraud: two people approving any change to standing payment instructions, and daily reconciliation to catch fraud sooner [7].

### Why that falls short (hypothesis)

Matching still happens after the money arrives, outside the payment. A payment row in a database is a claim about money. The fraud controls are procedures around the payment, and the notice itself carries no check.

### What would make them try DRAW

A shadow run on one real call, with no money moving: DRAW issues the same call next to their spreadsheet, wires are still matched by hand and recorded in DRAW with a note, and the operations lead runs the call from DRAW's per-LP list until it closes. It tests the workflow and the private notices, and leaves matching and settlement to Stage 2. If the operations lead would run the next call from DRAW, and at least one LP says it would pay a call on Canton, they'd consider a test settlement. That's Stage 1 of [PILOT_PLAN.md](../../PILOT_PLAN.md), whose first-customer hypothesis is one emerging manager, or one outsourced administrator running calls for a manager, with 2 to 5 LPs. Nobody has agreed to a pilot.

### Who isn't a fit yet

- Funds whose LPs can't hold a Canton party or tokenized cash. They'd still get private notices and an explicit unresolved list, and a wire-paid notice never counts as deployable in DRAW. Funding that follows the money needs LPs who pay on Canton, and that's the real cold-start cost ([FIRST_UNIT_VALUE.md](../../FIRST_UNIT_VALUE.md)).
- Anyone shopping for fund accounting, NAV, KYC or investor reporting. DRAW does one call workflow end to end.

## Also: the outsourced fund administrator

An outsourced administrator runs calls for several emerging managers at once, so one relationship reaches several funds. That's why our first channel is one administrator ([gtm.md](gtm.md)). The administrator does the matching work today. For payments made through DRAW, the ledger check replaces off-ledger matching, and our hypothesis is that this means less matching work across its clients. Wires paid outside DRAW still need matching. When an administrator runs the call, the user and the payer split: the administrator uses DRAW, and the manager may pay for a deployable figure it trusts.

## On the other side: the LP

Each LP gets a notice that's a contract between the fund and that LP, which no other LP or unrelated party can read, though the operator of the node that hosts them can. It pays with a Canton token and gets a clear answer: verified funded with a 14-check receipt, or refused with the ledger's reason. To pay through DRAW an LP needs a Canton party, holdings in the settlement asset, to accept its commitment on the ledger once, and a wallet or participant that has vetted DRAW's package ([PRODUCT.md](../../PRODUCT.md#what-the-lp-needs)). In DRAW's model an LP can keep its own signing key while a node it doesn't run hosts its party. That ran on LocalNet, with the LP's party on LocalNet's LP participant rather than the fund's node, and in one scripted run on the HackCanton DevNet node, with every party on the fund's node and all five keys on the machine that ran it. On that node an LP with its own login can also sign in, see only its own notices and pay from its own Canton wallet, which we ran with the team's personal login and, paying from DRAW, with a second login the node operator created for the team. We ran both. On 2026-10-09 one person outside the team took the LP seat once, with a login NODERS created for the team, while the team ran the fund side.

## Who pays (hypothesis)

- The manager, through a per-fund subscription, for a deployable figure tied to verified settlement and an explicit list of what's unresolved.
- The administrator, per call, for less matching work across its clients.

No pricing conversation has happened and no price is set. Every interview asks what the fund pays for administration today. See [gtm.md](gtm.md).

## Sizing

We don't quote a market size, an LP-count band or a volume per fund yet. Each LP in a call is one notice and one payment to match, so for an administrator:

notices per year = client funds × calls per fund per year × LPs per fund

The interviews give us the inputs. We'd rather not publish a number without a source.

## What the interviews will test

| Assumption | Question that tests it | Changes our ICP if |
|---|---|---|
| At an emerging manager the COO or ops lead runs the call, or an outsourced administrator does | "Walk me through your last capital call. Who did what, and in which tools?" | Someone else owns it, for example the CFO alone, or a bank or custodian does the matching |
| Matching is manual and slow | "How do you know a payment has arrived, and which LP and call it belongs to? How long does that take?" | Matching takes minutes per call |
| Exceptions cost real hours | "What went wrong on the last call, and how many hours did it cost?" | Nothing has gone wrong in recent calls |
| Fake notices worry them | "How do you protect LPs from fake notices or changed wire details?" | Their LPs never pay from emailed details |
| Some LPs would pay in a tokenized dollar | "Would some of your LPs pay a call in a tokenized dollar if it settled the same day with a receipt? What would stop them?" | Nobody would, for reasons a pilot can't change |
| The manager or administrator pays | "Who would pay to fix this, and what do you pay for fund administration today?" | Nobody would pay, or only the LP side would |

Each conversation will also record the LP count and calls per year of the fund they last called. Results go into [metrics.md](metrics.md) and the conversations section of [PROBLEM_EVIDENCE.md](../../PROBLEM_EVIDENCE.md), with roles instead of names and quotes only with permission.
