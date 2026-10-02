# Judge note

What a judge should be able to say back, without knowing Daml.

## After 10 seconds

Private capital calls on Canton: each LP sees and funds only its own obligation, while the fund sees what capital is actually deployable.

## After 30 seconds

A fund called $1,000,000 from three investors. Two paid. One didn't. DRAW shows $750,000 deployable and $250,000 unresolved. Each investor could open only their own notice, and a payment that didn't match exactly was refused by the ledger instead of being counted.

## After 2 minutes

- Each investor's obligation is a contract only that investor and the fund can see. Another investor's ledger login gets nothing back, not even with the link.
- Investors pay in a Canton token. The payment carries the obligation's reference. The obligation becomes funded in the same transaction that moves the money, and a separate read-only check confirms it before the dashboard counts it.
- Wrong amount, wrong payer, wrong reference, or reusing someone else's payment: refused.
- The unpaid investor stays unresolved, and is marked overdue only after the due time.
- The same call run on a normal database with a paid flag lets four of five attacks through. That is the part Canton changes.

## Failure checks

If a judge remembers any of these, the story failed and the demo needs revising:

- "a privacy framework"
- "a verifier" or "an evidence console"
- "a Daml contract system"
- "an audit layer"
