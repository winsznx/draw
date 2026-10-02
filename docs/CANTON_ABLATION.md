# Canton ablation

Evidence: `evidence/local/ablation/20261002T193830Z/result.json`, written by `node scripts/eval/ablation.mjs`.

## What was compared

The same $1,000,000 call (LP A $400k paid, LP B $350k paid, LP C $250k unpaid) on three systems:

- **Full system**: DRAW on a LocalNet participant. Party-scoped Daml contracts, Amulet settlement through a CIP-0056 allocation executed inside `Obligation_Settle`.
- **Ablation A (centralized database)**: `node:sqlite` with an obligations table, a payments table, a `paid` flag, and role filtering in the application's queries. It is a reasonable design, not a broken one.
- **Ablation B (transparent shared ledger)**: every obligation replicated to every participant. Not run as software. The exposed fields are read off DRAW's own obligation contract.

Then the same five attacks against each.

## Results

| Attack | Database with a paid flag | DRAW on the ledger | Why DRAW stopped it |
|---|---|---|---|
| Mark an unpaid investor funded | Succeeds: one `UPDATE` | Stopped | Creating a `Funded` obligation needs the LP's signature. Settling needs a matching allocation |
| Read another investor's obligation | Succeeds: one query without `WHERE lp = ?` returns two other investors | Stopped | LP A's own ledger user, unfiltered, returned 0 other obligations. Fetch by id refused |
| Reuse one payment for another obligation | Succeeds | Stopped | The allocation was consumed when it settled LP A, so the contract no longer exists |
| Funded with no asset moved | Succeeds: a payments row is not money | Stopped | One place in the model sets `Funded`, inside `Obligation_Settle`, after `Allocation_ExecuteTransfer`. The verifier marked an unbacked claim CONTRADICTED |
| Investor changes its own obligation | Stopped: LPs have no write path | Stopped | Every obligation choice is controlled by the admin |

Honest-path totals are identical on both: $750,000 funded, $250,000 unresolved.

## What a database does just as well

- Show the admin every obligation. In DRAW the admin is a signatory on every obligation, so the admin sees everything too.
- Compute funded and unresolved totals when nobody misbehaves.
- Keep an LP from writing to the database at all.

## What Canton changes, narrowly

1. **The privacy boundary sits below the application.** LP A's own credential cannot obtain LP B's record through any query, because the ledger does not return it to LP A. A missing filter or a new read path that runs as LP A cannot change that. In the database, privacy is one `WHERE` clause per query. What Canton does not stop: anyone holding the fund admin's credential, or operating the participant that hosts several LPs, can read what those parties can read.
2. **Funded is a consequence of moving the asset.** The obligation flips to `Funded` only in the same transaction that executes the token transfer, and the transfer needs the LP's prior authority. In the database, `paid` is a column anyone with write access can set, and a payments row is a claim about money, not money.
3. **Evidence cannot be reused.** A settled allocation is consumed. In the database, replay protection is whatever the application remembered to check.

## Ablation B: a globally visible ledger

Every participant, including other LPs and unrelated parties, would receive for every LP: identity (`lp`), `amountDue`, `scenarioAmount` (its share of the call, which reveals commitment size), `dueAt`, and `state` (who paid, who is overdue), plus the settlement holdings. That is the LP book, which DRAW's per-LP contracts exist to avoid.

## Limits of this ablation

- Ablation A was attacked by someone with write access to the database. That is the operator or a compromised app server. Whether that threat matters depends on who runs the database and who has to trust them.
- On LocalNet one participant hosts all LPs, so the participant operator could read them all. In production each LP would use its own validator, or a provider it trusts.
- The admin in DRAW still sees every LP. DRAW does not hide LPs from their own fund.
