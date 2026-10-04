# Deploying DRAW to a VPS

One container serves the API and the React app. Caddy in front provides HTTPS. Configuration and secrets come from `.env` on the server and are never baked into the image (`.dockerignore` excludes `.env`, `.keys/`, and `internal/`).

## What runs where

| Mode | Ledger | Who signs | Use |
|---|---|---|---|
| DevNet, shared login | HackCanton node | the server, with the team's hackathon login | public demo on the season's network. Set `DRAW_ACCESS_CODE` so visitors can read but not act |
| LocalNet, browser keys (`DRAW_PARTY_MODE=external`) | LocalNet on the same VPS | each user's browser, with its own key | the non-custodial version. Needs about 10 GB RAM and 8 GB disk for LocalNet |

## Steps

1. On the VPS: install Docker and Caddy, and point your domain's DNS at the VPS.
2. `git clone` the repository and `cd` into it.
3. Create `.env` (copy `.env.example`). For DevNet, fill the HackCanton block and the five party ids. Add `DRAW_ACCESS_CODE=<something long>`.
4. `docker compose -f deploy/docker-compose.yml up -d --build`. The app listens on `127.0.0.1:4173` only.
5. Put your domain into `deploy/Caddyfile`, copy it to `/etc/caddy/Caddyfile`, then `systemctl reload caddy`.
6. Open `https://<your domain>`. Visitors can browse every role and the Proof page. Actions ask for the access code once.

Receipts, the action log, and the session live on Docker volumes (`draw-evidence`, `draw-state`), so they survive restarts and rebuilds.

## Checked locally (2026-10-04)

The image built from a clean context, contained the release DAR and the built app, contained no `.env`, started against DevNet with `--env-file`, served the app and `/api/proof`, and refused an action without the access code.
