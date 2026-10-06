# deploy

Files for running the DRAW API on a server. The full guide is `docs/DEPLOY.md`.

| File | What it is |
|---|---|
| `Dockerfile`, `docker-compose.yml` | The API as a container, with its state and evidence on volumes |
| `Caddyfile` | HTTPS in front of the API |
| `draw-health.sh`, `draw-health.service`, `draw-health.timer` | A watchdog that restarts `draw.service` when the API stops answering. Not installed yet |

## Updating the API

`app/server.mjs` imports `capacity.mjs`, `limiter.mjs`, `relay.mjs` and `tours.mjs` from the same folder, so copy the whole `app/` folder, never `server.mjs` alone. After `systemctl restart draw`, `journalctl -u draw` should show `DRAW on DevNet: ... a demo fund per browser`. If the API fails to start, that line is missing and the log names the missing module.

Ship the web worker before the API. The API refuses actions that carry no tour id, which the older web app doesn't send.

Before printing the access code, check how full the shared parties are. This only reads, with the credentials in the repository's `.env`:

```sh
node app/capacity.mjs
```

It prints how many funds, invitations, commitments, calls, notices, payments and holdings each provisioned party has. On 2026-10-06 the fund manager's longest list was 12 (commitments and notices), against the app's ceiling of 170.

## Health watchdog

Every minute the timer calls `GET /api/health` on `127.0.0.1:$PORT` with the service token, passed to curl on stdin so it never shows in the process list. That needs curl 7.55 or later. The API answers 200 when it is up, the ledger answers its credential within 4 seconds, and the demo state file still parses, and 503 otherwise.

The script restarts `draw.service` only for what a restart can fix: the API not answering within 15 seconds, or answering that it can't read its state file. After two of those in a row it restarts, and restarts stay at least 10 minutes apart (`DRAW_HEALTH_COOLDOWN_SECONDS`). When the API answers but the ledger doesn't, the script logs the answer and leaves it to the uptime monitor, since restarting the API can't bring a ledger back and would drop the actions waiting in its queue. A 403 means the token in the environment file is wrong, so the script reports that and never restarts for it.

To install on the VPS, from the repository root, as root:

```sh
install -m 755 deploy/draw-health.sh /usr/local/bin/draw-health
install -m 644 deploy/draw-health.service deploy/draw-health.timer /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now draw-health.timer
```

`draw-health.service` reads `/opt/draw/app/.env` for `PORT` and `DRAW_SERVICE_TOKEN`. Change that line if the app's `.env` is somewhere else. Check it with `systemctl list-timers draw-health.timer` and `journalctl -u draw-health`.

The same check is public through the site at `/api/health`, since the site's proxy adds the token. Point an outside uptime monitor there for 200 or 503. The answer also has a `capacity` section with the length of every list the app reads, counted at most once a minute. `"warning":true` means a list has passed four fifths of the ceiling, and `"full":true` means the app has started refusing new demo funds, calls, payments or faucet taps. A keyword monitor on `"warning":true` alerts before the demo fills up. A full list doesn't fail the check, because a restart can't help.

## Demo settings on the API

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

The setup limit also applies to the team. Three browser journeys from one machine use up an hour's allowance, so raise `DRAW_SETUP_LIMIT` (for example `10/3600`) while recording or testing, then set it back.

A visitor is counted by address, and an IPv6 visitor by its /64. Behind the site the address comes from Cloudflare's `cf-connecting-ip`, which the API trusts only on requests that carry the service token. Only actions that reach the ledger count: resetting a browser that has no fund, or starting one that already has a fund, costs nothing.

Each browser gets its own demo fund (a tour), except with `DRAW_PARTY_MODE=external`, where everyone joins one fund with their own key. Tours are kept in `.session-<network>-tours.json` under `DRAW_STATE_DIR`. Actions from every tour run one at a time through a single queue, because tours share the provisioned parties and their coin. Once 20 actions are in the queue, the API answers 503 with `Retry-After` instead of queueing more.

On DevNet every tour adds records to the same five parties, and the app reads each list in full on every poll, a page at a time through `/v2/state/active-contracts-page` (one unpaged read stops at 200 records, Canton 3.5's `http-list-max-elements-limit`). Before an action adds a record, the API checks the list it lands in still has room under `DRAW_LIST_CEILING`, and answers 503 with "The demo is full right now" when it hasn't, so the demo fills up instead of breaking every view. A new demo fund also needs room for one full call to every LP, so a visitor who starts one can finish it. When a browser starts over, or the API forgets a tour past its cap or idle for 30 days, the API withdraws that fund's open invitations, unsettled payments and open payment requests, so those don't pile up, and no LP's wallet keeps offering a notice of a closed fund. Commitments and notices stay, since the fund and the LP both signed them. Each LP's holdings stop at 40 for the faucet, because a payment spends every unlocked holding at once and Amulet refuses a transfer with more than 100 inputs.
