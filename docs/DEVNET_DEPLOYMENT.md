# DevNet deployment

Status: DEVNET_E2E PASS on 2026-10-06 on package 0.3.0 with the Keycloak clients NODERS issued for DRAW, `evidence/devnet/runs/20261006T131900Z/result.json`, 82 of 82 checks. The demo seats acted through the backend client and the read-back through the verifier client. Earlier PASSes: `evidence/devnet/runs/20261006T091531Z` (79 of 79, one shared hackathon login for every party and the read-back) and, on 2026-10-04 on package 0.2.0, `evidence/devnet/runs/20261004T120110Z` (72 of 72). Two runs before the first aborted on run-script bugs, and a dirty-tree PASS earlier on 2026-10-06 was superseded. All are kept. The live web app runs on the same node (`docs/DEPLOY.md`). Since about 13:25 UTC on 2026-10-06 its demo seats act through the backend client, its read-back reads through that same backend user, and sign-in uses DRAW's own web client. Its browser journeys passed twice on 2026-10-05 and three times on 2026-10-06, the last on that setup. An LP signed in with a HackCanton login also joined demo funds as itself and paid from its own Canton wallet, in runs that all used the team's own login as the LP.

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

Consequence: one hackathon account is one credential for every party it creates. A DevNet run with one account proves party-scoped visibility and on-ledger settlement, not credential separation, and records `credentialSeparation: NOT_TESTED_SINGLE_CREDENTIAL`. We asked NODERS for M2M clients on 2026-10-04, and on 2026-10-06 they issued three Keycloak clients for DRAW (next section). A participant replied that Daml privacy is protocol-level and works on the shared node, which is correct for party visibility and does not change the credential point.

## Clients NODERS issued for DRAW (2026-10-06)

| Client | Kind | Used by | What the node reports |
|---|---|---|---|
| `xidoncapitals-web-app-hackcanton-01-devnet` | public, PKCE, with the live site's origin and `localhost:3100` as web origins | Sign in with HackCanton on the live site | the signed-in user's own rights |
| `xidoncapitals-backend-hackcanton-01-devnet` | client credentials | the demo seats, in run `20261006T131900Z` and on the live server | acts for `draw-admin`, `draw-lpa`, `draw-lpb`, `draw-lpc` and `draw-outsider`, reads as `draw-admin`, and nothing else. The probe's check passes |
| `xidoncapitals-verifier-hackcanton-01-devnet` | client credentials | the read-back step in run `20261006T131900Z`. Not on the live server | reads as `draw-admin`, and also acts and reads as the team's personal wallet party (hint `b94ab230-e690-46b2-9288-133b30609cb9`). The probe's read-only check fails, and NODERS has been asked to remove that right |

Client-credentials tokens carry the node's audience, scope `daml_ledger_api` and a 3-hour expiry. The rights come from probes `evidence/devnet/probes/20261006T131751Z` and `20261006T133219Z`, which read each client's rights from `GET /v2/users/{id}/rights`. Both record `asExpected: false` because of the verifier client. The first also showed that a user with only read rights on a party can still interactive-prepare a transaction for it on this node, so prepare is no test of act rights. That check was dropped, and the run tests the refusal of a real submission instead.

What is still open, and needs NODERS:

- A verifier client that only reads. The run already checks that the verifier client can't submit as the fund ("credential: verifier token cannot submit as admin", refused with HTTP 403), and the probe checks its full rights. Once the extra right is gone, the probe's check passes and the live server can use it.
- External parties allocated by NODERS for keys we hold, so each LP signs its own DevNet payment, as in the LocalNet custody run. On this node, allocating one takes a participant admin, an identity provider admin, or the self path, whose quota defaults to 0 in Canton 3.5. Our own `/v2/parties/external/allocate` call is refused with HTTP 403. That was first reported on 2026-10-04 without saved output, and the read-only probe `evidence/devnet/probes/20261006T091205Z` saved it, along with `generate-topology` and a prepare-only interactive submission working for our login. The later probes got the same 403 with the backend client. Signed allocation requests for five parties, built from `generate-topology` on 2026-10-06, are ready for NODERS. Once they exist, `DRAW_PARTY_MODE=external-provisioned` reads them from `DRAW_EXTERNAL_PARTIES_FILE`, which hasn't run on a ledger yet. Sources and probe details are in `SPONSOR_FINDINGS.md`.
- LP-from-LP credential separation. One backend client acts for all five demo parties, so the check "credential: lpA token cannot read as lpB" is skipped with its reason. It would need a client, or a person's login, per LP.

Verified without an account (2026-10-04): the token endpoint and client id refuse fake credentials with `invalid_grant`, `/livez` answers 200, the scan proxy requires a token.

## Runbook with the NODERS clients

This is how run `20261006T131900Z` ran.

1. Onboard once in the Wallet ("Onboard yourself") with the team's HackCanton login. In the Console, create parties `draw-admin`, `draw-lpa`, `draw-lpb`, `draw-lpc`, `draw-outsider`, and upload the committed `contracts/dist/draw-0.3.0.dar` under Collections (or `contracts/daml/.daml/dist/draw-0.3.0.dar` after a local build, which has the same package id). 0.3.0 is a Smart Contract Upgrade of 0.2.0, which the node already had from 2026-10-04. The backend client needs act rights on those five parties, which NODERS set up for DRAW's.
2. In `.env`, uncomment the HackCanton DevNet block from `.env.example` with `LEDGER_AUTH_MODE=oauth`, the five party ids copied from the Console, `DRAW_BACKEND_CLIENT_ID` and `DRAW_BACKEND_CLIENT_SECRET`, and for the read-back `DRAW_VERIFIER_CLIENT_ID` and `DRAW_VERIFIER_CLIENT_SECRET`. Leave `DRAW_BACKEND_USER` and `DRAW_VERIFIER_USER` unset: each is read from its token's subject, and one that is set and disagrees with its token stops the run.
3. `node scripts/demo/probe.mjs` records what each client may do, without changing the ledger. Evidence goes to `evidence/devnet/probes/<runId>/`.
4. `node scripts/demo/run.mjs`. Evidence goes to `evidence/devnet/runs/<runId>/`. With both clients the run records `seatCredential: backend-client` and `credentialSeparation: VERIFIER_ONLY`.
5. For the app, see `docs/DEPLOY.md`. The live API has the backend client only, without the verifier client and without any person's login.

## Runbook with one hackathon account

This is how the runs before 13:19 UTC on 2026-10-06 ran, with the team's personal login acting for every party and the read-back.

1. Onboard and create the parties as in step 1 above.
2. In `.env`, uncomment the HackCanton DevNet block from `.env.example` with `LEDGER_AUTH_MODE=password`, set `HACKCANTON_USERNAME`, `HACKCANTON_PASSWORD`, and the five party ids.
3. `node scripts/demo/run.mjs`. Evidence goes to `evidence/devnet/runs/<runId>/`. The run records `credentialSeparation: NOT_TESTED_SINGLE_CREDENTIAL` and skips both credential checks.

## Runbook with one client per role

1. Copy `.env.example` to `.env`. Set `DRAW_NETWORK=devnet`, `DRAW_JSON_API`, `OAUTH_TOKEN_URL`, `OAUTH_AUDIENCE`, `OAUTH_SCOPE`, `REGISTRY_URL`, `SCAN_URL`, and `SCAN_AUTH_USER` if Scan sits behind the validator's proxy.
2. Parties:
   - If the organizers provide parties: fill `DRAW_<ROLE>_PARTY` and the OAuth client id and secret for admin, lpA, lpB, lpC, outsider, and the verifier user (readAs admin only). The user ids are optional, read from each client's token.
   - If they provide a participant-admin user: set `DRAW_OPERATOR_*`, run `node scripts/demo/provision.mjs devnet-draw`, paste the output into `.env`, then create one OAuth client per printed user.
3. Package: with `DRAW_OPERATOR_*` set, the run uploads `contracts/daml/.daml/dist/draw-0.3.0.dar` if it was built locally, and the committed `contracts/dist/draw-0.3.0.dar` otherwise. Otherwise upload it through whatever path the organizers give, and the run checks the package id is present.
4. Faucet: the run taps 100 Amulet per LP with `AmuletRules_DevNet_Tap`. If DevNet disallows that, fund the LPs from the wallet faucet and set `DRAW_TAP_AMOUNT=0`.
5. Run `node scripts/demo/run.mjs`. Evidence goes to `evidence/devnet/runs/<runId>/`. The gate is `DEVNET_E2E` in `result.json`. With a separate user per seat and for the verifier, it records `credentialSeparation: TESTED`.
6. Restart check: stop and start the app server, then confirm the fund, obligations, and receipts render again from the ledger (`node app/server.mjs` with `DRAW_NETWORK=devnet`).
7. Run the campaign and the browser journey against DevNet if traffic allows. Keep DevNet and LocalNet evidence separate.
8. Fill in the sections below from the run's own files, then update `claims.yaml`, `GATES.md`, and `SPONSOR_FINDINGS.md` (DEVNET_VERIFIED only for what ran).

## Record

| Item | Value |
|---|---|
| Run | `evidence/devnet/runs/20261006T131900Z`, commit `8f30e3f`, 0 uncommitted files, 82 of 82 checks, `authMode: oauth` |
| Credentials | `seatCredential: backend-client`: one backend-client user for all five demo seats. `credentialSeparation: VERIFIER_ONLY`: the read-back ran as the verifier client's own user. "credential: verifier token cannot submit as admin" was refused with HTTP 403, and "settlement[lpA]" and "settlement[lpB]: the read-back ran as the verifier's own ledger user" passed |
| Participant | `hackcanton-devnet-3`, Ledger API 3.5.19 |
| Package | `draw` 0.3.0, `733ba37d82f44d827f37b0f9d9bb64f2b7bc784bce951a70f87320aa3f50d534`, uploaded through the Console on 2026-10-06 as a Smart Contract Upgrade of 0.2.0. The probes record it as registered |
| Parties | `b94ab230-draw-admin`, `-lpa`, `-lpb`, `-lpc`, `-outsider`, all `::12204a9d…dbdf0e` |
| Settlement | Canton Coin through the scan-proxy token registry, which accepted the backend client's token. LP A 40, LP B 35, admin +75. Receipts `VERIFIED_FUNDED`, 14 checks each. LP A created its allocation from its payment request's AllocationRequest view, the same factory call a wallet makes. LP B paid with a plain allocation carrying the reference |
| Payment requests | Each LP sees exactly its own payment request and the outsider sees none. LP A reads its call as a CIP-0056 AllocationRequest with the exact settlement and leg. LP A's and LP B's requests close when their calls settle. These are the 7 `wallet` checks |
| Privacy | ACS matrix and leak check clean. Transaction streams: admin 21 transactions, LP A 7, LP B 11, LP C 7, outsider 0, no foreign events |
| Refusals | wrong amount, wrong payer, wrong reference, replay, early overdue: refused with full Daml reasons (the node did not hide them) |
| Skipped | "credential: lpA token cannot read as lpB", with the reason that one backend client acts for every demo seat on this node |
| Ledger reads | Paged through `POST /v2/state/active-contracts-page` with a fixed `activeAtOffset`, in use since run `20261006T084934Z`. The client falls back to `/v2/state/active-contracts` on HTTP 404 |
| Read-back | The receipts name the verifier client's user as `verifierUser`, the subject of the token its reads carried, and read as the fund's own party. The check was named "independent verifier" in earlier runs and "read-back verifier" from this one |
| Earlier runs | `20261006T091531Z`, 79 of 79 on 0.3.0 at `688cdbc` with 0 uncommitted files, one shared hackathon login for every party and the read-back. Its receipts named the shared user and were stamped 6.8 seconds (LP A) and 4.5 seconds (LP B) after the settlements' record times. `20261006T084934Z`, 79 of 79 at `6167ef1` with 77 uncommitted files, superseded by that clean-tree run. `20261004T120110Z`, the first PASS, 72 of 72 on 0.2.0 at commit `01c09ca` as recorded before the 2026-10-05 history rewrite, which is `578352e` in the published history (`PROOF.md` maps every evidence commit) |
| Aborted runs | `20261004T115438Z` (the early-overdue check ran after the due time on slower DevNet) and `20261004T115809Z` (`/v2/updates` request bug). Both fixed in the run script, both kept with a `NOTE.md` |
| Probes | From `scripts/demo/probe.mjs`, read-only or prepare-only. `evidence/devnet/probes/20261006T091205Z`, `asExpected: true`, with the team's login: package registered (`PACKAGE_STATUS_REGISTERED`), interactive prepare succeeds for the tenant and resolves the 0.3.0 `PaymentRequest` template without executing it, external-party `generate-topology` succeeds, external-party allocate refused with HTTP 403, listing parties refused with HTTP 403. `20261006T131751Z` and `20261006T133219Z`, `asExpected: false`, with the NODERS clients: the same results, the backend client's rights exact, and the verifier client able to act for the team's personal wallet party |
| Web journeys | `evidence/devnet/browser/web-20261005003221`, `web-journey-20261005214111` (redesigned UI), `web-journey-20261006091011` (10 of 10 steps, a demo fund per browser), `web-journey-20261006101224` (10 of 10, the release with sign-in) and `web-journey-20261006132858` (10 of 10, the demo seats on the backend client, `siteSetup` recorded) against https://draw.timjosh507.workers.dev. Four failed runs kept with notes, all test bugs |
| Sign-in journeys | Newest, with `siteSetup` recorded: `evidence/devnet/browser/web-hackcanton-20261006132613` (7 of 7: signed in on the node's Keycloak, accepted with its own login, paid from its own Canton wallet through DRAW, settled, verified funded) and `web-hackcanton-wallet-20261006132730` (9 of 9: the same, paid by pressing Accept on the request in the node's Canton Coin wallet), with the server on the backend client and DRAW's own web client. Earlier: `web-hackcanton-wallet-20261006114558` (the first on DRAW's own web client, the server still on the team's login), `web-hackcanton-20261006111458` and `web-hackcanton-wallet-20261006111654`, `web-hackcanton-20261006100912` and `web-hackcanton-wallet-20261006101052`. Every one with the team's own HackCanton login as the LP |

## Sign in with HackCanton on this node

DRAW's own public client `xidoncapitals-web-app-hackcanton-01-devnet` runs the authorization code flow with PKCE for the live site, back to https://draw.timjosh507.workers.dev/auth/callback. The first four sign-in runs used NODERS' public client `web-app-ui-hackcanton-01-devnet`, the same one the password grant above uses. The browser then reads the login's wallet party from `GET /v2/authenticated-user` (`primaryParty`), reads and accepts on the JSON Ledger API, and pays through the validator's wallet API, all with the LP's own token. A login whose party isn't onboarded yet has to open the node's Canton Coin wallet once. Variables and CORS are in `docs/DEPLOY.md`, and the endpoints are in `SPONSOR_FINDINGS.md`.

## Limitations specific to DevNet

- One backend client acts for every demo party, so LP-from-LP credential separation is shown on LocalNet only.
- The verifier client isn't read-only, since it can act for the team's personal wallet party, so the live server doesn't use it and reads back through the backend user.
- An LP can sign in with its own HackCanton login, but every run of that used the team's own login as the LP. In the newest runs the server held only the backend client, so the same person held both sides with different credentials. Two different people need a second person's login.
- The node's Canton Coin wallet listed a DRAW payment request and its Accept paid it, in runs with the team's own login.
- All parties share the NODERS participant, so its operator can read them all.
- Per the Splice Scan API docs, the Canton Coin leg of each payment appears in Scan with the party ids, whose hints (`draw-lpa` and so on) are readable, and the obligation contracts don't. That's inferred from the docs and hasn't been checked against Scan.
- Canton Coin comes from the DevNet faucet and has no monetary value.
- A DevNet reset deletes every party and contract on the node. DevNet resets about every three months.
