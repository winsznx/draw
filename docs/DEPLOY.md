# Deploying DRAW

This is the operator guide for DRAW's live site, for whoever runs the deployment or wants to reproduce it. It covers what runs where today, how to check it, how to deploy the web app and the API, the sign-in settings, the demo limits, the health watchdog and the modes. A diagram of how the parts connect is in [ARCHITECTURE.md](ARCHITECTURE.md#the-live-devnet-deployment), and the DevNet node and every run on it are in [DEVNET_DEPLOYMENT.md](DEVNET_DEPLOYMENT.md).

DRAW has two deployable parts:

- Web ([web/](../web/)): Next.js on Cloudflare Workers through OpenNext. It serves the landing page, onboarding, the app and the proof page. Every `/api/*` and `/evidence/*` request is proxied to the API with a service token.
- API ([app/server.mjs](../app/server.mjs)): Node, on a VPS next to the ledger credentials. It reads and acts on the ledger and answers only requests that carry the service token.

The browser never talks to the VPS directly, so DRAW's API needs no CORS, and the ledger credentials never leave the VPS. An LP that signs in with HackCanton is the one exception to "the browser only talks to the site": its browser calls the node's Keycloak, JSON Ledger API and validator API directly with its own token ([Sign in with HackCanton](#sign-in-with-hackcanton)).

## Live deployment since 2026-10-05

| Part | Where | Notes |
|---|---|---|
| Web | https://drawcalls.xyz, and the same worker at https://draw.timjosh507.workers.dev, the address in evidence recorded before 2026-10-07 evening | Worker `draw`, with `drawcalls.xyz` as a custom domain in [web/wrangler.jsonc](../web/wrangler.jsonc). `DRAW_API_URL` in [web/wrangler.jsonc](../web/wrangler.jsonc), `DRAW_SERVICE_TOKEN` as a Worker secret |
| API | Hostinger VPS, `https://187-77-178-30.sslip.io` behind Caddy | systemd `draw.service`, user `draw`, code in `/opt/draw/app`, session in `/opt/draw/state`. Answers 403 without the service token |

The API acts on the HackCanton DevNet node. Since about 13:25 UTC on 2026-10-06 it runs with `LEDGER_AUTH_MODE=oauth` and the backend client NODERS issued for DRAW (`DRAW_BACKEND_CLIENT_ID` and its secret) for every demo seat. Before that it used the team's personal login (`HACKCANTON_USERNAME` and `HACKCANTON_PASSWORD`) for every seat, and that login is no longer on the server. Since about 13:00 UTC on 2026-10-07 the read-back step reads through the verifier client (`DRAW_VERIFIER_CLIENT_ID` and its secret), which can only read as the fund ([probe 20261007T125624Z](../evidence/devnet/probes/20261007T125624Z/result.json)). `/api/config` reports `seatCredential: backend-client` and `separateVerifier: true`. Before that the read-back read through the backend client. The live site doesn't use the external parties NODERS allocated for the scripted run with each party's own key ([DEVNET_DEPLOYMENT.md](DEVNET_DEPLOYMENT.md#external-parties-noders-allocated-for-draw-2026-10-07)).

Sign in with HackCanton is on (`DRAW_SIGN_IN=true`), with DRAW's own web client (`DRAW_SIGN_IN_CLIENT_ID=xidoncapitals-web-app-hackcanton-01-devnet`) and `DRAW_SIGN_IN_WALLET_URL` set.

Each browser gets its own demo fund. Visitors can read the proof page, and every seat of a demo fund their browser has already started, without a code. Every action, starting with "Create the demo fund", needs the demo access code (`DRAW_ACCESS_CODE` on the API), which the app asks for once, so a new browser without the code can't start a demo fund and its seats stay empty. The live API doesn't hand the code to the site: on 2026-10-06 `GET /api/config` returned `accessCode: null`, so the site doesn't print it, and a visitor has to get the code from the team. With `DRAW_ACCESS_CODE_PUBLIC=true` the API would hand the code to the site, which would print it on the landing page and fill it in. The owner decided on 2026-10-07 that the code goes public that way on submission day, 2026-10-09 ([SUBMISSION.md](SUBMISSION.md)). The API also rate limits actions and refuses an action that would push a ledger list past its ceiling ([Demo limits and capacity](#demo-limits-and-capacity)). [.env.example](../.env.example) names every setting with its default.

The live journey (take a seat, issue, LP A pays, LP B opening LP A's notice gets nothing, settle, verified funded) has passed seven times against the deployed site, the newest [with the read-back on the verifier client](../evidence/devnet/browser/web-journey-20261007130359/) in 10 of 10 steps. The sign-in journeys passed there too, newest [paying from DRAW](../evidence/devnet/browser/web-hackcanton-20261007130106/) (7 of 7 steps) and [paying with Accept in the node's Canton Coin wallet](../evidence/devnet/browser/web-hackcanton-wallet-20261007130229/) (9 of 9), all with the team's own HackCanton login as the LP. Every browser run since `de2c4b2` records the site's setup in `siteSetup`: `seatCredential`, `separateVerifier`, `signInClientId` and the release. The [Record in DEVNET_DEPLOYMENT.md](DEVNET_DEPLOYMENT.md#record) lists every DevNet run, and [GATES.md](GATES.md#failed-and-aborted-runs) lists the failed ones with their causes.

## Checking the live site

```sh
cd web
DRAW_WEB_URL=https://drawcalls.xyz DRAW_ACCESS_CODE=<the code> npm run e2e
```

This runs the browser journey against the live site and issues a real call on DevNet. `DRAW_ACCESS_CODE` is needed because the live site doesn't print the code. On a build with a demo fund per browser each run starts its own fund. On an older build it uses the shared demo fund and spends its LPs' remaining commitment, so later visitors may have to start over.

Each journey starts a new demo fund, and by default the API allows 3 new demo funds per visitor an hour (`DRAW_SETUP_LIMIT`), so three journeys from one machine use up the hour. Raise it on the API while testing or recording, for example to `10/3600`, then set it back.

The sign-in journeys in [web/e2e/hackcanton.spec.ts](../web/e2e/hackcanton.spec.ts) run in the same command when a HackCanton login is in `HACKCANTON_USERNAME` and `HACKCANTON_PASSWORD`, or in the repository's `.env`, and the site has sign-in on. Otherwise they skip. They sign in on the node's Keycloak with that login, and the second one also logs in to the node's Canton Coin wallet and presses Accept there. Each starts its own demo fund too.

## Web on Cloudflare

```sh
cd web
npm ci
npm run cf:deploy
```

[web/scripts/cloudflare.mjs](../web/scripts/cloudflare.mjs) builds with every non-public variable from the repository's `.env` files blanked, empties the env module OpenNext copies into the Worker, scans the whole output for each secret value, deploys, and then stores `DRAW_SERVICE_TOKEN` (read from `.env`) with `wrangler secret bulk`. Only `npm run cf:deploy` should deploy. A bare `wrangler deploy` skips those checks.

For local development, `web/.env.local` sets `DRAW_API_URL` (for example `http://localhost:4173`), and `npm run dev` serves on port 3100.

The web app imports [reconcile.mjs](../scripts/demo/lib/reconcile.mjs) from outside `web/` (`experimental.externalDir` in [web/next.config.ts](../web/next.config.ts)), so the signed-in LP's browser classifies its payments with the server's own module. Build it from the whole repository.

## API on a VPS

1. Copy the repository to the server, or `rsync` the whole `app/` folder, `scripts/`, `contracts/dist/`, `contracts/daml/daml.yaml`, `evidence/`, `claims.yaml`, `docs/`, and `deploy/` for the health watchdog.
2. Create `.env` (mode 600) from [.env.example](../.env.example): the network block, the party ids, `DRAW_ACCESS_CODE`, `DRAW_SERVICE_TOKEN` (the same value the Worker holds), `DRAW_STATE_DIR`, `PORT=4173`. On the HackCanton node that means `LEDGER_AUTH_MODE=oauth`, `DRAW_BACKEND_CLIENT_ID=xidoncapitals-backend-hackcanton-01-devnet` and `DRAW_BACKEND_CLIENT_SECRET`, with no `HACKCANTON_USERNAME` or `HACKCANTON_PASSWORD`, so the server holds no person's login. For the read-back, once `node scripts/demo/probe.mjs` shows the verifier client only reads as the fund, add `DRAW_VERIFIER_CLIENT_ID=xidoncapitals-verifier-hackcanton-01-devnet` and `DRAW_VERIFIER_CLIENT_SECRET`. The live server has had both since about 13:00 UTC on 2026-10-07. The user ids can stay unset, since each is read from its token's subject, and one that is set and disagrees with its token stops the server's credential report.
3. Run `node app/server.mjs` under systemd, or `docker compose -f deploy/docker-compose.yml up -d --build` ([deploy/](../deploy/README.md) has the Dockerfile and compose file). It listens on `127.0.0.1:4173`.
4. Put Caddy in front for HTTPS ([deploy/Caddyfile](../deploy/Caddyfile)) and set that origin as `DRAW_API_URL` in [web/wrangler.jsonc](../web/wrangler.jsonc).

### Updating the API

Copy the whole `app/` folder, never `server.mjs` alone, because `server.mjs` imports `capacity.mjs`, `limiter.mjs`, `relay.mjs` and `tours.mjs` from the same folder. Copy any changed files under `scripts/` too, then run `systemctl restart draw`. Logs are in `journalctl -u draw`. After a restart the log should show `DRAW on DevNet: ... a demo fund per browser`. If a module is missing, that line is missing and the log names the module.

When the web app and the API both change, deploy the web app first. The API refuses actions that carry no tour id, which an older web app doesn't send.

## Sign in with HackCanton

With `DRAW_SIGN_IN=true`, an LP with its own HackCanton login can join a demo fund as itself. Its browser signs in on the node's Keycloak with the authorization code flow and PKCE, keeps the token in the tab, reads its notices from the node's JSON Ledger API, and pays from its own Canton wallet through the node's validator API. The API receives only the LP's party id, in the `join` action, and invites that party as the fund manager. It works only with a demo fund per browser, so not with `DRAW_PARTY_MODE=external`. The live API runs with it on and the wallet link set.

| Variable | Default | What it is |
|---|---|---|
| `DRAW_SIGN_IN` | off | `true` turns sign-in on |
| `DRAW_SIGN_IN_ISSUER` | `OAUTH_TOKEN_URL` without `/protocol/openid-connect/token` | The Keycloak realm URL |
| `DRAW_SIGN_IN_CLIENT_ID` | `OAUTH_CLIENT_ID` | The public client the browser signs in with. On the live site that is DRAW's own `xidoncapitals-web-app-hackcanton-01-devnet`, which NODERS issued with PKCE and with the live site's origin and `localhost:3100` as web origins. Before it, NODERS' `web-app-ui-hackcanton-01-devnet` |
| `DRAW_SIGN_IN_SCOPE` | `openid daml_ledger_api` | The scope the browser asks for |
| `DRAW_SIGN_IN_LEDGER_API` | the fund party's JSON Ledger API | Where the browser reads and accepts |
| `DRAW_SIGN_IN_VALIDATOR_API` | `SCAN_PROXY_URL`'s origin plus `/api/validator` | The LP's wallet API: allocate, withdraw, tap, balance |
| `DRAW_SIGN_IN_WALLET_URL` | unset | Optional link to the node's Canton Coin wallet, shown on the signed-in LP's notice and seat card. On the HackCanton node: `https://wallet.validator.hackcanton-01.devnet.naas.noders.services` |

If a required value can't be worked out, sign-in stays off and the API logs which one. `GET /api/config` hands these values to the site, with the template and interface ids the browser queries.

The browser comes back from Keycloak to the site's own `/auth/callback`, which is https://drawcalls.xyz/auth/callback on the live site, so the Keycloak client must accept `https://<site>/auth/callback` as a redirect. The browser then calls the node from the site's origin, so the node has to allow that origin. On 2026-10-06 CORS preflights from https://drawcalls.xyz and http://localhost:3100 to the JSON Ledger API, the validator API and the Keycloak token endpoint all returned 200 with that origin allowed. The API never sees the LP's token, so it needs no CORS settings of its own. A signed-in LP's party has to be onboarded in the node's Canton Coin wallet first.

## Demo limits and capacity

These settings keep the public demo usable when many people try it at once. Each has a default, and [.env.example](../.env.example) lists them all.

| Variable | Default | Effect |
|---|---|---|
| `DRAW_ACCESS_CODE` | unset | Actions need this code. Reading never does |
| `DRAW_ACCESS_CODE_PUBLIC` | off | `true` prints the code on the landing page, the onboarding access step and the access dialog |
| `DRAW_ACTION_LIMIT` | `30/600` | Ledger actions per visitor per window in seconds. `off` turns it off |
| `DRAW_ACTION_LIMIT_GLOBAL` | `120/600` | Ledger actions from everyone together per window |
| `DRAW_SETUP_LIMIT` | `3/3600` | New demo funds per visitor per window, on top of the action limit |
| `DRAW_SETUP_LIMIT_GLOBAL` | `20/3600` | New demo funds from everyone together per window |
| `DRAW_ISSUE_LIMIT` | `10/3600` | Capital calls per visitor per window, on top of the action limit |
| `DRAW_ISSUE_LIMIT_GLOBAL` | `40/3600` | Capital calls from everyone together per window |
| `DRAW_FAUCET_LIMIT` | `5/3600` | Faucet taps per visitor per window, on top of the action limit |
| `DRAW_FAUCET_LIMIT_GLOBAL` | `30/3600` | Faucet taps from everyone together per window |
| `DRAW_LIST_CEILING` | `600` | The most records any list the app reads may hold. Reads are paged, so this can pass the JSON Ledger API's 200-record limit for one unpaged read. It keeps every poll's full read short |
| `DRAW_TOUR_CAP` | `300` | Browsers with their own demo fund that the API remembers. The least recently used are forgotten first |
| `DRAW_EVIDENCE_DIR` | `evidence/` | Where the app writes and serves evidence. Tests point it at a temporary folder |

The sign-in settings are in [Sign in with HackCanton](#sign-in-with-hackcanton). The setup limit applies to the team as well ([Checking the live site](#checking-the-live-site)).

### How visitors are counted

A visitor is counted by address, and an IPv6 visitor by its /64. Behind the site the address comes from Cloudflare's `cf-connecting-ip`, which the API trusts only on requests that carry the service token. Only actions that reach the ledger count. Resetting a browser that has no fund, or starting one that already has a fund, costs nothing.

### A demo fund per browser

Each browser gets its own demo fund, called a tour in the code, except with `DRAW_PARTY_MODE=external`, where everyone joins one fund with their own key. Tours are kept in `.session-<network>-tours.json` under `DRAW_STATE_DIR`. Actions from every tour run one at a time through a single queue, because tours share the provisioned parties and their coin. Once 20 actions are in the queue, the API answers 503 with `Retry-After` instead of queueing more.

### The list ceiling

On DevNet every tour adds records to the same five parties, and the app reads each list in full on every poll, a page at a time through `/v2/state/active-contracts-page`. One unpaged read stops at 200 records, Canton 3.5's `http-list-max-elements-limit`. Before an action adds a record, the API checks that the list it lands in still has room under `DRAW_LIST_CEILING`. When it hasn't, the API answers 503 with "The demo is full right now", so the demo fills up instead of breaking every view. A new demo fund also needs room for one full call to every LP, so a visitor who starts one can finish it.

When a browser starts over, or the API forgets a tour past its cap or idle for 30 days, the API withdraws that fund's open invitations, unsettled payments and open payment requests, so those don't pile up and no LP's wallet keeps offering a notice of a closed fund. Commitments and notices stay, since the fund and the LP both signed them.

The faucet stops topping up an LP that already holds 40 separate coin holdings, because a payment spends every unlocked holding at once and Amulet refuses a transfer with more than 100 inputs. Paying a notice merges them, and then the faucet works again.

### Checking capacity

The capacity section of `/api/health` gives the length of every list the app reads, counted at most once a minute. `"warning":true` means a list has passed four fifths of the ceiling, and `"full":true` means the app has started refusing new demo funds, calls, payments or faucet taps. A keyword monitor on `"warning":true` alerts before the demo fills up. A full list doesn't fail the health check, because a restart can't help.

Before making the access code public, or handing it out, check how full the shared parties are. This only reads, with the credentials in the repository's `.env`:

```sh
node app/capacity.mjs
```

It prints how many funds, invitations, commitments, calls, notices, payment requests, payments and holdings each provisioned party has, and the ceiling the app stops adding at, 600 by default.

## Health watchdog

[deploy/draw-health.sh](../deploy/draw-health.sh), with [draw-health.service](../deploy/draw-health.service) and [draw-health.timer](../deploy/draw-health.timer), restarts `draw.service` when the API stops answering. It is in the repository and, as of 2026-10-06, not installed on the VPS. Every minute the timer calls `GET /api/health` on `127.0.0.1:$PORT` with the service token, which it passes to curl on stdin so the token never shows in the process list. That needs curl 7.55 or later. The API answers 200 when it is up, the ledger answers the API's own credential within 4 seconds, and the demo state file parses. Otherwise it answers 503.

The script restarts only for what a restart can fix: no answer within 15 seconds, or an answer saying the API can't read its state file. It restarts after two of those in a row, at most once every 10 minutes (`DRAW_HEALTH_COOLDOWN_SECONDS`, default 600). When the API answers but the ledger doesn't, it logs the answer and leaves it to an uptime monitor, since restarting the API can't bring a ledger back and would drop the actions waiting in its queue. A 403 means the token in the environment file is wrong, so it reports that and never restarts for it.

To install it, from the repository root on the VPS, as root:

```sh
install -m 755 deploy/draw-health.sh /usr/local/bin/draw-health
install -m 644 deploy/draw-health.service deploy/draw-health.timer /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now draw-health.timer
```

`draw-health.service` reads `PORT` and `DRAW_SERVICE_TOKEN` from `/opt/draw/app/.env`. Change that line if the app's `.env` is somewhere else. Check it with `systemctl list-timers draw-health.timer` and `journalctl -u draw-health`. `DRAW_HEALTH_URL` overrides the address it checks.

The same check is public through the site at `/api/health`, because the site's proxy adds the token, so an outside uptime monitor can watch it for 200 or 503. Its capacity section is described in [Demo limits and capacity](#demo-limits-and-capacity).

## Modes

| Mode | Ledger | Who signs |
|---|---|---|
| DevNet, backend client (`LEDGER_AUTH_MODE=oauth`, `DRAW_BACKEND_*`), the live site | HackCanton node | the API, with the backend client NODERS issued for DRAW, for the five demo parties only. The read-back uses the verifier client (`DRAW_VERIFIER_*`) |
| DevNet, external parties (`DRAW_PARTY_MODE=external-provisioned`), the scripted run only | HackCanton node | each party's own key, on the machine that runs the script, for the five parties NODERS allocated on 2026-10-07. The team's login submits what each key signed. The live site doesn't run this way |
| DevNet, shared login (`LEDGER_AUTH_MODE=password`) | HackCanton node | the API, with the team's hackathon login. The live site ran this way until about 13:25 UTC on 2026-10-06 |
| DevNet, Sign in with HackCanton (`DRAW_SIGN_IN=true`) | HackCanton node | the signed-in LP's browser, with that LP's own HackCanton login, for its own party. The demo seats, the fund manager included, still sign through the API |
| LocalNet, browser keys (`DRAW_PARTY_MODE=external`) | LocalNet | each person's browser, with its own key. Needs about 10 GB of RAM for LocalNet, so it isn't on the 4 GB VPS |
