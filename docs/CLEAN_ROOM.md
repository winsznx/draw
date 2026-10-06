# Clean-room reproduction

This page shows how a fresh clone of the committed repository rebuilds and reruns DRAW, so nothing left uncommitted on the author's machine can make a result pass, and it records the result of each clean-room run. It's for judges and anyone who wants to reproduce the build. How to check each claim is in [PROOF.md](PROOF.md).

The script is [scripts/setup/clean_room.sh](../scripts/setup/clean_room.sh). It clones the committed repository into a temporary folder, rebuilds from there, writes results to `evidence/local/clean_room/<run>/` in the original checkout, and deletes the clone.

## Prerequisites

| Tool | Version used |
|---|---|
| Daml SDK via `dpm` | 3.5.12 |
| JDK | 21 (`JAVA_HOME=/opt/homebrew/opt/openjdk@21`) |
| Node, npm | 24.19.0, 11.17.0 |
| Docker | 29.8.1 in the 2026-10-04 runs and 29.7.2 in the 2026-10-02 run. LocalNet needs about 10 GB of RAM for the VM and about 6 GB of disk for its images |
| Chrome | Only for the browser journey, which this script doesn't run |

Each run records the versions it found in its `prerequisites.log`, for example [the 2026-10-04 PASS](../evidence/local/clean_room/20261004T195643Z/prerequisites.log).

## Steps the script runs

1. `git clone` of the current commit
2. Print tool versions
3. `dpm build --all` in `contracts`
4. `dpm test` in `contracts/tests`
5. `node --test 'scripts/test/*.test.mjs'`
6. `npm ci`, `npm run typecheck` and `npm run build` in `web`
7. If LocalNet answers on `localhost:3975`: `node scripts/demo/run.mjs` from the clone, the canonical call

LocalNet itself is started separately, as in the README's [Run it locally](../README.md#run-it-locally) section. A run where every step exits 0 and the canonical call ran is PASS. If LocalNet doesn't answer, the ledger step is skipped and the verdict is PASS_OFFLINE_ONLY. Any step that fails makes it FAIL.

The script has gained steps since the recorded runs. The 2026-10-02 run had no unit-test step, and the separate web typecheck came with the Next.js app. The earlier Vite web app ran `tsc --noEmit` inside its `npm run build`.

## Results

| Run | Commit as recorded | Published commit | Verdict | Notes |
|---|---|---|---|---|
| [20261002T200553Z](../evidence/local/clean_room/20261002T200553Z/result.json) | `56a79f9` | `6d1e8b9` | PASS_OFFLINE_ONLY | Build, 6 Daml Script tests counting setup, and the web install and build all exit 0 from a fresh clone. The ledger steps were skipped because LocalNet was down ([canonical-run.log](../evidence/local/clean_room/20261002T200553Z/canonical-run.log)) |
| [20261004T185118Z](../evidence/local/clean_room/20261004T185118Z/result.json) | `98febf0` | `05984e9` | PASS_OFFLINE_ONLY | The offline steps pass. A bug in the reachability probe, which expected HTTP 401 where LocalNet answers 200, skipped the ledger steps. Fixed in the script ([NOTE.md](../evidence/local/clean_room/20261004T185118Z/NOTE.md)) |
| [20261004T195643Z](../evidence/local/clean_room/20261004T195643Z/result.json) | `c8acfea` | `23d6f52` | PASS | Every step exits 0, and the canonical run from the clone passes on LocalNet with 74 of 74 checks (LOCAL_SETTLEMENT and PRIVACY_CAMPAIGN). The run's own folder lived in the clone, so its record is [canonical-run.log](../evidence/local/clean_room/20261004T195643Z/canonical-run.log) |

The 2026-10-04 PASS built the earlier Vite web app in `app/web` and Daml package 0.2.0. The Next.js app in `web/` replaced it on 2026-10-05, and package 0.3.0 arrived on 2026-10-06. Neither has had a clean-room run yet, which needs LocalNet up. Each run recorded its commit before the repository history was rewritten on 2026-10-05, so the published commit is listed next to it. The mapping for every commit id in the evidence is in [PROOF.md](PROOF.md#commit-ids-in-the-evidence).
