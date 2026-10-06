# Ideal customer profile

Status on 2026-10-06: built from 12 public sources and our product docs, [`docs/BUSINESS_BRIEF.md`](../../BUSINESS_BRIEF.md) and [`docs/PRODUCT.md`](../../PRODUCT.md). No practitioner conversation is on file yet. Every line marked "assumption" is something the interviews in [`metrics.md`](metrics.md) will test.

## The person: the fund COO or operations lead at an emerging manager

| | |
|---|---|
| Firm | An emerging fund manager. In most small funds, operations issues the call and works it through to the end |
| Role | The fund COO or operations lead |
| Owns | Issuing the call, matching wires to LPs, following up late payers, and reporting funded versus outstanding |
| Tools today | A spreadsheet or admin system to build notices, email to send them, wires into the fund's bank account, a bank export to match them, and a spreadsheet to track who has paid |
| Their question | "How much of this call is deployable right now, and what's still unresolved?" |
| LPs per fund, calls per year | Not set yet. The interviews record both, and we'll band the ICP from what they show instead of guessing |

### What frustrates them (hypothesis from public sources)

- Wires arrive with partial amounts, split across days, or from an account name that doesn't match the LP. Each one is a manual exception [9, 11].
- Matching runs from bank exports, often in batches, so the funded figure lags the money [10].
- Fake notices with swapped bank details are a known fraud, and the defences are procedures: callbacks, dual approval, daily reconciliation [6, 7, 8].
- LPs want to know their own payment counted, and only their own share should be visible to them [1].

Numbers in brackets point to [`docs/PROBLEM_EVIDENCE.md`](../../PROBLEM_EVIDENCE.md).

### What they've tried

- Fund admin software that reconciles contributions from a CSV of bank transactions, a few times per call [10].
- Per-LP virtual account numbers, so each wire can be attributed to one LP [12, a vendor claim we couldn't open].
- Process controls against payment fraud: call-backs on any change of payment details, two approvers, faster reconciliation [7].

### Why that falls short

Matching still happens after the money arrives, outside the payment. A payment row in a database is a claim about money. The fraud controls live in email and phone calls, and the notice itself carries no check.

### What would make them try DRAW

A shadow run on one real call, with no money moving: DRAW issues the same call next to their spreadsheet, and they compare the unresolved lists each day until the call closes. If DRAW's list is at least as accurate, and their LPs care that no LP can see another's notice, they'd consider a test settlement. That's Stage 1 of [`docs/PILOT_PLAN.md`](../../PILOT_PLAN.md), whose first-customer hypothesis is one emerging fund manager, or one outsourced administrator running calls for a manager, with two to five LPs.

### Who isn't a fit yet

- Funds whose LPs can't hold a Canton party or tokenized cash. They'd still get private notices and an explicit unresolved list, but not funding that follows the money. That's the real cold-start cost ([`docs/FIRST_UNIT_VALUE.md`](../../FIRST_UNIT_VALUE.md)).
- Anyone shopping for fund accounting, NAV, KYC or investor reporting. DRAW does one call workflow end to end.

## Also: the outsourced fund administrator

An outsourced administrator runs calls for several emerging managers at once, so one relationship reaches several funds. That's why our first channel is one administrator ([`gtm.md`](gtm.md)). The administrator does the matching work, and that's the work DRAW removes for exact payments. When an administrator runs the call, the user and the payer split: the administrator uses DRAW, and the manager may pay for a deployable figure it trusts.

## On the other side: the LP

Each LP gets a notice that no other LP can read, pays it with a Canton token, and gets a clear answer: funded and verified, or refused with a reason. To pay through DRAW an LP needs a Canton party and holdings in the settlement asset. In DRAW's model the LP's party can be hosted by the fund's node while the LP keeps its own signing key. That runs on LocalNet today. On the HackCanton DevNet node an LP with its own login can also sign in, see only its own notices and pay from its own Canton wallet, which we ran with the team's own login.

## Who pays (hypothesis)

- The manager, for a deployable figure tied to verified settlement and an explicit list of what's unresolved.
- The administrator, for less matching work across its clients.

No pricing conversation has happened. Every interview asks what the fund pays for administration today. See [`gtm.md`](gtm.md).

## Sizing

We don't quote a market size or a volume per fund yet. Each LP in a call is one notice and one payment to match, so for an administrator:

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

Each conversation also records the LP count and calls per year of the fund they last called. Results go into [`metrics.md`](metrics.md) and a conversations section in `docs/PROBLEM_EVIDENCE.md`, with roles instead of names and quotes only with permission.
