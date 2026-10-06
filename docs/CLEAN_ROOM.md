# Clean-room reproduction

Script: `scripts/setup/clean_room.sh`. It clones the committed repository into a temporary folder, rebuilds from there, writes results to `evidence/local/clean_room/<run>/` in the original checkout, and deletes the clone.

## Prerequisites

| Tool | Version used |
|---|---|
| Daml SDK via `dpm` | 3.5.12 |
| JDK | 21 (`JAVA_HOME=/opt/homebrew/opt/openjdk@21`) |
| Node, npm | 24.19.0, 11.17.0 |
| Docker | 29.7.2, about 10 GB of RAM for the VM and about 6 GB of disk for LocalNet images |
| Chrome | for the browser journey |

## Steps the script runs

1. `git clone` of the current commit
2. Print tool versions
3. `dpm build --all` in `contracts`
4. `dpm test` in `contracts/tests`
5. `node --test 'scripts/test/*.test.mjs'`
6. `npm ci`, `npm run typecheck` and `npm run build` in `web`
7. If LocalNet answers on `localhost:3975`: `node scripts/demo/run.mjs` from the clone

LocalNet itself is started separately, as in the README.

## Results

| Run | Commit as recorded | Published commit | Verdict | Notes |
|---|---|---|---|---|
| `20261002T200553Z` | `56a79f9` | `6d1e8b9` | PASS_OFFLINE_ONLY | Build, 5 Daml test suites, web install and build all exit 0 from a fresh clone. Ledger steps skipped: LocalNet was down |
| `20261004T185118Z` | `98febf0` | `05984e9` | PASS_OFFLINE_ONLY | Offline steps pass. The ledger steps were skipped by a bug in the reachability probe, which expected HTTP 401 where LocalNet answers 200. Fixed in the script |
| `20261004T195643Z` | `c8acfea` | `23d6f52` | PASS | Every step exits 0, and the canonical run from the clone passes on LocalNet with 74 of 74 checks (LOCAL_SETTLEMENT and PRIVACY_CAMPAIGN). The run's own folder lived in the clone, so its record is `canonical-run.log` |

The 2026-10-04 PASS built the earlier Vite web app in `app/web` and Daml package 0.2.0. The Next.js app in `web/` replaced it on 2026-10-05, and package 0.3.0 arrived on 2026-10-06. Neither has had a clean-room run yet, which needs LocalNet up. Each run recorded its commit before the repository history was rewritten on 2026-10-05, so the published commit is listed next to it. The full mapping for every commit id in the evidence is in `PROOF.md`.
