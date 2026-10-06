# Why Canton: the same call on an ordinary database

This page answers the question a judge or a fund's operations lead asks first: why does a capital call need Canton, when a fund could keep its notices in its own database or put them on a public chain? We ran the same capital call twice on LocalNet, once on an ordinary operator database with a `paid` flag and once on DRAW, and tried the same five attacks on both. The database let 4 of 5 through. DRAW let 0 of 5 through. The attacker on the database had write access to it, as an operator or a compromised app server would. In plain words, the database version is the same system with Canton taken out, which is what the "ablation" in this file's name means. The evidence is [the comparison run](../evidence/local/ablation/20261002T193830Z/result.json), written by `node scripts/eval/ablation.mjs` on LocalNet with package 0.2.0, and it's the `canton-load-bearing` entry in [claims.yaml](../claims.yaml). Fund and Canton words are defined in [the glossary](README.md#words-used-in-these-docs).

## What was compared

The same $1,000,000 scenario call (LP A $400,000 paid, LP B $350,000 paid, LP C $250,000 unpaid) on three systems. The run's result file names them treatment, counterfactual A and counterfactual B.

- DRAW on a LocalNet participant, the treatment. Each LP's notice is a contract between the fund and that LP that no other LP or unrelated party can read, and payment settles in Amulet through a CIP-0056 allocation executed inside `Obligation_Settle`.
- An operator database, counterfactual A. `node:sqlite` with an obligations table, a payments table, a `paid` flag, and role filtering in the application's queries. It's a reasonable design.
- A ledger everyone can read, counterfactual B. Every notice replicated to every participant. It wasn't run as software. The fields it would expose are read off DRAW's own notice contract.

Then the same five attacks against DRAW and the database.

## Results

| Attack (as recorded) | Database with a paid flag | DRAW on the ledger | Why DRAW stopped it |
|---|---|---|---|
| Mark an unpaid LP funded (`mark-unpaid-funded`) | Got through: one `UPDATE` set `paid` with no payment row | Stopped | Creating a `Funded` notice needs the LP's signature, and settling needs a matching allocation from the LP |
| Read another LP's notice (`read-without-role-filter`) | Got through: one query without `WHERE lp = ?` returned two other LPs' notices | Stopped | LP A's own ledger user, reading with no filter, got 0 other notices, and fetching LP B's notice by its id was refused |
| Reuse one payment for another notice (`replay-payment-evidence`) | Got through: an existing payment row was enough to flip another notice | Stopped | The allocation was consumed when it settled LP A, so it no longer exists to settle LP C |
| Count a payment row as money (`funded-without-asset-movement`) | Got through: a payment row was inserted, and no asset moved anywhere the database can check | Stopped | One place in the model sets `Funded`, inside `Obligation_Settle`, after `Allocation_ExecuteTransfer`. The read-back step marked an unbacked claim CONTRADICTED |
| LP changes its own notice (`lp-mutates-own-obligation`) | Stopped: LPs have no write path in this design | Stopped | Every choice on a notice belongs to the fund, and LP C's attempt to waive its own notice was refused |

Honest-path totals are identical on both: $750,000 funded, $250,000 unresolved. The difference only shows when someone misbehaves.

## Who the attacker is

The database attacker had write access to the database, as an operator or a compromised app server would. That's the threat this comparison tests, and whether it matters depends on who runs the database and who has to trust them. A fund that runs its own database is trusting its own staff and servers. LPs whose notices sit in someone else's database are trusting that operator as well.

On DRAW, the attempts that needed the fund ran as the fund's own ledger party, and the read and the self-change ran as LP A and LP C. The ledger refused each of them, and the read-back step contradicted the unbacked claim. Reading is a separate matter: anyone holding the fund's credential can read every LP's notice, since the fund is a party to each, and the operator of a participant can read every party it hosts ([below](#what-canton-does-not-change-here)).

## What a database does just as well

- Show the fund every notice. In DRAW the fund signs every notice, so it sees every LP too.
- Compute funded and unresolved totals when nobody misbehaves.
- Keep an LP from writing to the database at all.

## What Canton changes, narrowly

1. Privacy sits below the app. A query run as LP A never returns LP B's notice, even by contract id, because the ledger doesn't give it to LP A. A missing filter, or a new read path that runs as LP A, can't change that. In the database, privacy is one `WHERE` clause per query. This is shown on LocalNet, where each party reads with a separate ledger login. On DevNet the demo seats share one backend client, so the app picks which party it reads as, and DevNet shows party-scoped reads and transaction streams ([the scripted DevNet run](../evidence/devnet/runs/20261006T131900Z/streams.json)).
2. Funded follows the money. The notice turns funded only in the transaction that executes the token transfer, and that transfer needs the LP's prior consent, since the LP creates the allocation. In the database, `paid` is a column anyone with write access can set, and a payment row records a claim. No money moves.
3. A payment can't be reused. A settled allocation is consumed. In the database, replay protection is whatever the application remembered to check.

## What disappears without the Token Standard

The comparison above takes away Canton's privacy and the token settlement together. This part asks what DRAW would lose if it kept the ledger but replaced its CIP-0056 Token Standard settlement with an application-level `paid = true`. DRAW settles through an allocation because the allocation carries the notice's reference in fields the Daml contract reads (`settlementRef.id` and `transferLegId`). A plain transfer would put the reference only in metadata Daml can't read back (D-004 in [DECISIONS.md](DECISIONS.md)).

| With Token Standard settlement | With `paid = true` |
|---|---|
| The notice's reference travels inside the allocation (`settlementRef.id`, `transferLegId`), so the Daml contract checks the match | The app matches sender, receiver and amount, which can collide, or trusts a reference someone typed |
| `Obligation_Settle` executes the transfer and turns the notice funded in one transaction. Either both happen or neither does | Two writes in two systems, with a window where they disagree |
| The ledger refuses a wrong amount, payer, reference, instrument or executor | Each check is application code that can be skipped |
| A consumed allocation can't be presented again | Replay protection is app logic |
| The read-back step confirms holdings the fund received, owned by the fund, in the expected instrument, adding up to the amount due | Nothing to confirm. The flag is the evidence |
| The LP's balance falls and the fund's rises by exactly the funded units. The canonical runs on LocalNet and DevNet: fund +75, LP A -40, LP B -35, LP C 0 | Balances live elsewhere and are reconciled by hand |

The balance changes are in each canonical run's `totals.json`: [LocalNet, 2026-10-01](../evidence/local/runs/20261001T162427Z/totals.json), [LocalNet custody run](../evidence/local/runs/20261004T183146Z/totals.json) and [the scripted DevNet run](../evidence/devnet/runs/20261006T131900Z/totals.json). The comparison run tested two of these differences directly: on the database, a payment row with no asset moved and a reused payment each funded a notice, and DRAW stopped both.

## A ledger everyone can read

This one is field exposure only, and it wasn't run. If the same notices lived on a ledger every participant can read, such as a public chain settling in USDC, every participant, other LPs included, would get for each LP:

- its address or party (`lp`), which ties that LP's calls together
- its amount due (`amountDue`)
- its share of the call (`scenarioAmount`), which reveals its commitment size
- its due date (`dueAt`)
- whether it paid or is overdue (`state`)
- the settlement holdings

That's the LP book, which DRAW's one-contract-per-LP design exists to keep private. The field names are read off DRAW's own notice contract, and the list is in the comparison run's result file under counterfactual B.

## What Canton does not change here

- The fund sees every LP. It signs every notice, and DRAW doesn't hide LPs from their own fund.
- One operator can read everyone it hosts. On DevNet every party sits on one participant, and on LocalNet every LP does, so that operator can read them all. Production needs each LP on its own validator or with a provider it trusts.
- Per the Splice token design, the token registry (the DSO) is a stakeholder of each allocation and so sees its reference. References are random (`DRAW-` plus 16 hex characters) and name no one (D-009 in [DECISIONS.md](DECISIONS.md)). No run has read the DSO's view.
- Per the Splice Scan API docs, the Canton Coin leg of each payment appears in Scan with its random reference and the party ids, whose hints such as `draw-lpa` are readable, and the notices don't. We inferred this from the docs and haven't checked it against Scan.
- Subscription documents, fund terms, LP onboarding and KYC stay off the ledger. The commitment amount is on the ledger, but nothing there checks it against a signed subscription.
- Deciding to review, waive or chase an LP stays a human decision. DRAW records review and waive with a note.
- Bank wires. DRAW settles in a Canton token, a fund paid by wire still reconciles that wire elsewhere, and nothing in DRAW can mark a wire-paid notice funded.
- Off-ledger copies. Anything an LP screenshots or exports is outside the ledger's control.

## Limits of this comparison

- It's one run, on LocalNet, with package 0.2.0.
- It tested one reasonable database design. Stronger database controls, such as row-level security or separation of duties, weren't tested.
- The ledger everyone can read was never run. What it would expose is read off DRAW's own contract.
- The attacker model is write access to the database, set out under [Who the attacker is](#who-the-attacker-is). An attacker who operates a Canton participant wasn't tested, and the section above lists what such an operator can read.
- It doesn't measure cost or speed. Those are in [WORKLOAD_ECONOMICS.md](WORKLOAD_ECONOMICS.md).
