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
5. `npm ci`, `npm run typecheck` and `npm run build` in `web`
6. If LocalNet answers on `localhost:3975`: `node scripts/demo/run.mjs` from the clone

LocalNet itself is started separately, as in the README.

## Results

| Run | Commit | Verdict | Notes |
|---|---|---|---|
| `20261002T200553Z` | `56a79f9` | PASS_OFFLINE_ONLY | Build, 5 Daml test suites, web install and build all exit 0 from a fresh clone. Ledger steps skipped: LocalNet was down |

A full PASS needs a run with LocalNet up, so the canonical scenario also runs from the clone.
