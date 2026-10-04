# Business brief

**DRAW: private capital calls on Canton.** Each investor sees and funds only its own obligation. The fund sees how much called capital is actually deployable, and what is still unresolved.

## Problem

A fund calls capital from its investors (LPs). Each LP gets a notice for its own share and pays by wire. Today's fund software attributes those wires to investors, but in batches from bank exports, with partial, split, and wrong-name payments handled by hand. Funds count money as in only once it has cleared and been reconciled, and fake capital-call notices with swapped payment details are a known fraud pattern that funds fight with procedures, not with the payment itself. Existing tools (Carta, Juniper Square, Finologee) cover notices and attribution on bank rails. The gaps are batch matching, manual exceptions, and payment instructions that can be forged.

DRAW makes the obligation and the payment the same record: the payment carries the obligation's reference in a field the ledger checks, and the obligation becomes funded in the transaction that moves the money.

This is a hypothesis built from public process descriptions (`PROBLEM_EVIDENCE.md`). No fund operator has confirmed it to us yet.

## Who it is for

- **User:** the fund COO or operations lead of an emerging manager, or an outsourced fund administrator running calls for several managers.
- **Counterparty:** each LP, who gets a private notice and a clear answer on whether its payment counted.
- **Payer:** the manager or the administrator. The manager pays for an accurate deployable figure. The administrator pays for less matching work across clients.

## Current workflow

Notice from a spreadsheet or admin system, email, wire, manual matching, a spreadsheet update, email follow-up, and a report of funded versus outstanding.

## What DRAW does

One call creates one private obligation per LP. The LP pays with a Canton token allocation that carries the obligation's reference. The fund's settle step moves the money and marks the obligation funded in the same transaction, refusing anything that doesn't match exactly. A separate read-only check confirms each settlement before it counts. Unpaid obligations stay visible as overdue, in review, or waived with a note.

## Why now

Canton's Token Standard (CIP-0056) gives a common way to lock a payment for a specific settlement, with the reference inside the payment. Tokenized cash on Canton makes a settlement rail that funds and LPs could plausibly share.

## Why Canton

Two things a normal database with a paid flag can't give, both shown in our ablation run:

1. LP A's own login cannot get LP B's obligation, whatever the application code does.
2. An obligation becomes funded only when the money moves, and a payment can't be reused.

On a fully public ledger every LP would see every other LP's commitment share and payment status.

## Working today

On Splice LocalNet with real Amulet: the full call lifecycle, per-LP privacy checked with each party's own login, settlement with independent read-back, refusal of wrong amounts, wrong payers, wrong references, and replays, admin totals matching the money received, 100 generated calls with no false funding or leaks, and a role-aware web app. DevNet support for the HackCanton shared node is written. The DevNet run is next.

## Roadmap

DevNet and then TestNet runs. A real settlement asset (a tokenized dollar). LP sign-in through each LP's own wallet, so the app server holds no LP credentials. Automatic settlement when a matching payment arrives. Export to the administrator's existing system.

## Pricing hypothesis

Unvalidated. A per-fund subscription for managers, with per-call pricing for administrators who serve many small funds. No pricing conversation has happened.

## Initial distribution

One outsourced fund administrator serving several emerging managers, since one relationship reaches several funds. The first step is a shadow run of one real call with no money moving (`PILOT_PLAN.md`).

## Not claimed

No customers, no pilots, no partnerships, no real money moved, nothing on MainNet.
