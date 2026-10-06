# Dependency gate

This hackathon process record lists each outside dependency DRAW relies on, its status, and the fallback that keeps the claim if it fails. The product is in [PRODUCT.md](PRODUCT.md) and the proof in [PROOF.md](PROOF.md).

Updated 2026-10-06. The Class column says how much the team controls each one: AVAILABLE_NOW is in hand, CAN_SELF_PROVISION is something the team can set up itself, and the rest depend on someone else.

| Dependency | Class | Status | Fallback that preserves the claim |
|---|---|---|---|
| Daml SDK 3.5.12 (dpm), JDK 21 | AVAILABLE_NOW | Installed, builds, tests pass | n/a |
| Splice LocalNet 0.8.4 (Docker) | CAN_SELF_PROVISION | Re-pulled and used on 2026-10-04 and 2026-10-05 for the custody run, the clean room and the browser journeys. Not running on 2026-10-06 | None needed beyond re-provisioning. All LocalNet evidence is already frozen |
| AppsFactory / NODERS DevNet access | AVAILABLE since 2026-10-04. Clients for DRAW since 2026-10-06 | On 2026-10-06 NODERS issued DRAW three Keycloak clients: a backend client that acts for the five demo parties and nothing else, a verifier client, and a public web client for sign-in. Before that one hackathon login acted for every party the team created. A HackCanton login whose party is onboarded in the node's wallet can also sign in to the web app as an LP, tested with the team's own login. The verifier client can also act for the team's personal party ([probe](../evidence/devnet/probes/20261006T133219Z/result.json)), so a read-only login, and external parties, still depend on NODERS | LocalNet for credential separation between LPs and keys held by each party. DevNet claims carry the backend-client label |
| Party creation and onboarding | CAN_SELF_PROVISION on LocalNet. Depends on organizers on DevNet | [provision.mjs](../scripts/demo/provision.mjs) handles both cases. On the HackCanton node, parties are created in the Console, and external parties need NODERS to allocate them (our own allocate call is refused with HTTP 403, saved in [this probe](../evidence/devnet/probes/20261006T091205Z/result.json)) | Provisioned-party mode tested on LocalNet and used on DevNet |
| Transaction signing path | AVAILABLE_NOW | Ledger users with JSON Ledger API tokens: HS256 on LocalNet, Keycloak client credentials on the HackCanton node (the live site used the password grant until about 13:25 UTC on 2026-10-06), and for a signed-in LP the Keycloak authorization code flow with PKCE in its browser. Interactive submission signed by each party's key on LocalNet | n/a |
| Token Standard V1 packages (metadata, holding, allocation, allocation-request) | AVAILABLE_NOW | DARs pinned from Splice 0.8.4 with sha256 in [SPONSOR_FINDINGS.md](SPONSOR_FINDINGS.md). The allocation-request DAR was added for draw 0.3.0 | n/a |
| A usable settlement asset | AVAILABLE_NOW | Amulet on LocalNet and Canton Coin on DevNet, both through registries that list Allocation V1 | USDCx would need TestNet or MainNet |
| Faucet | AVAILABLE_NOW | `AmuletRules_DevNet_Tap` with disclosed AmuletRules and open round from Scan, used on LocalNet and in the DevNet runs | The wallet faucet on DevNet |
| Participant-scoped read API | AVAILABLE_NOW | JSON Ledger API v2 ACS (paged through `active-contracts-page` since 2026-10-06), updates, update-by-id, events-by-contract-id | n/a |
| Time and deadlines | AVAILABLE_NOW | Ledger time checked with `isLedgerTimeGE`. Overdue is a click by the fund after the due time. No scheduler | n/a |
| Hosting and runtime | AVAILABLE_NOW | Web on Cloudflare Workers through OpenNext, API on a Hostinger VPS behind Caddy, live since 2026-10-05 ([DEPLOY.md](DEPLOY.md)) | n/a |
| Browser for E2E | AVAILABLE_NOW | Installed Chrome via Playwright `channel: 'chrome'` | n/a |
| Grofty and BitSafe bounties | Not entered | Out of scope for this pass ([DECISIONS.md](DECISIONS.md) D-001 and D-002) | The season submission doesn't depend on either |
