# Deploying DRAW

DRAW has two deployable parts:

- Web (`web/`): Next.js on Cloudflare Workers through OpenNext. It serves the landing page, onboarding, the app and the proof page. Every `/api/*` and `/evidence/*` request is proxied to the API with a service token.
- API (`app/server.mjs`): Node, on a VPS next to the ledger credentials. It reads and acts on the ledger and answers only requests that carry the service token.

The browser never talks to the VPS directly, so DRAW's API needs no CORS, and the ledger credentials never leave the VPS. An LP that signs in with HackCanton is the one exception to "the browser only talks to the site": its browser calls the node's Keycloak, JSON Ledger API and validator API directly with its own token (see "Sign in with HackCanton" below).

## Live deployment (since 2026-10-05)

| Part | Where | Notes |
|---|---|---|
| Web | https://draw.timjosh507.workers.dev | Worker `draw`. `DRAW_API_URL` in `web/wrangler.jsonc`, `DRAW_SERVICE_TOKEN` as a worker secret |
| API | Hostinger VPS, `https://187-77-178-30.sslip.io` behind Caddy | systemd `draw.service`, user `draw`, code in `/opt/draw/app`, session in `/opt/draw/state`. Answers 403 without the token |

Mode: DevNet, and since about 13:25 UTC on 2026-10-06 the API runs `LEDGER_AUTH_MODE=oauth` with the backend client NODERS issued for DRAW (`DRAW_BACKEND_CLIENT_ID` and its secret) for every demo seat. The team's personal login (`HACKCANTON_USERNAME` and `HACKCANTON_PASSWORD`) is no longer on the server. The verifier client isn't deployed, since it isn't read-only yet, so the read-back reads through the backend user. `/api/config` reports `seatCredential: backend-client` and `separateVerifier: false`. Sign in with HackCanton is on (`DRAW_SIGN_IN=true`) with DRAW's own web client (`DRAW_SIGN_IN_CLIENT_ID=xidoncapitals-web-app-hackcanton-01-devnet`) and `DRAW_SIGN_IN_WALLET_URL` set. Before 13:25 UTC the API used the team's personal login for every seat. Each browser gets its own demo fund. Visitors can read every seat and the proof page. Actions need the access code (`DRAW_ACCESS_CODE` on the API), which the app asks for once. With `DRAW_ACCESS_CODE_PUBLIC=true` the API also hands the code to the site, which prints it on the landing page and fills it in. The API also rate limits actions and refuses an action that would push a ledger list past its ceiling. `.env.example` names every setting with its default, and `deploy/README.md` explains how the limits and the list ceiling work.

The live journey (onboard, issue, LP pays, another LP is refused, settle, verified funded) passed against the deployed site: `evidence/devnet/browser/web-20261005003221/`, again on the redesigned web app: `evidence/devnet/browser/web-journey-20261005214111/`, and on 2026-10-06 with a demo fund per browser, where a second browser gets its own fund and starting over leaves the browser without one: `evidence/devnet/browser/web-journey-20261006091011/` and, on the release with sign-in, `evidence/devnet/browser/web-journey-20261006101224/` (10 of 10 steps each). On the backend client it passed as `evidence/devnet/browser/web-journey-20261006132858/` (10 of 10). The sign-in journeys passed there too, newest `evidence/devnet/browser/web-hackcanton-20261006132613/` (7 of 7) and `evidence/devnet/browser/web-hackcanton-wallet-20261006132730/` (9 of 9), and first `web-hackcanton-20261006100912/` and `web-hackcanton-wallet-20261006101052/`, all with the team's own HackCanton login as the LP. Every browser run since `de2c4b2` records the site's setup in `siteSetup`: `seatCredential`, `separateVerifier`, `signInClientId` and the release.

## Checking the live site

```sh
cd web
DRAW_WEB_URL=https://draw.timjosh507.workers.dev npm run e2e
```

This runs the browser journey against the live site and issues a real call on DevNet. On a build with per-browser demo funds each run starts its own fund. On an older build it uses the shared demo fund and spends its LPs' remaining commitment, so later visitors may have to start over. Set `DRAW_ACCESS_CODE` only when the site doesn't print the code.

Each journey starts a new demo fund, and the API allows 3 new demo funds per address an hour by default (`DRAW_SETUP_LIMIT`). Raise it on the API while testing or recording, for example to `10/3600`, then set it back.

The sign-in journeys in `web/e2e/hackcanton.spec.ts` run in the same command when a HackCanton login is in `HACKCANTON_USERNAME` and `HACKCANTON_PASSWORD`, or in the repository's `.env`, and the site has sign-in on. Otherwise they skip. They sign in on the node's Keycloak with that login, and the second one also logs in to the node's Canton Coin wallet and presses Accept there. Each starts its own demo fund too.

## Web on Cloudflare

```sh
cd web
npm ci
npm run cf:deploy
```

`scripts/cloudflare.mjs` builds with every non-public variable from the repository's `.env` files blanked, empties the env module OpenNext copies into the worker, scans the whole output for each secret value, deploys, and then stores `DRAW_SERVICE_TOKEN` (read from `.env`) with `wrangler secret bulk`. Only `npm run cf:deploy` should deploy; a bare `wrangler deploy` skips those checks.

For local development, `web/.env.local` sets `DRAW_API_URL` (for example `http://localhost:4173`), then `npm run dev` serves on port 3100.

The web app imports `scripts/demo/lib/reconcile.mjs` from outside `web/` (`experimental.externalDir` in `web/next.config.ts`), so the signed-in LP's browser classifies its payments with the server's own module. Build it from the whole repository.

## API on a VPS

1. Copy the repository (or `rsync` the whole `app/` folder, `scripts/`, `contracts/dist/`, `contracts/daml/daml.yaml`, `evidence/`, `claims.yaml`, `docs/`, and `deploy/` for the health watchdog) to the server.
2. Create `.env` (mode 600) from `.env.example`: the network block, the party ids, `DRAW_ACCESS_CODE`, `DRAW_SERVICE_TOKEN` (the same value the worker holds), `DRAW_STATE_DIR`, `PORT=4173`. On the HackCanton node that means `LEDGER_AUTH_MODE=oauth`, `DRAW_BACKEND_CLIENT_ID=xidoncapitals-backend-hackcanton-01-devnet` and `DRAW_BACKEND_CLIENT_SECRET`, with no `HACKCANTON_USERNAME` or `HACKCANTON_PASSWORD`, so the server holds no person's login. Leave out `DRAW_VERIFIER_*` until the verifier client is read-only. The user ids can stay unset, since each is read from its token's subject, and one that is set and disagrees with its token stops the server's credential report.
3. Run `node app/server.mjs` under systemd, or `docker compose -f deploy/docker-compose.yml up -d --build`. It listens on `127.0.0.1:4173`.
4. Put Caddy in front for HTTPS (`deploy/Caddyfile`) and set that origin as `DRAW_API_URL` in `web/wrangler.jsonc`.

To update the VPS, copy the whole `app/` folder, never `server.mjs` alone, because `server.mjs` imports `capacity.mjs`, `limiter.mjs`, `relay.mjs` and `tours.mjs` from the same folder. Copy any changed files under `scripts/` too, then `systemctl restart draw`. Logs: `journalctl -u draw`. After a restart the log should show `DRAW on DevNet: ... a demo fund per browser`. If a module is missing, that line is missing and the log names the module.

When the web app and the API both change, deploy the web app first. The API refuses actions that carry no tour id, which an older web app doesn't send.

## Sign in with HackCanton

With `DRAW_SIGN_IN=true`, an LP with its own HackCanton login can join a demo fund as itself. Its browser signs in on the node's Keycloak with the authorization code flow and PKCE, keeps the token in the tab, reads its notices from the node's JSON Ledger API, and pays from its own Canton wallet through the node's validator API. The API receives only the LP's party id, in the `join` action, and invites that party as the fund manager. It works only with a demo fund per browser, so not with `DRAW_PARTY_MODE=external`. The live API runs with it on and the wallet link set.

| Variable | Default | What it is |
|---|---|---|
| `DRAW_SIGN_IN` | off | `true` turns sign-in on |
| `DRAW_SIGN_IN_ISSUER` | `OAUTH_TOKEN_URL` without `/protocol/openid-connect/token` | The Keycloak realm URL |
| `DRAW_SIGN_IN_CLIENT_ID` | `OAUTH_CLIENT_ID` | The public client the browser signs in with. On the live site that is DRAW's own `xidoncapitals-web-app-hackcanton-01-devnet`, which NODERS issued with PKCE and with the live site's origin and `localhost:3100` as web origins. Before it, NODERS' `web-app-ui-hackcanton-01-devnet` |
| `DRAW_SIGN_IN_SCOPE` | `openid daml_ledger_api` | The scope the browser asks for |
| `DRAW_SIGN_IN_LEDGER_API` | the admin party's JSON Ledger API | Where the browser reads and accepts |
| `DRAW_SIGN_IN_VALIDATOR_API` | `SCAN_PROXY_URL`'s origin plus `/api/validator` | The LP's wallet API: allocate, withdraw, tap, balance |
| `DRAW_SIGN_IN_WALLET_URL` | unset | Optional link to the node's Canton Coin wallet, shown to the signed-in LP. On the HackCanton node: `https://wallet.validator.hackcanton-01.devnet.naas.noders.services` |

If a required value can't be worked out, sign-in stays off and the API logs which one. `GET /api/config` hands these values to the site, with the template and interface ids the browser queries.

The browser comes back from Keycloak to the site's own `/auth/callback`, which is https://draw.timjosh507.workers.dev/auth/callback on the live site. It then calls the node from the site's origin, so the node has to allow that origin. On 2026-10-06 CORS preflights from https://draw.timjosh507.workers.dev and http://localhost:3100 to the JSON Ledger API, the validator API and the Keycloak token endpoint all returned 200 with that origin allowed. A signed-in LP's party has to be onboarded in the node's Canton Coin wallet first.

## Health watchdog

`deploy/draw-health.sh`, with `draw-health.service` and `draw-health.timer`, restarts `draw.service` when the API stops answering. It is in the repository and not installed on the VPS yet. Every minute the timer calls `GET /api/health` on `127.0.0.1:$PORT` with the service token, which it passes to curl on stdin so the token never shows in the process list. That needs curl 7.55 or later. The API answers 200 when it is up, the ledger answers the API's own credential within 4 seconds, and the demo state file parses. Otherwise it answers 503.

The script restarts only for what a restart can fix: no answer within 15 seconds, or an answer that the API can't read its state file. It restarts after two of those in a row, at most once every 10 minutes (`DRAW_HEALTH_COOLDOWN_SECONDS`, default 600). When the API answers but the ledger doesn't, it logs the answer and leaves it to an uptime monitor. A 403 means the token in the environment file is wrong, so it reports that and never restarts for it.

To install it, from the repository root on the VPS, as root:

```sh
install -m 755 deploy/draw-health.sh /usr/local/bin/draw-health
install -m 644 deploy/draw-health.service deploy/draw-health.timer /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now draw-health.timer
```

`draw-health.service` reads `PORT` and `DRAW_SERVICE_TOKEN` from `/opt/draw/app/.env`. Change that line if the app's `.env` is somewhere else. Check it with `systemctl list-timers draw-health.timer` and `journalctl -u draw-health`. `DRAW_HEALTH_URL` overrides the address it checks.

The same check is public through the site at `/api/health`, because the site's proxy adds the token, so an outside uptime monitor can watch it for 200 or 503. Its `capacity` section gives the length of every list the app reads. `"warning":true` means a list has passed four fifths of the ceiling, and `"full":true` means the app has started refusing new demo funds, calls, payments or faucet taps.

## Modes

| Mode | Ledger | Who signs |
|---|---|---|
| DevNet, backend client (`LEDGER_AUTH_MODE=oauth`, `DRAW_BACKEND_*`), the live site | HackCanton node | the API, with the backend client NODERS issued for DRAW, for the five demo parties only. External parties on that node need NODERS to allocate them |
| DevNet, shared login (`LEDGER_AUTH_MODE=password`) | HackCanton node | the API, with the team's hackathon login. The live site ran this way until about 13:25 UTC on 2026-10-06 |
| DevNet, Sign in with HackCanton (`DRAW_SIGN_IN=true`) | HackCanton node | the signed-in LP's browser, with that LP's own HackCanton login, for its own party. The demo seats, the fund manager included, still sign through the API |
| LocalNet, browser keys (`DRAW_PARTY_MODE=external`) | LocalNet | each person's browser, with its own key. Needs about 10 GB RAM for LocalNet, so it is not on the 4 GB VPS |
