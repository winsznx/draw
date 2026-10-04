# Sponsor findings

What DRAW calls, where the fact came from, and whether we have run it. All sources read 2026-10-01.

Labels: `UNVERIFIED` (read, not run), `LOCAL_VERIFIED` (ran on LocalNet), `DEVNET_VERIFIED` (ran on DevNet). Daml Script results under `dpm test` are recorded as `SCRIPT_VERIFIED`, which is weaker than `LOCAL_VERIFIED` because no participant or real token is involved.

## Toolchain

| Primitive | Source | Version | Use | Status |
|---|---|---|---|---|
| `dpm` install, `dpm build`, `dpm test` | https://docs.canton.network/sdks-tools/cli-tools/dpm | SDK 3.5.x | build and test | SCRIPT_VERIFIED |
| JDK 17+ requirement | same | 3.5.x | runtime | SCRIPT_VERIFIED with JDK 21 |
| `--target=2.1` | Splice `daml/splice-amulet/daml.yaml` at tag 0.8.4 | Splice 0.8.4 | match the LF version of the token-standard DARs | SCRIPT_VERIFIED |
| `assertDeadlineExceeded` | `DA/Assert.daml` in SDK 3.5.3 stdlib | 3.5.3 | deadline check | Not available for LF 2.1 target. Replaced with `isLedgerTimeGE` from `DA.Time`: SCRIPT_VERIFIED |
| Contract keys | https://docs.canton.network/global-synchronizer/release-notes/canton-releases/3-5-1.md | Canton 3.5 | not used | Keys need LF 2.3 and are non-unique. DRAW passes contract ids instead |

## Daml privacy and authorization

| Primitive | Source | Use | Status |
|---|---|---|---|
| Stakeholders = signatories + observers. Witnesses of an exercise see its subtree | Daml ledger-privacy docs (`sdk/docs/manually-written/overview/explanations/ledger-model/ledger-privacy.rst`, SDK 3.5) | admin-only Fund and CapitalCall as roots, per-LP commitment and obligation | SCRIPT_VERIFIED by `test_visibility` |
| Divulgence does not grant later use in 3.x | same | no reliance on divulgence | UNVERIFIED as a behavior, not relied on |
| `query`, `queryContractId`, `queryInterface`, `trySubmit`, `setTime` | Daml Script API 3.5 (`Daml/Script/Internal/Questions/*.daml`) | tests | SCRIPT_VERIFIED |

## CIP-0056 Token Standard (V1)

DARs pinned from `hyperledger-labs/splice` tag `0.8.4`, `daml/dars/`:

| DAR | sha256 | package id |
|---|---|---|
| splice-api-token-metadata-v1-1.0.0 | 455eb160cb5abd4ae9918a6fbb9dad471f721adda39f0e5c76feef08d05637fc | 4ded6b668cb3b64f7a88a30874cd41c75829f5e064b3fbbadf41ec7e8363354f |
| splice-api-token-holding-v1-1.0.0 | ef75f8eb41a65810221784fdb78bb9dfac7cb22245aba14fa7cb7f69c34e0175 | 718a0f77e505a8de22f188bd4c87fe74101274e9d4cb1bfac7d09aec7158d35b |
| splice-api-token-allocation-v1-1.0.0 | c3f3b447142577ea4fa7d912ca11cd6821de7588e324e8877425932a02fccaa1 | 93c942ae2b4c2ba674fb152fe38473c507bda4e82b4e4c5da55a552a9d8cce1d |

| Primitive | Source | Use | Status |
|---|---|---|---|
| `AllocationView{allocation: AllocationSpecification{settlement: SettlementInfo{executor, settlementRef: Reference{id, cid}, ...}, transferLegId, transferLeg: TransferLeg{sender, receiver, amount, instrumentId, meta}}, holdingCids, meta}` | `token-standard/splice-api-token-allocation-v1/daml/Splice/Api/Token/AllocationV1.daml` at 0.8.4 | obligation correlation: `settlementRef.id` and `transferLegId` carry the obligation reference | SCRIPT_VERIFIED against a test implementation |
| `Allocation_ExecuteTransfer`, controllers = executor, sender, receiver | same | executed inside `Obligation_Settle` with admin + LP authority from the co-signed obligation | SCRIPT_VERIFIED against a test implementation |
| `HoldingView{owner, instrumentId{admin,id}, amount, lock, meta}` | `HoldingV1.daml` at 0.8.4 | check received holding owner, instrument, amount | SCRIPT_VERIFIED against a test implementation |
| Amulet implements Allocation V1 | cn-quickstart `quickstart/daml/licensing/daml/Licensing/License.daml`, registry `/metadata/v1/instruments` lists `splice-api-token-allocation-v1` for Amulet | real settlement path | LOCAL_VERIFIED (run 20261001T162427Z) |
| `POST /registry/allocation-instruction/v1/allocation-factory`, `POST /registry/allocations/v1/{id}/choice-contexts/execute-transfer`, `.../withdraw` | `token-standard/*/openapi/*.yaml` at 0.8.4, reached at `http://scan.localhost:4000/registry` | factory, choice context, disclosed contracts (AmuletRules, OpenMiningRound, ExternalPartyConfigState, ExternalPartyAmuletRules) | LOCAL_VERIFIED (run 20261001T162427Z) |
| Amulet instrument id `{admin = DSO party, id = "Amulet"}` | `GET /registry/metadata/v1/info` (`adminId`) and `/instruments` | obligation instrument | LOCAL_VERIFIED (run 20261001T162427Z) |
| V2 token standard | `TOKEN_STANDARD_V2_DEVNET.md` | not used, experimental DevNet only | n/a |

## LocalNet and Ledger API

| Primitive | Source | Use | Status |
|---|---|---|---|
| Splice LocalNet 0.8.4 docker compose, profiles `sv`, `app-provider`, `app-user` | https://docs.dev.sync.global/app_dev/testing/localnet.html | local network | LOCAL_VERIFIED. Images run natively on arm64 |
| Auth: HS256 secret `unsafe`, audience `https://canton.network.global`, admin user `ledger-api-user` | `docker-compose/localnet/env/*-auth-on.env` in the 0.8.4 bundle | per-party JWTs | LOCAL_VERIFIED. `ledger-api-user` gets HTTP 403 reading a party it has no rights for |
| JSON Ledger API v2: `POST /v2/packages`, `POST /v2/parties`, `POST /v2/users`, `POST /v2/commands/submit-and-wait-for-transaction`, `POST /v2/state/active-contracts`, `GET /v2/state/ledger-end`, `POST /v2/updates/update-by-id`, `POST /v2/events/events-by-contract-id` | https://docs.canton.network/reference/json-api-reference/ (Canton 3.5.19 on LocalNet) | deploy, parties, commands, party-scoped reads | LOCAL_VERIFIED (run 20261001T162427Z) |
| `AmuletRules_DevNet_Tap` with AmuletRules and an open OpenMiningRound disclosed from Scan `POST /api/scan/v0/amulet-rules` and `/v0/open-and-issuing-mining-rounds` | Splice `AmuletRules.daml` at 0.8.4 | fund LP test balances, submitted by each LP's own user | LOCAL_VERIFIED (run 20261001T162427Z). Wallet tap endpoint not used |

## AppsFactory and NODERS

No starter, DevNet endpoint, or credential is present in the repo or environment. DevNet path is `BLOCKED_ON_HUMAN`.

## Grofty and BitSafe

Out of scope for this pass. See `docs/DECISIONS.md`.

## HackCanton DevNet node (added 2026-10-04)

Source: NODERS "Canton DevNet Quickstart — HackCanton shared node" (hackmd.io/@IzUWaelHTRa_fG1NRW376w/HkBpCR5YGx), shared by the organizers on 2026-10-04.

| Primitive | Use | Status |
|---|---|---|
| Keycloak password grant and refresh token, client `web-app-ui-hackcanton-01-devnet`, audience `https://hackcanton-01.devnet.naas.noders.services` | Ledger API login | Endpoint and client checked with fake credentials (`invalid_grant`). Real login UNVERIFIED |
| JSON Ledger API v2 on the shared participant | All reads and commands | `/livez` 200. Commands UNVERIFIED |
| Validator `/api/validator/version` | Version check | 0.8.4, same as our LocalNet |
| Scan proxy GET `amulet-rules`, `open-and-issuing-mining-rounds` | Disclosed contracts for the tap | Paths from Splice 0.8.4 `scan-proxy.yaml`. Requires a token (401 without). UNVERIFIED with a token |
| Token Standard registry through the scan proxy, `/api/validator/v0/scan-proxy/registry/...` | Allocation factory and choice contexts | From Splice release notes ("Expose token-standard endpoints on the validator scan-proxy"). UNVERIFIED on this node |
| Console party creation and DAR upload | Parties and package | Manual, web UI |
| Error responses with a trace id only | Refusal checks | The run accepts a trace-id refusal and marks the reason hidden |

## Token Standard V2 (CIP-0112)

CIP-0112, "Canton Network Token Standard V2 - Improvements for Privacy, Performance and Traditional Accounting", status Approved, created 2026-03-31. Per a summary of the CIP (not read in full): backward compatible with CIP-0056, adds committed allocations for prefunded workflows, account structures beyond single-party holdings, and batch settlement. Our LocalNet registry listed `splice-api-token-allocation-v2` support for Amulet. DRAW uses V1 allocations. Committed allocations could let an LP prefund a call before it is due. Not used, UNVERIFIED.
