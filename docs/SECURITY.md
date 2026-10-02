# Security and trust model

This describes what the code does today, including where the demo is weaker than a production deployment would be.

## Powers on the ledger

| Party | Can | Cannot |
|---|---|---|
| Fund admin | Invite investors. Issue calls up to each LP's remaining commitment. Match a payment (`Obligation_MarkPaymentPending`). Settle with a matching allocation. Mark overdue after the due time. Send to review, reopen, release a stale pending payment, waive an overdue or reviewed obligation, each with a note | Create an obligation without the LP's signature. Mark anything funded without executing a matching transfer. Settle twice. Mark overdue early. Read any other fund's or party's contracts |
| LP | Accept or decline its invitation. Create allocations from its own holdings. Withdraw its own allocation any time before it is executed | See any other LP's commitment, obligation, or allocation. Change its own obligation. Settle anything |
| Unrelated party | Nothing on DRAW contracts | Read or act on any DRAW contract |
| Verifier user | Read as the fund admin | Submit anything (HTTP 403, checked every canonical run) |
| Token registry (DSO on LocalNet) | Sees every Amulet allocation and holding, including the settlement reference | See the obligation contract or anything not in the token flow |
| Participant operator | Read every party hosted on its participant | Act as a party without that party's rights in a submission it does not control |

Waiving is a real admin power. A waived obligation leaves the unresolved total. It always carries a note, and the LP sees that it was waived.

## Who creates parties and who signs

- LocalNet: the participant's `ledger-api-user` allocates parties and creates one ledger user per party with `actAs` and `readAs` on that party only. The verifier gets `readAs` on the admin only.
- DevNet: parties come from the organizers or from `scripts/demo/provision.mjs` run with a participant-admin user. Each role then authenticates with its own OAuth client.
- Token actions: the LP's ledger user submits `AllocationFactory_Allocate`. The admin's ledger user submits `Obligation_Settle`, which exercises `Allocation_ExecuteTransfer` using the authority the LP gave when it co-signed the obligation. That authority is usable only inside `Obligation_Settle`, after every correlation check passes.

## What the application server can and cannot fake

In the demo, the app server (`app/server.mjs`) holds a working credential for every role. On LocalNet the HS256 secret is `unsafe` and documented, so the server could mint a token for any user.

So the demo server **could** submit as an LP, which in production it must not be able to do. It **cannot** make an obligation funded without a real allocation from that LP executed on the ledger, cannot make the ledger show LP B's obligation to LP A, and cannot make a consumed allocation usable again. The UI shows FUNDED only when the ledger says `Funded` and a verifier receipt exists. A forged receipt file alone does nothing to ledger state, and the proof scripts re-read the ledger themselves.

## Production authentication (not built)

- Each person signs in through the fund's or the LP's identity provider and gets a token for their own ledger user only.
- The app server holds no LP credentials. LP payments are signed by the LP's own wallet or participant, for example through a CIP-0103 wallet provider.
- Each LP is hosted on its own validator or by a provider it trusts, so no single participant operator can read all LPs.
- The admin's settle and resolve actions are signed by the fund's operations users, not a shared service account.

## Settlement correlation

- Each obligation reference is `DRAW-` plus 16 random hex characters, unique within a call (checked by `Fund_IssueCall`) and random across calls.
- `Obligation_Settle` requires the allocation's settlement reference id and transfer leg id to equal the obligation reference, the executor and receiver to be the fund admin, the sender to be the obligated LP, the instrument to match, and the amount to equal the amount due. It then checks every receiver holding is owned by the admin, in the right instrument, and sums to the amount due.
- If two obligations ever shared a reference, LP, amount, and instrument, one allocation could settle either, but only one, because execution consumes it.

## Replay and duplicates

- Ledger: an executed allocation is archived. Presenting it again fails with contract not found. A funded obligation refuses another settlement. Both are tested on LocalNet and in the campaign.
- Verifier: also refuses an update id it already used for a different obligation, and refuses any update that does not itself settle the claimed obligation. Its memory of used update ids lasts only for the process. The ledger protection does not depend on it.
- A second matching payment after funding is classified `duplicate` and the LP withdraws it.

## Stale state

Every state change archives the obligation and creates a new contract id. An action against a stale contract id fails with contract not found. Reads retry until the expected state appears. Nothing is cached between requests except the session's party list.

## Frontend compromise

The browser only calls the app server. A compromised frontend can show wrong numbers on that screen. It cannot change ledger state beyond what the server's credentials allow, and the `/proof` page and evidence files are produced by scripts that read the ledger directly.

## Secrets

- `.env` is gitignored. `.env.example` lists names only.
- LocalNet's `unsafe` secret is public and only valid on LocalNet.
- DevNet OAuth client secrets go in `.env`, one per role.
- `internal/` (the directive) is gitignored.

## Demo role switcher

"Viewing as" switches which ledger user runs every query and action. It is a demo convenience, labelled as such in the footer. It is not a sign-in system.
