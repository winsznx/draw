# Decisions

This is a hackathon process record of DRAW's design decisions: what was decided, why, and, where it's known, what would reverse it. The product is described in [PRODUCT.md](PRODUCT.md), the design in [ARCHITECTURE.md](ARCHITECTURE.md) and the proof in [PROOF.md](PROOF.md).

## D-001 Grofty is out of this pass (2026-10-01)

Grofty is MainNet-only, invite-only, and its wallet submits only as the single connected party. It can't be the settlement proof for DRAW, and it can't carry the fund's flows or the privacy flows.

This pass proves the capital-call lifecycle on LocalNet with a separate ledger login per party, and DevNet runs followed from 2026-10-04 ([DEVNET_DEPLOYMENT.md](DEVNET_DEPLOYMENT.md)). Grofty was optional for this build and could start only after the `DAML_CORE`, `LOCAL_SETTLEMENT` and `PRIVACY_CAMPAIGN` gates passed ([GATES.md](GATES.md)). It stays blocked until there is a Grofty invite, a funded MainNet party, receive preapproval on the fund's party, and the owner's go-ahead for small transfers with real money. The `grofty` claim in [claims.yaml](../claims.yaml) is marked blocked and points here.

A Grofty signature would be `ACKNOWLEDGED` or `TRANSFER_EXECUTED`, never `VERIFIED_FUNDED`, until a separate read confirms the holding or update.

## D-002 BitSafe is not entered (2026-10-01)

DRAW has no decentralized-party or decentralization-manager module. The fit is unverified, and building one would pull DRAW away from the capital-call workflow.

## D-003 No BRIDGED state (2026-10-01)

Financing is a separate product hypothesis. The states are ISSUED, PAYMENT_PENDING, FUNDED, OVERDUE, WAIVED and MANUAL_REVIEW ([ARCHITECTURE.md](ARCHITECTURE.md#states)).

## D-004 Settle through CIP-0056 allocation, not a plain transfer (2026-10-01)

An allocation carries the obligation reference in `settlementRef.id` and `transferLegId`, plus sender, receiver, executor, amount and instrument, in its on-ledger view. `Obligation_Settle` checks all of them in Daml and executes the transfer in the same transaction, so correlation doesn't depend on an off-ledger matcher reading transfer metadata. A plain `TransferFactory_Transfer` would put the reference only in choice-argument metadata, which Daml can't read back.

Reverse if the network DRAW runs on doesn't support Amulet allocations. LocalNet 0.8.4 does ([the first canonical LocalNet run](../evidence/local/runs/20261001T162427Z/)), and so does the HackCanton DevNet node ([the canonical DevNet run](../evidence/devnet/runs/20261007T130259Z/)). The USDCx MainNet registry's metadata lists the same allocation API, `splice-api-token-allocation-v1`, but DRAW hasn't run with USDCx.

## D-005 Obligations are co-signed by admin and LP (2026-10-01)

`Allocation_ExecuteTransfer` requires executor, sender and receiver authority. The LP's signature on the obligation, given once when it accepts its commitment, supplies sender authority inside `Obligation_Settle` and nowhere else. So the LP doesn't sign each call, and DRAW's contract refuses a call above its remaining commitment, which is tested in Daml Script and hasn't run on a ledger yet. Mutation runs show that removing the sender or executor check still fails on Daml authorization.

## D-006 Deadline check uses isLedgerTimeGE (2026-10-01)

`assertDeadlineExceeded` isn't in the LF 2.1 stdlib that SDK 3.5.12 ships. `--target=2.1` matches the Splice token-standard DARs. `isLedgerTimeGE` is available and used instead.

## D-007 Test token lives only in the test package (2026-10-01)

`draw-tests` implements Holding and Allocation for `dpm test` ([Token.daml](../contracts/tests/daml/Draw/Test/Token.daml)). It isn't uploaded to any participant and is never cited as settlement evidence. LocalNet evidence uses Amulet, and DevNet evidence uses Canton Coin.

## D-008 Participant placement on LocalNet (2026-10-01)

The fund's party (`admin`) is on `app-provider`, and the LPs and the unrelated party are on `app-user`. Each party has its own ledger user with actAs and readAs on that party only. The read-back user is a separate user on `app-provider` with readAs on the fund and no actAs. The participant operator could read every hosted party. That is a LocalNet limit. On the HackCanton DevNet node every party sits on one participant, so the same holds there. Production needs each LP on its own validator or with a provider it trusts.

## D-009 Opaque obligation references (2026-10-01)

Per the Splice token design, the DSO is a stakeholder of every Amulet allocation and sees `settlementRef.id`. No run has read the DSO's view. References are random (`DRAW-<16 hex>`), so the registry's view doesn't reveal LP names, the fund or the call.

Party ids are a separate matter. On the DevNet node their hints, such as `draw-lpa`, are readable. Per the Splice Scan API docs, the Canton Coin leg of each payment appears in Scan with its random reference and the party ids, and the notices don't. We inferred this from the docs and haven't checked it against Scan. Opaque party ids for new parties are on the roadmap.

## D-010 The payment request implements AllocationRequest V1 only (2026-10-06)

Package 0.3.0 adds `PaymentRequest`, which implements the CIP-0056 AllocationRequest V1 interface, so the LP's Canton wallet can show each notice and create exactly the allocation `Obligation_Settle` accepts. Only V1 is implemented. The allocation-request DAR is pinned from Splice 0.8.4, the release LocalNet and the HackCanton node run, next to the V1 allocation, holding and metadata DARs DRAW already used. [SPONSOR_FINDINGS.md](SPONSOR_FINDINGS.md) records AllocationRequest V2 as read and not used, and CIP-0112, Token Standard V2, as approved and backward compatible with V1, read from a summary only. The node's Canton Coin wallet lists DRAW's V1 requests with Accept, and its Accept paid one in runs with the team's own login. The USDCx MainNet registry's metadata lists the V1 allocation API DRAW settles through, and the V2 allocation APIs as well.

Not used: AllocationRequest V2's `AllocationRequest_Accept` choice, and the committed allocations of Token Standard V2 (CIP-0112), which could let an LP prefund a call before it is due.

## D-011 An LP signs in from its own browser, and the server never receives its token (2026-10-06)

When an LP signs in with HackCanton, its browser runs the sign-in on the node's Keycloak with PKCE, keeps the token in the tab, reads its notices from the ledger, accepts its commitment and pays from its own Canton wallet, all with its own token. DRAW's server learns only the LP's party id, from the `join` action, and invites that party as the fund manager.

Why: in the production model the app server holds no LP credentials, and LP payments are signed by the LP's own wallet or participant ([SECURITY.md](SECURITY.md#production-authentication-not-built-apart-from-lp-sign-in-on-the-hackcanton-node)). `join` is harmless with any party id, because an invitation does nothing until that party accepts it with its own credential. The token sits in the tab's session storage. The site loads no third-party scripts, but anything that runs in that tab could use the token ([LIMITATIONS.md](LIMITATIONS.md)). Sign-in for the fund manager seat isn't built.

## D-012 The verifier client stays off the live server (2026-10-06)

NODERS issued DRAW a verifier client for the read-back step. The ledger refused it when it tried to act as the fund in [run 20261006T131900Z](../evidence/devnet/runs/20261006T131900Z/), but [the probe of the NODERS clients](../evidence/devnet/probes/20261006T133219Z/result.json) found it could also act and read as the team's personal wallet party, so it wasn't read-only. Every sign-in run up to then used that personal party as the LP, so on the live server the verifier client could have acted for the signed-in LP. The live server held only the backend client, and the read-back read through that same client. The scripted run still used the verifier client, and checked that it can't submit as the fund.

Reverse when NODERS removes the extra right and the probe's read-only check passes ([DEPLOY.md](DEPLOY.md), [LIMITATIONS.md](LIMITATIONS.md)).

Reversed on 2026-10-07. NODERS removed the right, [probe 20261007T125624Z](../evidence/devnet/probes/20261007T125624Z/result.json) records the verifier client reading only as the fund, and the live server has read back through it since about 13:00 UTC that day.
