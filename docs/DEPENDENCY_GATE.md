# Dependency gate

| Dependency | Class | Status | Fallback that preserves the claim |
|---|---|---|---|
| Daml SDK 3.5.12 (dpm), JDK 21 | AVAILABLE_NOW | Installed, builds, tests pass | n/a |
| Splice LocalNet 0.8.4 (Docker) | CAN_SELF_PROVISION | Worked through 2026-10-02 19:44 local. Docker then stopped and its disk image was removed. Needs about 5.5 GB re-pulled | None needed beyond re-provisioning. All LocalNet evidence is already frozen |
| Host disk | UNCONTROLLED | 14 GB free on 2026-10-02 evening. Has run out once and been cleaned twice | Free space before LocalNet work |
| AppsFactory / NODERS DevNet access | UNCONTROLLED_BLOCKING for the DevNet claim | BLOCKED_ON_HUMAN, organizer endpoint and credentials requested | LocalNet. README and UI never say DevNet until a DevNet run exists |
| Party creation and onboarding | CAN_SELF_PROVISION on LocalNet. Depends on organizers on DevNet | `provision.mjs` handles both cases | Provisioned-party mode already tested on LocalNet |
| Transaction signing path | AVAILABLE_NOW | Ledger users with JSON Ledger API tokens, HS256 on LocalNet, OAuth client credentials ready for DevNet | n/a |
| Token Standard V1 packages (metadata, holding, allocation, allocation-instruction) | AVAILABLE_NOW | DARs pinned from Splice 0.8.4 with sha256 in `SPONSOR_FINDINGS.md` | n/a |
| A usable settlement asset | AVAILABLE_NOW on LocalNet | Amulet, registry lists Allocation V1 support | On DevNet, Amulet via DevNet tap |
| Faucet | AVAILABLE_NOW on LocalNet | `AmuletRules_DevNet_Tap` with disclosed AmuletRules and open round from Scan | DevNet has the same choice when `isDevNet` is true |
| Participant-scoped read API | AVAILABLE_NOW | JSON Ledger API v2 ACS, updates, update-by-id, events-by-contract-id | n/a |
| Time and deadlines | AVAILABLE_NOW | Ledger time checked with `isLedgerTimeGE`. Overdue is an admin action after the due time. No scheduler | n/a |
| Hosting and runtime | AVAILABLE_NOW | Node 24, one process serves the API and the built React app | n/a |
| Browser for E2E | AVAILABLE_NOW | Installed Chrome via Playwright `channel: 'chrome'` | n/a |
| BitSafe | Not entered | `DECISIONS.md` D-002 | n/a |
| Grofty (MainNet wallet bounty) | UNCONTROLLED_BLOCKING for the bounty only | Not entered in the core pass | The season submission does not depend on it |
