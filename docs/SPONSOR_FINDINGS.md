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
| Amulet implements Allocation V1 | cn-quickstart `quickstart/daml/licensing/daml/Licensing/License.daml` pays licence fees through an Amulet allocation executed by the provider | real settlement path | UNVERIFIED |
| `POST /registry/allocation-instruction/v1/allocation-factory`, `POST /registry/allocations/v1/{id}/choice-contexts/execute-transfer` | Splice token-standard OpenAPI, reached through `http://scan.localhost:4000/registry` on LocalNet | get factory, choice context, and disclosed contracts | UNVERIFIED |
| Amulet instrument id `{admin = DSO party, id = "Amulet"}` | `GET /registry/metadata/v1/instruments` | obligation instrument | UNVERIFIED |
| V2 token standard | `TOKEN_STANDARD_V2_DEVNET.md` | not used, experimental DevNet only | n/a |

## LocalNet and Ledger API

| Primitive | Source | Use | Status |
|---|---|---|---|
| Splice LocalNet 0.8.4 docker compose, profiles `sv`, `app-provider`, `app-user` | https://docs.dev.sync.global/app_dev/testing/localnet.html | local network | UNVERIFIED |
| Auth: HS256 secret `unsafe`, audience `https://canton.network.global`, admin user `ledger-api-user` | `cluster/compose/localnet/conf/canton/*/app-auth.conf`, `env/*-auth-on.env` | per-party JWTs | UNVERIFIED |
| JSON Ledger API v2: `POST /v2/dars`, `POST /v2/parties`, `POST /v2/users`, `POST /v2/commands/submit-and-wait-for-transaction`, `POST /v2/state/active-contracts`, `GET /v2/state/ledger-end`, `POST /v2/updates`, `POST /v2/updates/update-by-id` | https://docs.canton.network/reference/json-api-reference/ | deploy, parties, commands, party-scoped reads | UNVERIFIED |
| `AmuletRules_DevNet_Tap` / `POST /api/validator/v0/wallet/tap` | Splice `AmuletRules.daml`, `wallet-internal.yaml` | fund LP test balances | UNVERIFIED |

## AppsFactory and NODERS

No starter, DevNet endpoint, or credential is present in the repo or environment. DevNet path is `BLOCKED_ON_HUMAN`.

## Grofty and BitSafe

Out of scope for this pass. See `docs/DECISIONS.md`.
