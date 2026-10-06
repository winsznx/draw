# Business brief

DRAW: private capital calls on Canton. Each investor sees and funds only its own obligation. The fund sees how much called capital is actually deployable, and what is still unresolved.

## Problem

A fund calls capital from its investors (LPs). Each LP gets a notice for its own share and pays by wire. Today's fund software attributes those wires to investors, but in batches from bank exports, with partial, split, and wrong-name payments handled by hand. Funds count money as in only once it has cleared and been reconciled, and fake capital-call notices with swapped payment details are a known fraud pattern that funds fight with procedures, because the payment itself carries no check. Existing tools (Carta, Juniper Square, Finologee) cover notices and attribution on bank rails. The gaps are batch matching, manual exceptions, and payment instructions that can be forged.

DRAW makes the obligation and the payment the same record: the payment carries the obligation's reference in a field the ledger checks, and the obligation becomes funded in the transaction that moves the money.

This is a hypothesis built from public process descriptions (`PROBLEM_EVIDENCE.md`). No fund operator has confirmed it to us yet.

## Who it is for

- User: the fund COO or operations lead of an emerging manager, or an outsourced fund administrator running calls for several managers.
- Counterparty: each LP, who gets a private notice and a clear answer on whether its payment counted.
- Payer: the manager or the administrator. The manager pays for an accurate deployable figure. The administrator pays for less matching work across clients.

## Current workflow

Notice from a spreadsheet or admin system, email, wire, manual matching, a spreadsheet update, email follow-up, and a report of funded versus outstanding.

## What DRAW does

One call creates one private obligation per LP. The LP pays with a Canton token allocation that carries the obligation's reference. The fund's settle step moves the money and marks the obligation funded in the same transaction, refusing anything that doesn't match exactly. A separate read-back step confirms each settlement before it counts. On LocalNet it runs with its own read-only login, and on the shared DevNet node with the same hackathon login as everything else. Unpaid obligations stay visible as overdue, in review, or waived with a note.

## Why now

Canton's Token Standard (CIP-0056) gives a common way to lock a payment for a specific settlement, with the reference inside the payment. USDCx, which represents USDC deposited with Circle's xReserve, is a CIP-0056 token on Canton, and its registry lists the same allocation API DRAW settles through. That makes a dollar settlement rail that funds and LPs could plausibly share. DRAW hasn't run with USDCx yet.

## Why Canton

Two things a normal database with a paid flag can't give, both shown in our ablation run on LocalNet:

1. LP A's own ledger view can't return LP B's obligation, whatever the application code does.
2. An obligation becomes funded only when the money moves, and a payment can't be reused.

On a fully public ledger every LP would see every other LP's commitment share and payment status.

## Working today

- On the HackCanton DevNet node, with Canton Coin from the DevNet faucet: the full call in a scripted run (79 of 79 checks on package 0.3.0), with per-party reads and transaction streams that hold only each party's own records, bad payments refused, the unpaid LP overdue, and totals that match the coin received. One hackathon login acts for every party there.
- Each LP's call also reaches it as a CIP-0056 AllocationRequest, the Token Standard interface an app uses to ask a user for an allocation. On DevNet, LP A paid by creating the allocation from that request, the same factory call a wallet makes, with the shared login. No wallet app has been shown listing or approving one yet.
- A live web app on that node: take a seat, issue a call, pay, see that another LP gets nothing from your notice link, settle, and see it verified. Each browser gets its own demo fund.
- On Splice LocalNet with Amulet: the same lifecycle with a separate login per party, a run where every party signs with its own key (76 of 76 checks), 100 generated calls with no false funding or leaks, and the ablation.

## Roadmap

On DevNet, a read-only login for the read-back step and LPs holding their own keys, both of which need the node operator. Then TestNet with USDCx, which needs Tokenomics Committee approval. LP sign-in where the app server holds no LP credentials. Automatic settlement when a matching payment arrives. Export to the administrator's existing system.

## Pricing hypothesis

Unvalidated. A per-fund subscription for managers, with per-call pricing for administrators who serve many small funds. No pricing conversation has happened.

## Initial distribution

One outsourced fund administrator serving several emerging managers, since one relationship reaches several funds. The first step is a shadow run of one real call with no money moving (`PILOT_PLAN.md`).

## Not claimed

No customers, no pilots, no partnerships, no real money moved, nothing on MainNet, no settlement in USDCx.
