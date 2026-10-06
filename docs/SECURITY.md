# Security and trust model

This describes what the code does today, including where the demo is weaker than a production deployment would be.

## Powers on the ledger

| Party | Can | Cannot |
|---|---|---|
| Fund admin | Invite investors. Name a verifier party when it creates a fund. Issue calls up to each LP's remaining commitment, which also sends each LP a payment request. Withdraw a payment request. Match a payment (`Obligation_MarkPaymentPending`). Settle with a matching allocation. Mark overdue after the due time. Send to review, reopen, release a stale pending payment, waive an overdue or reviewed obligation, each with a note | Create an obligation without the LP's signature. Mark anything funded without executing a matching transfer. Settle twice. Mark overdue early. Close another obligation's payment request when settling or waiving. Read any other fund's or party's contracts |
| LP | Accept or decline its invitation. Read its own payment request and reject it, which leaves the obligation open. Create allocations from its own holdings, from that request or with the reference set directly. Withdraw its own allocation any time before it is executed | See any other LP's commitment, obligation, payment request or allocation. Change its own obligation. Withdraw a payment request. Settle anything |
| Unrelated party | Nothing on DRAW contracts | Read or act on any DRAW contract |
| Verifier user | Read as the fund admin | Submit anything, on LocalNet (HTTP 403, checked every LocalNet canonical run). On the DevNet node the read-back step uses the shared hackathon login, which can submit |
| Verifier party (package 0.3.0, optional, Daml Script only) | Read the fund that names it, every call and every obligation, including the settlement record | Act on the obligations or the fund (refused in `test_verifier`). See commitments, invitations or payment requests |
| Token registry (the DSO) | Sees every Amulet allocation and holding, including the settlement reference | See the obligation contract or anything not in the token flow |
| Scan, the network's explorer | Shows the Canton Coin leg of each payment, with the party ids and the random reference, per the Splice Scan API docs. Inferred, not checked against Scan | Show the obligation contracts, per the same docs |
| Participant operator | Read every party hosted on its participant | Act as a party without that party's rights in a submission it does not control |

Waiving is a real admin power. A waived obligation leaves the unresolved total. It always carries a note, and the LP sees that it was waived.

## Who creates parties and who signs

- LocalNet: the participant's `ledger-api-user` allocates parties and creates one ledger user per party with `actAs` and `readAs` on that party only. The verifier gets `readAs` on the admin only.
- DevNet, on the HackCanton node: the team creates parties in the node's Console, and one hackathon login (Keycloak password grant) acts for all of them. A node that offers a participant-admin user or one OAuth client per role is also supported, through `scripts/demo/provision.mjs`.
- Non-custodial mode (`DRAW_PARTY_MODE=external`, LocalNet): each party is an external party with its own Ed25519 key. The participant prepares each transaction, the party's key signs it, and the participant executes it. The server's ledger user is refused when it tries to act for the party.
- Token actions: the LP's ledger user submits `AllocationFactory_Allocate`, either from its payment request's settlement and leg, the way a Token Standard wallet would, or with the obligation reference set directly. The admin's ledger user submits `Obligation_Settle`, which exercises `Allocation_ExecuteTransfer` using the authority the LP gave when it co-signed the obligation. That authority is usable only inside `Obligation_Settle`, after every correlation check passes.

## What the application server can and cannot fake

In the demo, the app server (`app/server.mjs`) holds a working credential for every role. On LocalNet the HS256 secret is `unsafe` and documented, so the server could mint a token for any user. On the DevNet node it holds the one hackathon login that acts for every party. The live API answers only the web app's proxy, which adds a service token, and refuses any action without the demo access code.

So the demo server could submit as an LP, which in production it must not be able to do. It cannot make an obligation funded without a real allocation from that LP executed on the ledger, cannot make the ledger show LP B's obligation to LP A, and cannot make a consumed allocation usable again. The UI shows FUNDED only when the ledger says `Funded` and a verifier receipt exists. A forged receipt file alone does nothing to ledger state, and the proof scripts re-read the ledger themselves.

## Production authentication (not built)

- Each person signs in through the fund's or the LP's identity provider and gets a token for their own ledger user only.
- The app server holds no LP credentials. LP payments are signed by the LP's own wallet or participant, for example through a CIP-0103 wallet provider.
- Each LP is hosted on its own validator or by a provider it trusts, so no single participant operator can read all LPs.
- The admin's settle and resolve actions are signed by the fund's operations users, not a shared service account.

## Settlement correlation

- Each obligation reference is `DRAW-` plus 16 random hex characters, unique within a call (checked by `Fund_IssueCall`) and random across calls.
- `Obligation_Settle` requires the allocation's settlement reference id and transfer leg id to equal the obligation reference, the executor and receiver to be the fund admin, the sender to be the obligated LP, the instrument to match, and the amount to equal the amount due. It then checks every receiver holding is owned by the admin, in the right instrument, and sums to the amount due.
- If two obligations ever shared a reference, LP, amount, and instrument, one allocation could settle either, but only one, because execution consumes it.
- Each payment request names the same reference, payer, receiver, amount and instrument as its obligation, so an allocation made from it passes these checks unchanged. `Obligation_Settle` and `Obligation_Waive` archive the request when given its id, and refuse a request that belongs to another obligation.

## Replay and duplicates

- Ledger: an executed allocation is archived. Presenting it again fails with contract not found. A funded obligation refuses another settlement. Both are tested on LocalNet and in the campaign.
- Verifier: also refuses an update id it already used for a different obligation, and refuses any update that does not itself settle the claimed obligation. Its memory of used update ids lasts only for the process. The ledger protection does not depend on it.
- A second matching payment after funding is classified `duplicate` and the LP withdraws it.

## Stale state

Every state change archives the obligation and creates a new contract id. An action against a stale contract id fails with contract not found. Reads retry until the expected state appears. Nothing is cached between requests except the session's party list.

## Frontend compromise

The browser only calls the web app on Cloudflare, which proxies `/api` and `/evidence` to the API with a service token. A compromised frontend can show wrong numbers on that screen. It cannot change ledger state beyond what the server's credentials allow, and the `/proof` page and evidence files are produced by scripts that read the ledger directly.

## Secrets

- `.env` is gitignored. `.env.example` lists names only.
- LocalNet's `unsafe` secret is public and only valid on LocalNet.
- DevNet OAuth client secrets go in `.env`, one per role.
- `internal/` (the directive) is gitignored.
- `DRAW_SERVICE_TOKEN` lives in the API's `.env` and as a Worker secret. The Cloudflare build blanks every non-public variable and scans its output for secret values before deploying (`web/scripts/cloudflare.mjs`).
- On 2026-10-06, gitleaks 8.30.1 and a check for every value in `.env` found no secret in the 45 commits up to `94ffc14`. The same day, gitleaks found nothing in the files not yet committed (modified or untracked, outside ignored paths), and the only sensitive `.env` value in them is LocalNet's public `unsafe` secret. Re-run both on the release commit at the freeze and record its id and date here.

## Demo role switcher

The seat chosen at onboarding, and "Switch seat", decide which party every query and action runs as. On LocalNet that means a different ledger user per party. On DevNet one shared login queries as the chosen party, and the screens say so. It is a demo convenience. A sign-in system is in the production model above.
