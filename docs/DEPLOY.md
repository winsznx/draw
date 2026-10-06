# Deploying DRAW

DRAW has two deployable parts:

- Web (`web/`): Next.js on Cloudflare Workers through OpenNext. It serves the landing page, onboarding, the app and the proof page. Every `/api/*` and `/evidence/*` request is proxied to the API with a service token.
- API (`app/server.mjs`): Node, on a VPS next to the ledger credentials. It reads and acts on the ledger and answers only requests that carry the service token.

The browser never talks to the VPS directly, so there is no CORS, and the ledger credentials never leave the VPS.

## Live deployment (since 2026-10-05)

| Part | Where | Notes |
|---|---|---|
| Web | https://draw.timjosh507.workers.dev | Worker `draw`. `DRAW_API_URL` in `web/wrangler.jsonc`, `DRAW_SERVICE_TOKEN` as a worker secret |
| API | Hostinger VPS, `https://187-77-178-30.sslip.io` behind Caddy | systemd `draw.service`, user `draw`, code in `/opt/draw/app`, session in `/opt/draw/state`. Answers 403 without the token |

Mode: DevNet with the shared hackathon login. Each browser gets its own demo fund. Visitors can read every seat and the proof page. Actions need the access code (`DRAW_ACCESS_CODE` on the API), which the app asks for once. With `DRAW_ACCESS_CODE_PUBLIC=true` the API also hands the code to the site, which prints it on the landing page and fills it in. The API also rate limits actions and refuses an action that would push a ledger list past its ceiling. `.env.example` names every setting with its default, and `deploy/README.md` explains how the limits and the list ceiling work.

The live journey (onboard, issue, LP pays, another LP is refused, settle, verified funded) passed against the deployed site: `evidence/devnet/browser/web-20261005003221/`, again on the redesigned web app: `evidence/devnet/browser/web-journey-20261005214111/`, and on 2026-10-06 with a demo fund per browser, where a second browser gets its own fund and starting over leaves the browser without one: `evidence/devnet/browser/web-journey-20261006091011/` (10 of 10 steps).

## Checking the live site

```sh
cd web
DRAW_WEB_URL=https://draw.timjosh507.workers.dev npm run e2e
```

This runs the browser journey against the live site and issues a real call on DevNet. On a build with per-browser demo funds each run starts its own fund. On an older build it uses the shared demo fund and spends its LPs' remaining commitment, so later visitors may have to start over. Set `DRAW_ACCESS_CODE` only when the site doesn't print the code.

Each journey starts a new demo fund, and the API allows 3 new demo funds per address an hour by default (`DRAW_SETUP_LIMIT`). Raise it on the API while testing or recording, for example to `10/3600`, then set it back.

## Web on Cloudflare

```sh
cd web
npm ci
npm run cf:deploy
```

`scripts/cloudflare.mjs` builds with every non-public variable from the repository's `.env` files blanked, empties the env module OpenNext copies into the worker, scans the whole output for each secret value, deploys, and then stores `DRAW_SERVICE_TOKEN` (read from `.env`) with `wrangler secret bulk`. Only `npm run cf:deploy` should deploy; a bare `wrangler deploy` skips those checks.

For local development, `web/.env.local` sets `DRAW_API_URL` (for example `http://localhost:4173`), then `npm run dev` serves on port 3100.

## API on a VPS

1. Copy the repository (or `rsync` the whole `app/` folder, `scripts/`, `contracts/dist/`, `contracts/daml/daml.yaml`, `evidence/`, `claims.yaml`, `docs/`, and `deploy/` for the health watchdog) to the server.
2. Create `.env` (mode 600) from `.env.example`: the network block, the party ids, `DRAW_ACCESS_CODE`, `DRAW_SERVICE_TOKEN` (the same value the worker holds), `DRAW_STATE_DIR`, `PORT=4173`.
3. Run `node app/server.mjs` under systemd, or `docker compose -f deploy/docker-compose.yml up -d --build`. It listens on `127.0.0.1:4173`.
4. Put Caddy in front for HTTPS (`deploy/Caddyfile`) and set that origin as `DRAW_API_URL` in `web/wrangler.jsonc`.

To update the VPS, copy the whole `app/` folder, never `server.mjs` alone, because `server.mjs` imports `capacity.mjs`, `limiter.mjs`, `relay.mjs` and `tours.mjs` from the same folder. Copy any changed files under `scripts/` too, then `systemctl restart draw`. Logs: `journalctl -u draw`. After a restart the log should show `DRAW on DevNet: ... a demo fund per browser`. If a module is missing, that line is missing and the log names the module.

When the web app and the API both change, deploy the web app first. The API refuses actions that carry no tour id, which an older web app doesn't send.

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
| DevNet, shared login | HackCanton node | the API, with the team's hackathon login. External parties on that node need NODERS to allocate them |
| LocalNet, browser keys (`DRAW_PARTY_MODE=external`) | LocalNet | each person's browser, with its own key. Needs about 10 GB RAM for LocalNet, so it is not on the 4 GB VPS |
