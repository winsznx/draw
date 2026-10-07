# Business brief

Private capital calls on Canton. Each LP reads and pays only its own notice, and the fund counts the money as deployable only after a read-back step confirms the settlement on the ledger.

This is the one-page business case, written for fund people and for judges scoring value, audience and go-to-market. The product itself, step by step, is in [PRODUCT.md](PRODUCT.md), and the words are defined in [the glossary](README.md#words-used-in-these-docs).

## Problem

When a fund calls capital, each LP gets a notice for its share and pays by wire, and the fund matches each wire to an LP and a call. At least one fund administration vendor matches payments in batches from bank exports the client provides [10]. Partial, split and wrong-name payments are reconciled by hand [9, 11]. One vendor guide, partly marketing, advises counting money only once it has cleared: "Admit only when the sheet says cleared" [9]. Fake capital call notices are a known fraud, and funds fight it with procedures such as dual approval and daily reconciliation, outside the payment itself [6, 7, 8].

Fund administration software already issues notices and attributes payments on bank rails [10, 11, 12]. The gaps DRAW goes after are batch matching, manual exceptions, and payment instructions that can be forged.

This is a hypothesis built from 12 public sources. No fund operator has confirmed it yet. Numbers in brackets are sources in [PROBLEM_EVIDENCE.md](PROBLEM_EVIDENCE.md), which also lists the 2 sources that argue against it.

## Who it's for

- User: we built DRAW for the fund COO or operations lead at an emerging manager, a newer and smaller fund manager. This person issues the call, matches wires to LPs, chases late payers and reports funded versus outstanding. We also built it for an outsourced fund administrator that runs calls for several emerging managers. That this is the right first user is our hypothesis, from public sources.
- Counterparty: each LP. It gets a private notice and a clear answer: verified funded with a 14-check receipt, or refused with a reason.
- Payer, a hypothesis: the manager, as a subscription per fund, for a deployable figure tied to verified settlement and an explicit unresolved list. Or the administrator, per call, for less matching work across its clients. User and payer differ when an administrator runs the call.
- First customer, a hypothesis: one emerging manager, or one administrator running calls for a manager, with 2 to 5 LPs. Nobody has agreed to a pilot.
- Not a fit yet, also a hypothesis: funds whose LPs can't hold a Canton party or tokenized cash, which is the real cold-start cost ([FIRST_UNIT_VALUE.md](FIRST_UNIT_VALUE.md)), and anyone shopping for accounting, NAV, KYC or investor reporting.

We don't set an LP-count band, calls per year or a market size yet. The interviews will supply the inputs, and the sizing method is in [pitch/materials/icp.md](pitch/materials/icp.md).

## What DRAW does

The fund issues a call once, and each LP gets its own notice, a contract between the fund and that LP that no other LP or unrelated party can read, though the operator of the node that hosts them can. The LP pays from its Canton wallet by locking the exact amount in a Token Standard allocation that carries the notice's reference. When the fund settles, the ledger checks the payment against the notice and refuses anything that doesn't match exactly. The payment carries the notice's reference, and the notice turns funded in the same transaction that moves the money. A read-back step then confirms the settlement on the ledger with 14 checks, and only then does the dashboard count the money as deployable. Anything unpaid stays on an explicit unresolved list until it's paid or waived, and the fund can mark it overdue after the due time or send it to review with a note.

An LP needs a Canton party, holdings in the settlement asset and a wallet whose validator has vetted DRAW's package. An LP that pays by wire still gets a private notice, but nothing in DRAW can mark a wire funded, so that notice stays unresolved or goes to review. [PRODUCT.md](PRODUCT.md) walks through each step from both sides.

## Why now

- Canton's Token Standard (CIP-0056) gives a common way to lock a payment for one settlement with the reference inside it. DRAW settles through its allocation API.
- USDCx represents USDC deposited into Circle's xReserve, and is a CIP-0056 token documented for TestNet and MainNet. Its MainNet registry metadata lists `splice-api-token-allocation-v1`, the allocation API DRAW settles through. DRAW hasn't run with USDCx. Our hypothesis is that this could give funds and LPs a dollar rail they share.
- The industry is standardizing what a notice contains. ILPA released v2.0 of its capital call and distribution template in September 2025 [1, 2].

## Why Canton

On LocalNet we ran the same $1,000,000 scenario call twice, once on an operator database with a paid flag and role filtering in the app, and once on DRAW, and tried five attacks on both. The database attacker had write access, as an operator or a compromised app server would. 4 of 5 attacks got through the database and 0 of 5 got through DRAW. The four were marking an unpaid LP funded, reading another LP's notice, reusing one payment for another notice, and counting a payment row as money. Both systems stopped an LP from changing its own notice, and on the honest path both reported $750,000 funded and $250,000 unresolved.

A database does some of this just as well. It shows the fund every notice, computes totals when nobody misbehaves, and keeps LPs from writing.

What Canton changes is narrow. A query run as LP A never returns LP B's notice, even by contract id, so a missing filter in a read path that runs as LP A can't leak it. That was shown on LocalNet with a separate ledger login per party. On DevNet the demo seats share one backend client, so there the app picks which party to read as, and the DevNet runs show party-scoped reads and transaction streams that hold only each party's own records. The notice turns funded only in the transaction that moves the token, and that transfer needs the LP's prior consent, since the LP creates the payment. A settled payment is consumed, so it can't be reused.

On a public chain with USDC, every participant, other LPs included, would get each LP's address, which ties together all of that LP's calls, with its amount due, commitment share, due date and paid or overdue state. That's the LP book. We read those fields off DRAW's own notice contract and didn't run that comparison.

Canton doesn't hide LPs from their own fund. Today one node operator hosts every LP, on DevNet and on LocalNet, and can read them all, so production needs each LP on its own validator or with a provider it trusts. [CANTON_ABLATION.md](CANTON_ABLATION.md) has the full comparison.

## Working today

The DevNet items below, apart from the run where each party signs with its own key, carry the label "DevNet, HackCanton shared node. DRAW's backend login signs for every demo seat, and a different login reads each settlement back." They settle in Canton Coin from the DevNet faucet. Dollar figures are the scenario, and neither Canton Coin nor LocalNet's Amulet has monetary value.

- DevNet, scripted run: the full call on package 0.3.0 passed 82 of 82 checks, plus 1 credential check skipped with its reason recorded. Two LPs settled, bad payments were refused, the unpaid LP went overdue after the due time, and the fund's totals matched the coin it received. The read-back ran on a client that only reads as the fund.
- DevNet, each party's own key: in another scripted run the fund, three LPs and an unrelated party each signed their own transactions with their own key, and the same call passed 83 of 83 checks, with 2 credential checks skipped and their reasons recorded. All five keys sat on the machine that ran the script, so the run shows that the ledger needs each party's signature. It doesn't show that separate people held the keys. One login, the team's own, submitted for every party and read each settlement back, and the ledger refused it when it tried to act for LP A without LP A's key. The live site doesn't use these parties.
- DevNet, the live site at https://drawcalls.xyz: take a seat, issue a call, pay, see that another LP's ledger returns nothing for your notice link, settle, and see it verified funded. Each browser gets its own demo fund.
- DevNet, sign-in: an LP signs in with its own HackCanton login, reads its notices with its own token, and pays from its own Canton wallet, from DRAW or with Accept in the node's Canton Coin wallet. DRAW's server never receives its token. Every run used the team's own login as the LP.
- LocalNet: the same lifecycle with a separate ledger login per party and a read-back login that can't submit, 100 seeded calls with 0 false fundings and 0 privacy violations, and the database comparison. In a separate run each party signed with its own key, 76 of 76 checks. Every LocalNet run used package 0.2.0 or earlier.

Every caveat, by network, is in [LIMITATIONS.md](LIMITATIONS.md).

## Pilot and first channel

Our first channel is one outsourced fund administrator serving several emerging managers, since one relationship reaches several funds. Then the COO or operations lead at managers who run their own calls. Later, LPs that already hold Canton assets, and nobody knows yet how many exist. All of this is a hypothesis we're testing.

The channels we'll test:

- Direct outreach to fund operations people and administrators, asking for 20 minutes about their last call, with no pitch.
- Introductions, where we can get them, to whoever runs a fund's calls.
- Canton ecosystem events, and institutions already on the network.
- The live demo, sent only after a conversation.

Every interview ends with one question: what would you need to try DRAW on one real call, with no money moving? [pitch/materials/gtm.md](pitch/materials/gtm.md) has the full plan.

The first step is stage 1 of [PILOT_PLAN.md](PILOT_PLAN.md): shadow one real call with no money moving, with wires still matched by hand and recorded in DRAW with a note, and continue only if the operations lead would run the next call from DRAW and at least one LP says it would pay a call on Canton. Stage 1 needs no LP to hold a Canton party.

## Pricing hypothesis

Unvalidated. A subscription per fund for managers, and a price per call for administrators who serve many small funds. No pricing conversation has happened, and no price is set.

On network cost, CIP-0078 eliminated transfer and lock fees for Canton Coin. Traffic and holding fees remain, and DRAW hasn't measured traffic cost.

## Roadmap

In this order:

1. Conversations with people who run capital calls, and usability tests on the live site.
2. The shadow pilot of one real call.
3. On DevNet, a sign-in run with a second person's login, LP keys held by separate people instead of on one machine, and demo seats on the live site that sign with their own keys. The first two need a second person.
4. Sign-in for every seat, the fund manager included.
5. Automatic settlement when a matching payment arrives.
6. TestNet with USDCx, then MainNet.
7. Export to the administrator's system.
8. A scheduler for overdue.
9. Opaque party ids for new parties.

The ask: an introduction to someone who'd shadow one real call, and help getting onto TestNet.

## Not claimed

No customers, pilots, partners or letters of intent. No real money moved, nothing on MainNet, no settlement in USDCx. No conversation with a fund operator and no usability test with an outside person is on file yet.
