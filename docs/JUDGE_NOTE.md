# Judge note

This hackathon process record is the team's check on the story: what a judge should be able to say back after the [README](../README.md) or the demo, without knowing Daml. The product is in [PRODUCT.md](PRODUCT.md) and the proof in [PROOF.md](PROOF.md).

## After 10 seconds

Private capital calls on Canton. Each LP reads and pays only its own notice, and the fund counts the money as deployable only after a read-back step confirms the settlement on the ledger.

## After 30 seconds

In [the newest passing scripted DevNet run](../evidence/devnet/runs/20261007T130259Z), a fund called $1,000,000 from three investors (LPs). Two paid and one didn't. DRAW shows $750,000 deployable and $250,000 unresolved. Each LP's view of the ledger held only its own notice, and a payment that didn't match exactly was refused by the ledger and never counted.

That run is on the HackCanton shared DevNet node. In it each party signed its own transactions with its own key, with every party's key on the machine that ran it. On the live site DRAW's backend login signs for every demo seat. Both settle in Canton Coin from the DevNet faucet, and the dollar figures are the scenario.

## After 2 minutes

- Each LP's notice is a contract between the fund and that LP that no other LP or unrelated party can read, though the operator of the node that hosts them can. Another LP's ledger query returns nothing, even with the link.
- LPs pay in a Canton token. The payment carries the notice's reference, and the notice turns funded in the same transaction that moves the money. A read-back step confirms it before the dashboard counts it.
- The ledger refuses a wrong amount, the wrong payer, the wrong reference and a reused payment, on DevNet and on LocalNet.
- The unpaid LP stays unresolved, and the fund can mark it overdue only after the due time.
- In [a LocalNet run](../evidence/local/ablation/20261002T193830Z/result.json), the same call on an ordinary database with a paid flag let four of five attacks through, and none got through DRAW. The database attacker had write access, as an operator or a compromised app server would. That's the part Canton changes.

## Failure checks

If a judge remembers any of these, the story failed and the demo needs revising:

- "a privacy framework"
- "a verifier" or "an evidence console"
- "a Daml contract system"
- "an audit layer"
