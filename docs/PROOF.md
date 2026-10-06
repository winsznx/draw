# How to check the claims

Every result below was written by a script. Each row says where it is and how to reproduce it. LocalNet and DevNet results are kept apart.

| Claim (`claims.yaml` id) | Check it in | Reproduce |
|---|---|---|
| Each LP reads only its own obligation (`private-obligations`) | `evidence/local/runs/<run>/visibility-final.json` (matrix and leaks), `streams.json` in `evidence/local/runs/20261004T183146Z`, campaign `privacyViolations` | `node scripts/demo/run.mjs`, `node scripts/eval/campaign.mjs` |
| Funded only through a matching Token Standard settlement (`settlement-gates-funded`) | `receipt-lpA.json`, `receipt-lpB.json` (14 checks each), Daml `test_settlement_lifecycle`, mutation results (15 of 15 on package 0.3.0 in `evidence/local/mutation/20261006T081625Z`) | `node scripts/demo/run.mjs`, `scripts/gates/daml_core.sh`, `scripts/gates/mutation_check.sh` |
| Bad payments are refused (`negative-settlement`) | run `result.json` checks starting `negative`, campaign `settleRefusals`, `falseFunded` | same |
| Unpaid stays unresolved (`unpaid-unresolved`) | run checks `deadline`, `unpaid`, campaign `none-early`, `none-late` cases | same |
| Admin totals match the obligations and the money (`admin-totals`) | `totals.json`, campaign `aggregateMismatches` | same |
| Amulet moved on LocalNet and was read back (`real-token-settlement`) | receipts, `totals.json` balances before and after, timing in `evidence/local/workload/20261002T185353Z/result.json` | `node scripts/demo/run.mjs`, then `node scripts/eval/workload.mjs` |
| The full call on DevNet (`devnet`) | `evidence/devnet/runs/20261006T091531Z`: `result.json` (79 checks on package 0.3.0, two skipped with their reason), receipts, `streams.json`, `totals.json`. The first DevNet run, `20261004T120110Z`, passed 72 on 0.2.0 | `node scripts/demo/run.mjs` with the HackCanton block in `.env` |
| Each LP's call reaches it as a CIP-0056 AllocationRequest (`wallet-request`) | the DevNet run's checks starting `wallet` in `evidence/devnet/runs/20261006T091531Z/result.json`, and Daml `test_payment_request` in `evidence/local/daml_core/20261006T081605Z` | `node scripts/demo/run.mjs` with the HackCanton block in `.env`, `scripts/gates/daml_core.sh` |
| A fund can name a verifier party (`verifier-party`) | Daml `test_verifier` and `test_no_verifier` in `evidence/local/daml_core/20261006T081605Z`, and the mutant `verifier-not-observer` in `evidence/local/mutation/20261006T081625Z` | `scripts/gates/daml_core.sh`, `scripts/gates/mutation_check.sh` |
| The live web app on DevNet (`web-journey-devnet`) | `evidence/devnet/browser/web-20261005003221`, `web-journey-20261005214111`, `web-journey-20261006091011` (a demo fund per browser) and `web-journey-20261006101224` (the release with sign-in): `result.json` with timed steps, plus screenshots | `DRAW_WEB_URL=https://draw.timjosh507.workers.dev npm run e2e` in `web/`. It issues a real call on DevNet, so read "Checking the live site" in `DEPLOY.md` first |
| An LP signs in with its own HackCanton login and pays from its own Canton wallet (`signed-in-lp`) | `evidence/devnet/browser/web-hackcanton-20261006100912` (7 steps, paid from DRAW) and `web-hackcanton-wallet-20261006101052` (9 steps, the node's Canton Coin wallet lists the request and the LP presses Accept there): `result.json` with timed steps, plus screenshots, including the wallet's Allocations page. Both used the team's own login, which the server also uses for the demo seats | `DRAW_WEB_URL=https://draw.timjosh507.workers.dev npm run e2e -- e2e/hackcanton.spec.ts` in `web/`, with a HackCanton login in `HACKCANTON_USERNAME` and `HACKCANTON_PASSWORD` or in `.env`. It skips itself when the site has sign-in off |
| The browser journey on LocalNet (`browser-journey`) | `evidence/local/browser/web-journey-20261005003621` and `web-browser-keys-20261005005304`, both on the web app before the 2026-10-05 redesign, and the 2026-10-04 runs on the earlier Vite app | `npm run e2e` in `web/`, and `DRAW_PARTY_MODE=external npm run e2e` for browser keys |
| Each party can hold its own key (`non-custodial`) | `evidence/local/runs/20261004T183146Z/result.json`, checks starting `custody` and `credential` | `DRAW_PARTY_MODE=external node scripts/demo/run.mjs` |
| Generalizes beyond the canonical story (`generalization`) | `evidence/local/campaign/20261002T193724Z/result.json`, `cases.jsonl` | `node scripts/eval/campaign.mjs` (seed 20261002) |
| Canton is load-bearing (`canton-load-bearing`) | `evidence/local/ablation/20261002T193830Z/result.json` | `node scripts/eval/ablation.mjs` |

Faster for an async judge: open https://draw.timjosh507.workers.dev/proof. It renders the latest of each from the same files and links to them, including the newest run of each live browser journey, passed or not, with its steps and screenshots: the demo-seat journey, the LP that approves in its Canton Coin wallet, and the LP that pays from DRAW.

`evidence/manifest.json` lists every run with its commit, package id, file hashes, and the claims it supports. It was regenerated on 2026-10-06 at 10:35 UTC, at commit `32f49cf`, and indexes 58 runs, including the 0.3.0 Daml core and mutation runs, both 2026-10-06 DevNet runs, the probes, the browser journeys up to `web-journey-20261006101224`, and the sign-in journeys `web-hackcanton-20261006100912` and `web-hackcanton-wallet-20261006101052`. Runs made after that aren't in it until it is regenerated with `node scripts/evidence/manifest.mjs`. The version generated on 2026-10-05, whose `generatedAtCommit` is the `3aadc1d` in the table below, is in git history.

## Commit ids in the evidence

The repository history was rewritten once, on 2026-10-05, before publication. Package ids and file hashes didn't change. Of the 17 commit ids recorded in evidence before 2026-10-06, 12 point at the old history, including those of the first DevNet run, the custody run, the 0.2.0 Daml core and mutation runs, the campaign, the ablation and the clean-room runs. This table maps each recorded id to its commit in the published history, shortened to seven characters. The runs from 2026-10-06 and the manifest regenerated that day record commits made after the rewrite, listed in the last five rows. If the history is ever rewritten again, the table has to be redone.

| Recorded in evidence | Published commit | Recorded by |
|---|---|---|
| `01c09ca` | `578352e` | DevNet run `20261004T120110Z` |
| `d987844` | `5b6190a` | Aborted DevNet run `20261004T115438Z` |
| `aa430ad` | `e6b190b` | Aborted DevNet run `20261004T115809Z` |
| `f761423` | `4b3858b` | Custody run `20261004T183146Z` |
| `4043a9b` | `f892470` | Daml core `20261002T192910Z` and mutation `20261002T192939Z`, package 0.2.0 |
| `6fa7774` | `eb49684` | Campaign `20261002T193724Z` |
| `79d0eac` | `11493bf` | Earlier campaign `20261002T193647Z` |
| `f5f92ad` | `7f3fd89` | Ablation `20261002T193830Z` |
| `c8acfea` | `23d6f52` | Clean room `20261004T195643Z` |
| `98febf0` | `05984e9` | Clean room `20261004T185118Z` |
| `56a79f9` | `6d1e8b9` | Clean room `20261002T200553Z` |
| `3aadc1d` | `5612159` | `generatedAtCommit` in `evidence/manifest.json` |
| `36069bc` | unchanged | Daml core `20261001T160054Z` and mutation `20261001T160135Z`, package 0.1.0 |
| `4a31676` | unchanged | LocalNet canonical run `20261001T162427Z` |
| `bf70eb3` | unchanged | LocalNet run `20261001T162153Z` |
| `c501be8` | unchanged | LocalNet runs `20261002T184727Z`, `20261002T184851Z`, `20261002T184944Z` and `20261002T185051Z` |
| `adaa6ab` | unchanged | LocalNet run `20261002T185353Z` |
| `1c0539b` | unchanged | Daml core `20261006T081605Z` and mutation `20261006T081625Z`, package 0.3.0. Their evidence was committed in `6167ef1` |
| `6167ef1` | unchanged | Superseded DevNet run `20261006T084934Z`, which records 77 uncommitted files. Its evidence was committed in `6e3886c` |
| `6e3886c` | unchanged | DevNet probes `20261006T091205Z`. `scripts/demo/probe.mjs` and the probe evidence were committed afterwards, in `688cdbc` |
| `688cdbc` | unchanged | DevNet run `20261006T091531Z`, 0 uncommitted files |
| `32f49cf` | unchanged | `generatedAtCommit` in `evidence/manifest.json`, regenerated on 2026-10-06 |

## The package

The committed release DAR, `contracts/dist/draw-0.3.0.dar`, has sha256 `382dcba523552e24aaaabd30a6205b7936317c7671e134712d9ac82182bf19b4` and package id `733ba37d82f44d827f37b0f9d9bb64f2b7bc784bce951a70f87320aa3f50d534`. It is a Smart Contract Upgrade of 0.2.0 (`upgrades: ../dist/draw-0.2.0.dar` in `contracts/daml/daml.yaml`), and was uploaded to the NODERS node through the web Console on 2026-10-06. The same `darSha256` and `packageId` appear in the DAML_CORE run `20261006T081605Z` and the DevNet runs `20261006T084934Z` and `20261006T091531Z`, and the probes `20261006T091205Z` record the same package id as registered on the node. Check it with `shasum -a 256 contracts/dist/draw-0.3.0.dar`.

The previous release, `contracts/dist/draw-0.2.0.dar`, has sha256 `86065b602114ac2fbbbea779f5a18396f9140a91c6ee5c632150e59851ddb0ad` and package id `a006197eb6af19a5f50b09f70cf084898de9925ddd2b984bac347b1658537496`. Those values appear in the DAML_CORE run `20261002T192910Z`, the custody run `20261004T183146Z`, and the first DevNet run `20261004T120110Z`. Every LocalNet run is on 0.2.0 or earlier.

## Reading a receipt

`receipt-lpA.json` has `verdict: VERIFIED_FUNDED` only if every check passed. The checks are, in order: the update id was not already used for another obligation, the obligation exists in the admin's ACS, the update is a transaction, it exercises `Obligation_Settle`, the same transaction executes the referenced allocation and consumes it, it creates the funded obligation for this reference, the settlement record names receiver holdings, the admin's current obligation is that funded one, the holdings are active, owned by the admin, in the expected instrument, sum to the amount due, and the payer is the obligated LP.

On LocalNet the verifier is a separate ledger user with `readAs` on the fund admin only, and every LocalNet canonical run checks that it cannot submit. On the DevNet node it runs with the shared hackathon login, so that check is skipped with its reason recorded. `verifierUser` in each receipt shows which login read the settlement back, and `readAs` shows which party it read through. In the DevNet runs that is the fund's own party. Package 0.3.0 lets a fund name a verifier party for the read-back to read through instead. That party's view is tested in Daml Script only, and no ledger run has read back through it yet.
