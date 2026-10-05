# Deploying DRAW

DRAW has two deployable parts:

- **Web** (`web/`): Next.js on Cloudflare Workers through OpenNext. It serves the landing page, onboarding, the app and the proof page. Every `/api/*` and `/evidence/*` request is proxied to the API with a service token.
- **API** (`app/server.mjs`): Node, on a VPS next to the ledger credentials. It reads and acts on the ledger and answers only requests that carry the service token.

The browser never talks to the VPS directly, so there is no CORS, and the ledger credentials never leave the VPS.

## Live deployment (2026-10-05)

| Part | Where | Notes |
|---|---|---|
| Web | https://draw.timjosh507.workers.dev | Worker `draw`. `DRAW_API_URL` in `web/wrangler.jsonc`, `DRAW_SERVICE_TOKEN` as a worker secret |
| API | Hostinger VPS, `https://187-77-178-30.sslip.io` behind Caddy | systemd `draw.service`, user `draw`, code in `/opt/draw/app`, session in `/opt/draw/state`. Answers 403 without the token |

Mode: DevNet with the shared hackathon login. Visitors can read every seat and the proof page. Actions need the access code (`DRAW_ACCESS_CODE` on the API), which the app asks for once.

The live journey (onboard, issue, LP pays, another LP is refused, settle, verified funded) passed against the deployed site: `evidence/devnet/browser/web-20261005003221/`.

## Web on Cloudflare

```sh
cd web
npm ci
npm run cf:deploy
```

`scripts/cloudflare.mjs` builds with every non-public variable from the repository's `.env` files blanked, empties the env module OpenNext copies into the worker, scans the whole output for each secret value, deploys, and then stores `DRAW_SERVICE_TOKEN` (read from `.env`) with `wrangler secret bulk`. Only `npm run cf:deploy` should deploy; a bare `wrangler deploy` skips those checks.

For local development, `web/.env.local` sets `DRAW_API_URL` (for example `http://localhost:4173`), then `npm run dev` serves on port 3100.

## API on a VPS

1. Copy the repository (or `rsync` `app/`, `scripts/`, `contracts/dist/`, `contracts/daml/daml.yaml`, `evidence/`, `claims.yaml`, `docs/`) to the server.
2. Create `.env` (mode 600) from `.env.example`: the network block, the party ids, `DRAW_ACCESS_CODE`, `DRAW_SERVICE_TOKEN` (the same value the worker holds), `DRAW_STATE_DIR`, `PORT=4173`.
3. Run `node app/server.mjs` under systemd, or `docker compose -f deploy/docker-compose.yml up -d --build`. It listens on `127.0.0.1:4173`.
4. Put Caddy in front for HTTPS (`deploy/Caddyfile`) and set that origin as `DRAW_API_URL` in `web/wrangler.jsonc`.

To update the VPS: `rsync` the changed files, then `systemctl restart draw`. Logs: `journalctl -u draw`.

## Modes

| Mode | Ledger | Who signs |
|---|---|---|
| DevNet, shared login | HackCanton node | the API, with the team's hackathon login. NODERS does not allow teams to create external parties yet |
| LocalNet, browser keys (`DRAW_PARTY_MODE=external`) | LocalNet | each person's browser, with its own key. Needs about 10 GB RAM for LocalNet, so it is not on the 4 GB VPS |
