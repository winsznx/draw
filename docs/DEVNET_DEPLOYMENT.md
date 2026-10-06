# DevNet deployment

Status: DEVNET_E2E PASS on 2026-10-06 on package 0.3.0, `evidence/devnet/runs/20261006T091531Z/result.json`, 79 of 79 checks, single credential. The first DevNet PASS was on 2026-10-04 on package 0.2.0, `evidence/devnet/runs/20261004T120110Z` (72 of 72). Two runs before it aborted on run-script bugs, and a dirty-tree PASS earlier on 2026-10-06 was superseded. All are kept. The live web app runs on the same node with the same login (`docs/DEPLOY.md`), and its browser journey passed twice on 2026-10-05 and again on 2026-10-06 with a demo fund per browser.

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

Consequence: one hackathon account is one credential for every party it creates. A DevNet run with one account proves party-scoped visibility and on-ledger settlement, not credential separation. The run records `credentialSeparation: NOT_TESTED_SINGLE_CREDENTIAL` and skips the two credential checks with that reason. Separate credentials need M2M clients from NODERS (requested 2026-10-04, no answer on file) or teammates' accounts. A participant replied that Daml privacy is protocol-level and works on the shared node, which is correct for party visibility and does not change the credential point.

Two narrower routes would each close part of that gap, and both need NODERS:

- A second login whose ledger user has only CanReadAs on the fund party. The read-back step would then run with a login that can't submit, and the skipped check "verifier token cannot submit as admin" could run. The NODERS operator console can grant CanReadAs on its own. The run script uses such a login when `DRAW_VERIFIER_USER`, `DRAW_VERIFIER_CLIENT_ID` and `DRAW_VERIFIER_CLIENT_SECRET` are set, which hasn't run on a ledger yet.
- External parties allocated by NODERS for keys we hold, so each LP signs its own DevNet payment, as in the LocalNet custody run. On this node, allocating one takes a participant admin, an identity provider admin, or the self path, whose quota defaults to 0 in Canton 3.5. Our own `/v2/parties/external/allocate` call is refused with HTTP 403. That was first reported on 2026-10-04 without saved output, and the read-only probe `evidence/devnet/probes/20261006T091205Z` saved it, along with `generate-topology` and a prepare-only interactive submission working for our login. Signed allocation requests for five parties, built from `generate-topology` on 2026-10-06, are ready for NODERS. Once they exist, `DRAW_PARTY_MODE=external-provisioned` reads them from `DRAW_EXTERNAL_PARTIES_FILE`, which hasn't run on a ledger yet. Sources and probe details are in `SPONSOR_FINDINGS.md`.

Verified without an account (2026-10-04): the token endpoint and client id refuse fake credentials with `invalid_grant`, `/livez` answers 200, the scan proxy requires a token.

## Runbook with one hackathon account

1. Onboard once in the Wallet ("Onboard yourself").
2. In the Console: create parties `draw-admin`, `draw-lpa`, `draw-lpb`, `draw-lpc`, `draw-outsider`. Upload the committed `contracts/dist/draw-0.3.0.dar` under Collections (or `contracts/daml/.daml/dist/draw-0.3.0.dar` after a local build, which has the same package id). 0.3.0 is a Smart Contract Upgrade of 0.2.0, which the node already had from 2026-10-04.
3. In `.env`, uncomment the HackCanton DevNet block from `.env.example`, set `HACKCANTON_USERNAME`, `HACKCANTON_PASSWORD`, and the five party ids copied from the Console.
4. `node scripts/demo/run.mjs`. Evidence goes to `evidence/devnet/runs/<runId>/`.
5. Then `node app/server.mjs` with the same `.env` for the app on DevNet.

## Runbook with one client per role

1. Copy `.env.example` to `.env`. Set `DRAW_NETWORK=devnet`, `DRAW_JSON_API`, `OAUTH_TOKEN_URL`, `OAUTH_AUDIENCE`, `OAUTH_SCOPE`, `REGISTRY_URL`, `SCAN_URL`, and `SCAN_AUTH_USER` if Scan sits behind the validator's proxy.
2. Parties:
   - If the organizers provide parties: fill `DRAW_<ROLE>_USER`, `DRAW_<ROLE>_PARTY`, and OAuth client id and secret for admin, lpA, lpB, lpC, outsider, and the verifier user (readAs admin only).
   - If they provide a participant-admin user: set `DRAW_OPERATOR_*`, run `node scripts/demo/provision.mjs devnet-draw`, paste the output into `.env`, then create one OAuth client per printed user.
3. Package: with `DRAW_OPERATOR_*` set, the run uploads `contracts/daml/.daml/dist/draw-0.3.0.dar` if it was built locally, and the committed `contracts/dist/draw-0.3.0.dar` otherwise. Otherwise upload it through whatever path the organizers give, and the run checks the package id is present.
4. Faucet: the run taps 100 Amulet per LP with `AmuletRules_DevNet_Tap`. If DevNet disallows that, fund the LPs from the wallet faucet and set `DRAW_TAP_AMOUNT=0`.
5. Run `node scripts/demo/run.mjs`. Evidence goes to `evidence/devnet/runs/<runId>/`. The gate is `DEVNET_E2E` in `result.json`.
6. Restart check: stop and start the app server, then confirm the fund, obligations, and receipts render again from the ledger (`node app/server.mjs` with `DRAW_NETWORK=devnet`).
7. Run the campaign and the browser journey against DevNet if traffic allows. Keep DevNet and LocalNet evidence separate.
8. Fill in the sections below from the run's own files, then update `claims.yaml`, `GATES.md`, and `SPONSOR_FINDINGS.md` (DEVNET_VERIFIED only for what ran).

## Record

| Item | Value |
|---|---|
| Run | `evidence/devnet/runs/20261006T091531Z`, commit `688cdbc`, 0 uncommitted files, 79 of 79 checks |
| Participant | `hackcanton-devnet-3`, Ledger API 3.5.19 |
| Package | `draw` 0.3.0, `733ba37d82f44d827f37b0f9d9bb64f2b7bc784bce951a70f87320aa3f50d534`, uploaded through the Console on 2026-10-06 as a Smart Contract Upgrade of 0.2.0. The probes record it as registered |
| Parties | `b94ab230-draw-admin`, `-lpa`, `-lpb`, `-lpc`, `-outsider`, all `::12204a9d…dbdf0e` |
| Settlement | Canton Coin through the scan-proxy token registry. LP A 40, LP B 35, admin +75. Receipts `VERIFIED_FUNDED`, 14 checks each. LP A created its allocation from its payment request's AllocationRequest view, the same factory call a wallet makes, with the shared login. LP B paid with a plain allocation carrying the reference |
| Payment requests | Each LP sees exactly its own payment request and the outsider sees none. LP A reads its call as a CIP-0056 AllocationRequest with the exact settlement and leg. LP A's and LP B's requests close when their calls settle. These are the 7 `wallet` checks |
| Privacy | ACS matrix and leak check clean. Transaction streams: admin 21 transactions, LP A 7, LP B 11, LP C 7, outsider 0, no foreign events |
| Refusals | wrong amount, wrong payer, wrong reference, replay, early overdue: refused with full Daml reasons (the node did not hide them) |
| Skipped | the two credential checks, reason recorded in `result.json` |
| Ledger reads | Paged through `POST /v2/state/active-contracts-page` with a fixed `activeAtOffset`, in use since run `20261006T084934Z`. The client falls back to `/v2/state/active-contracts` on HTTP 404 |
| Read-back | The verifier's receipts name the shared ledger user as `verifierUser` and read as the fund's own party. They are stamped 6.8 seconds (LP A, record time 09:17:02.501Z, verified 09:17:09.338Z) and 4.5 seconds (LP B, 09:18:07.811Z to 09:18:12.302Z) after the settlements' record times, the verifier's clock against the ledger's |
| Earlier runs | `20261004T120110Z`, the first PASS, 72 of 72 on 0.2.0 at commit `01c09ca` as recorded before the 2026-10-05 history rewrite, which is `578352e` in the published history (`PROOF.md` maps every evidence commit). `20261006T084934Z`, 79 of 79 on 0.3.0 at `6167ef1` with 77 uncommitted files, superseded by the clean-tree run |
| Aborted runs | `20261004T115438Z` (the early-overdue check ran after the due time on slower DevNet) and `20261004T115809Z` (`/v2/updates` request bug). Both fixed in the run script, both kept with a `NOTE.md` |
| Probes | `evidence/devnet/probes/20261006T091205Z`, `asExpected: true`, from `scripts/demo/probe.mjs`, read-only or prepare-only. Package registered (`PACKAGE_STATUS_REGISTERED`). Interactive prepare succeeds for the tenant and resolves the 0.3.0 `PaymentRequest` template, never executed. External-party `generate-topology` succeeds. External-party allocate refused with HTTP 403. Listing parties refused with HTTP 403 |
| Web journeys | `evidence/devnet/browser/web-20261005003221`, `web-journey-20261005214111` (redesigned UI) and `web-journey-20261006091011` (10 of 10 steps, a demo fund per browser) against https://draw.timjosh507.workers.dev. Four failed runs kept with notes, all test bugs |

## Limitations specific to DevNet

- One hackathon login acts for every party and for the read-back step.
- No wallet app has been shown listing or approving a DRAW payment request. The run script created LP A's allocation from its request with the shared login.
- All parties share the NODERS participant, so its operator can read them all.
- Per the Splice Scan API docs, the Canton Coin leg of each payment appears in Scan with the party ids, whose hints (`draw-lpa` and so on) are readable, and the obligation contracts don't. That's inferred from the docs and hasn't been checked against Scan.
- Canton Coin comes from the DevNet faucet and has no monetary value.
- A DevNet reset deletes every party and contract on the node. DevNet resets about every three months.
