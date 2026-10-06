# Dependency gate

Updated 2026-10-06.

| Dependency | Class | Status | Fallback that preserves the claim |
|---|---|---|---|
| Daml SDK 3.5.12 (dpm), JDK 21 | AVAILABLE_NOW | Installed, builds, tests pass | n/a |
| Splice LocalNet 0.8.4 (Docker) | CAN_SELF_PROVISION | Re-pulled and used on 2026-10-04 and 2026-10-05 for the custody run, the clean room and the browser journeys. Not running on 2026-10-06, because the host is low on disk | None needed beyond re-provisioning. All LocalNet evidence is already frozen |
| Host disk | UNCONTROLLED | Low again on 2026-10-06. Has run out once and been cleaned twice | Free space before LocalNet work |
| AppsFactory / NODERS DevNet access | AVAILABLE since 2026-10-04, single credential | One hackathon login on the NODERS shared node acts for every party it creates. A read-only login and external parties depend on NODERS | LocalNet for credential separation and keys held by each party. DevNet claims carry the single-login label |
| Party creation and onboarding | CAN_SELF_PROVISION on LocalNet. Depends on organizers on DevNet | `provision.mjs` handles both cases. On the HackCanton node, parties are created in the Console, and external parties need NODERS to allocate them (our own allocate call is refused with HTTP 403, saved in `evidence/devnet/probes/20261006T091205Z`) | Provisioned-party mode tested on LocalNet and used on DevNet |
| Transaction signing path | AVAILABLE_NOW | Ledger users with JSON Ledger API tokens: HS256 on LocalNet, the Keycloak password grant on the HackCanton node. Interactive submission signed by each party's key on LocalNet | n/a |
| Token Standard V1 packages (metadata, holding, allocation, allocation-request, allocation-instruction) | AVAILABLE_NOW | DARs pinned from Splice 0.8.4 with sha256 in `SPONSOR_FINDINGS.md`. The allocation-request DAR was added for draw 0.3.0 | n/a |
| A usable settlement asset | AVAILABLE_NOW | Amulet on LocalNet and Canton Coin on DevNet, both through registries that list Allocation V1 | USDCx would need TestNet or MainNet |
| Faucet | AVAILABLE_NOW | `AmuletRules_DevNet_Tap` with disclosed AmuletRules and open round from Scan, used on LocalNet and in the DevNet runs | The wallet faucet on DevNet |
| Participant-scoped read API | AVAILABLE_NOW | JSON Ledger API v2 ACS (paged through `active-contracts-page` since 2026-10-06), updates, update-by-id, events-by-contract-id | n/a |
| Time and deadlines | AVAILABLE_NOW | Ledger time checked with `isLedgerTimeGE`. Overdue is an admin action after the due time. No scheduler | n/a |
| Hosting and runtime | AVAILABLE_NOW | Web on Cloudflare Workers through OpenNext, API on a Hostinger VPS behind Caddy, live since 2026-10-05 (`DEPLOY.md`) | n/a |
| Browser for E2E | AVAILABLE_NOW | Installed Chrome via Playwright `channel: 'chrome'` | n/a |
| BitSafe | Not entered | `DECISIONS.md` D-002 | n/a |
| Grofty (MainNet wallet bounty) | UNCONTROLLED_BLOCKING for the bounty only | Not entered in the core pass | The season submission does not depend on it |
