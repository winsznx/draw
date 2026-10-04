# DevNet deployment

Status: BLOCKED_ON_HUMAN. No DevNet run exists. Nothing in this repository may say DRAW runs on DevNet until `evidence/devnet/runs/` holds a passing run.

## What the organizers provided (2026-10-04)

NODERS hosts one shared DevNet participant for HackCanton (`hackcanton-01`). From their quickstart:

| Item | Value |
|---|---|
| JSON Ledger API | `https://ledger-api-json.participant.hackcanton-01.devnet.naas.noders.services` |
| Login | Keycloak realm `noders-appsfactory`, client `web-app-ui-hackcanton-01-devnet`, password grant then refresh token. Token `sub` is the ledger user |
| Validator and Scan proxy | `https://validator-api-http.validator.hackcanton-01.devnet.naas.noders.services`, Splice 0.8.4 (checked 2026-10-04). Token Standard registry under `/api/validator/v0/scan-proxy/registry` (Splice release notes: token-standard endpoints exposed on the scan proxy) |
| Parties | Created in the web Console, namespaced to the team, up to 20. The account's ledger user gets act-as and read-as on each |
| DAR upload | Web Console, Collections, Upload DAR |
| Canton Coin | Wallet faucet (TAP), or `AmuletRules_DevNet_Tap` through the ledger |
| Errors | The node returns a trace id instead of the cause. Look it up in their Grafana |

Consequence: one hackathon account is one credential for every party it creates. A DevNet run with one account proves party-scoped visibility and real settlement, not credential separation. The run records `credentialSeparation: NOT_TESTED_SINGLE_CREDENTIAL` and skips the two credential checks with that reason. Separate credentials need M2M clients from NODERS (requested 2026-10-04) or teammates' accounts. A participant replied that Daml privacy is protocol-level and works on the shared node, which is correct for party visibility and does not change the credential point.

Verified without an account (2026-10-04): the token endpoint and client id refuse fake credentials with `invalid_grant`, `/livez` answers 200, the scan proxy requires a token.

## Runbook with one hackathon account

1. Onboard once in the Wallet ("Onboard yourself").
2. In the Console: create parties `draw-admin`, `draw-lpa`, `draw-lpb`, `draw-lpc`, `draw-outsider`. Upload `contracts/daml/.daml/dist/draw-0.2.0.dar` under Collections.
3. In `.env`, uncomment the HackCanton DevNet block from `.env.example`, set `HACKCANTON_USERNAME`, `HACKCANTON_PASSWORD`, and the five party ids copied from the Console.
4. `node scripts/demo/run.mjs`. Evidence goes to `evidence/devnet/runs/<runId>/`.
5. Then `node app/server.mjs` with the same `.env` for the app on DevNet.

## Runbook with one client per role

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
