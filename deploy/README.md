# deploy

This folder holds the files for running the DRAW API on a server.

| File | What it is |
|---|---|
| [Dockerfile](Dockerfile), [docker-compose.yml](docker-compose.yml) | The API as a container, with its state and evidence on volumes |
| [Caddyfile](Caddyfile) | HTTPS in front of the API |
| [draw-health.sh](draw-health.sh), [draw-health.service](draw-health.service), [draw-health.timer](draw-health.timer) | A watchdog that restarts `draw.service` when the API stops answering. Not installed on the VPS yet |

Everything else is in [docs/DEPLOY.md](../docs/DEPLOY.md). [API on a VPS](../docs/DEPLOY.md#api-on-a-vps) covers setting up and updating the API, including why the whole `app/` folder is copied and why the web app ships first. [Health watchdog](../docs/DEPLOY.md#health-watchdog) covers installing and checking the watchdog. [Demo limits and capacity](../docs/DEPLOY.md#demo-limits-and-capacity) covers the access code, the rate limits, the list ceiling and `node app/capacity.mjs`.
