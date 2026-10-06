# Environment

This is a hackathon process record of the build machine's tool versions, for anyone reproducing the build. The product is described in [PRODUCT.md](PRODUCT.md) and the proof in [PROOF.md](PROOF.md). The commands to build and run DRAW are in the README's [Run it locally](../README.md#run-it-locally) section, and a reproduction from a fresh clone is in [CLEAN_ROOM.md](CLEAN_ROOM.md). No secrets are stored here.

## The build machine on 2026-10-01

| Item | Value |
|---|---|
| OS | macOS 27.0, arm64, 8 CPU, 32 GB RAM |
| Daml SDK | 3.5.12 via `dpm` 1.0.22 (`~/.dpm/bin`), damlc component 3.5.3, bundled Canton 3.5.19 |
| Java | OpenJDK 21.0.12 (Homebrew `openjdk@21`), `JAVA_HOME=/opt/homebrew/opt/openjdk@21` |
| Docker | Docker Desktop 29.7.2, Compose 5.4.0, about 12.5 GB RAM allotted to the VM |
| Node | 24.19.0, npm 11.17.0, pnpm available |
| Splice LocalNet | 0.8.4 (released 2026-09-25, Canton 3.5.19), bundle under `localnet/` (gitignored), images native arm64, about 5.5 GB |
| AppsFactory starter | none in the repository |
| NODERS material | none yet on 2026-10-01 |
| DevNet credentials | none yet on 2026-10-01. They arrived on 2026-10-04 (next table) |
| Network | docs.digitalasset.com, get.digitalasset.com, GitHub reachable |

## Changes since 2026-10-01

| Item | Value |
|---|---|
| DevNet credentials | A HackCanton login in `.env` since 2026-10-04, and the backend and verifier client secrets NODERS issued for DRAW since 2026-10-06. None of them committed |
| NODERS material | The HackCanton DevNet quickstart, shared by the organizers on 2026-10-04 ([DEVNET_DEPLOYMENT.md](DEVNET_DEPLOYMENT.md)) |
| Web app | Next.js 15.5 on Cloudflare Workers through `@opennextjs/cloudflare` 1.20 and Wrangler 4.147, since 2026-10-05 |
| Hosting | Cloudflare Workers for the web, a Hostinger VPS with 4 GB of RAM behind Caddy for the API ([DEPLOY.md](DEPLOY.md)) |
| LocalNet | Re-pulled on 2026-10-04 and used through 2026-10-05. Not running on 2026-10-06 for lack of disk |

## Disk

Disk is the constraint to plan for. On 2026-10-01 the build machine went from 13 GB free to none after the SDK install and Docker's growth. LocalNet needs several GB of images, so leave room for it before pulling the bundle.

## Daml Script tests

The README's commands build the contracts and run the gate scripts. To run the Daml Script suites directly, after building the contracts as the README shows, from the repository root:

```sh
export PATH="$HOME/.dpm/bin:$PATH" JAVA_HOME=/opt/homebrew/opt/openjdk@21
(cd contracts/tests && dpm test)
```

[scripts/gates/daml_core.sh](../scripts/gates/daml_core.sh) runs the same suites and writes the result to `evidence/local/daml_core/<run>/`.
