# DevNet deployment

Status: BLOCKED_ON_HUMAN. No DevNet run exists. Nothing in this repository may say DRAW runs on DevNet until `evidence/devnet/runs/` holds a passing run.

Blocker: the organizers' answer on participant access, OAuth clients, party provisioning, Scan and registry URLs, faucet, and traffic. The questions were drafted on 2026-10-02.

## Runbook once access exists

1. Copy `.env.example` to `.env`. Set `DRAW_NETWORK=devnet`, `DRAW_JSON_API`, `OAUTH_TOKEN_URL`, `OAUTH_AUDIENCE`, `OAUTH_SCOPE`, `REGISTRY_URL`, `SCAN_URL`, and `SCAN_AUTH_USER` if Scan sits behind the validator's proxy.
2. Parties:
   - If the organizers provide parties: fill `DRAW_<ROLE>_USER`, `DRAW_<ROLE>_PARTY`, and OAuth client id and secret for admin, lpA, lpB, lpC, outsider, and the verifier user (readAs admin only).
   - If they provide a participant-admin user: set `DRAW_OPERATOR_*`, run `node scripts/demo/provision.mjs devnet-draw`, paste the output into `.env`, then create one OAuth client per printed user.
3. Package: with `DRAW_OPERATOR_*` set, the run uploads `contracts/daml/.daml/dist/draw-0.2.0.dar`. Otherwise upload it through whatever path the organizers give, and the run checks the package id is present.
4. Faucet: the run taps 100 Amulet per LP with `AmuletRules_DevNet_Tap`. If DevNet disallows that, fund the LPs from the wallet faucet and set `DRAW_TAP_AMOUNT=0`.
5. Run `node scripts/demo/run.mjs`. Evidence goes to `evidence/devnet/runs/<runId>/`. The gate is `DEVNET_E2E` in `result.json`.
6. Restart check: stop and start the app server, then confirm the fund, obligations, and receipts render again from the ledger (`node app/server.mjs` with `DRAW_NETWORK=devnet`).
7. Run the campaign and the browser journey against DevNet if traffic allows. Keep DevNet and LocalNet evidence separate.
8. Fill in the sections below from the run's own files, then update `claims.yaml`, `GATES.md`, and `SPONSOR_FINDINGS.md` (DEVNET_VERIFIED only for what ran).

## Record (to fill from the DevNet run)

- Network and participant
- Package ids
- Party aliases and safe public identifiers
- Update ids for the call, the two settlements, and the overdue
- Failed workflow tests and their reasons
- Limitations specific to DevNet (traffic, shared participant, faucet)
