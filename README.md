# DRAW

Private capital calls on Canton. Each investor sees and funds only its own obligation, and the fund sees how much called capital is actually deployable.

Running end to end on the HackCanton DevNet node with real Canton Coin, and on Splice LocalNet. [`claims.yaml`](claims.yaml) lists exactly what has been verified and where.

## The problem

A fund calls capital from its investors (LPs). Each LP gets a notice for its own share and pays by wire. Today's fund software attributes those wires to investors, but in batches from bank exports, with partial, split, and wrong-name payments handled by hand. Funds count money as in only once it has cleared and been reconciled, and fake capital-call notices with swapped payment details are a known fraud pattern that funds fight with procedures, not with the payment itself.

DRAW makes the obligation and the payment the same record: the payment carries the obligation's reference in a field the ledger checks, and the obligation becomes funded in the transaction that moves the money.

That is our working hypothesis about the workflow. Public evidence and its limits are in [`docs/PROBLEM_EVIDENCE.md`](docs/PROBLEM_EVIDENCE.md). No fund operator has been interviewed yet.

## What DRAW does

1. The fund admin issues a call. DRAW creates one obligation per LP. Each is a contract only that LP and the fund can see.
2. The LP opens its notice and pays in a Canton token. The payment is a Token Standard allocation that carries the obligation's reference.
3. The admin settles. In one transaction the ledger checks the reference, payer, amount, and asset, moves the money, and marks the obligation funded. A wrong amount, the wrong payer, the wrong reference, or a reused payment is refused.
4. A separate read-only check reads the settlement back. Only then does the dashboard count it as deployable.
5. Anyone who didn't pay stays unresolved. After the due time the admin can mark them overdue, send them to review, or waive them, each with a note.

The dashboard answers one question: how much of this call is deployable now, and how much is unresolved?

## Why Canton

We ran the same call on an ordinary database with a `paid` flag and role filtering in the app, then tried five attacks on both. Four got through the database. None got through DRAW ([`docs/CANTON_ABLATION.md`](docs/CANTON_ABLATION.md)).

- **Privacy sits below the application.** LP A's own ledger login never gets LP B's obligation back, not even by contract id. A missing filter in the app cannot change that. Anyone holding the fund admin's credential can still read every LP, because the admin is a party to each obligation.
- **Funded follows the money.** The obligation flips in the same transaction that moves the token, and that transfer needs the LP's prior consent.
- **Payments can't be reused.** A settled allocation is consumed.

On the honest path both systems produce the same totals. The difference is what happens when something goes wrong.

## Architecture

![DRAW architecture](docs/architecture.svg)

- Daml package `draw` ([`contracts/daml/daml/Draw/CapitalCall.daml`](contracts/daml/daml/Draw/CapitalCall.daml)): `Fund` and `CapitalCall` are admin-only. `InvestorCommitment` and `CapitalCallObligation` are signed by the admin and one LP. `FUNDED` is set in exactly one place, inside `Obligation_Settle`, after `Allocation_ExecuteTransfer`.
- Settlement: CIP-0056 Allocation V1 with Amulet, through the Splice token registry.
- App: a Node server ([`app/server.mjs`](app/server.mjs)) that reads and acts with one ledger user per party, and a React + TypeScript UI ([`app/web`](app/web)).
- Visibility and authority matrix: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Working

| What | Evidence |
|---|---|
| The full call on the HackCanton DevNet node: two LPs settle with real Canton Coin and independent read-back, bad payments refused, the unpaid LP goes overdue, totals match the money, and each party's transaction history holds only its own records. 72 of 72 checks | [`evidence/devnet/runs/20261004T120110Z`](evidence/devnet/runs/20261004T120110Z/result.json) |
| Non-custodial mode: each party signs its own transactions with its own key, and the server cannot act for a party without that key. 76 of 76 checks on LocalNet | [`evidence/local/runs/20261004T183146Z`](evidence/local/runs/20261004T183146Z/result.json) |
| Per-LP private obligations, checked with each party's own ledger login, including a leak check across everything it can see | [`evidence/local/runs/`](evidence/local/runs), `visibility-final.json` |
| Real Amulet settlement through Token Standard allocations, with an independent read-back receipt | `receipt-lpA.json`, `receipt-lpB.json` in the same runs |
| Wrong amount, wrong payer, wrong reference, and replay refused. Unpaid LP overdue only after the due time | run `result.json` |
| Admin totals equal the verified obligations and the admin's actual Amulet received | `totals.json` |
| 100 seeded calls (191 obligations): 0 falsely funded, 0 privacy violations, 0 replays accepted, 0 total mismatches | [`evidence/local/campaign/20261002T193724Z`](evidence/local/campaign/20261002T193724Z/result.json) |
| Database-with-paid-flag ablation | [`evidence/local/ablation/20261002T193830Z`](evidence/local/ablation/20261002T193830Z/result.json) |
| Daml tests (5 suites) and 10 deliberately broken guards all caught | [`evidence/local/daml_core`](evidence/local/daml_core), [`evidence/local/mutation`](evidence/local/mutation) |
| Clickable app: create call, pay, settle, payments inbox with mismatch explanations, review, waive, reopen, release, receipts, proof page | [`app/`](app) |

Every result was written by a script. [`evidence/manifest.json`](evidence/manifest.json) indexes each run with its commit and file hashes. [`docs/PROOF.md`](docs/PROOF.md) explains how to check each claim.

## Roadmap

- Separate credentials per party on DevNet. The shared hackathon node gives one account act-as on every party it creates, so DevNet proves party-level privacy and LocalNet proves credential separation ([`docs/DEVNET_DEPLOYMENT.md`](docs/DEVNET_DEPLOYMENT.md)).
- The browser journey is written and has not passed yet. LocalNet went down before it could run.
- Production sign-in where the app server holds no LP credentials ([`docs/SECURITY.md`](docs/SECURITY.md)).
- Automatic settlement of exact matches is written (`DRAW_AUTO_SETTLE=true`) and not yet run against a ledger.
- A real settlement asset (tokenized dollar) and a scheduler for overdue.

## Roles

| Role | Sees | Does |
|---|---|---|
| Fund admin | Every commitment and obligation in its fund, every payment addressed to the fund | Issues calls, settles matching payments, marks overdue, reviews, waives, reopens |
| LP | Only its own commitment, obligations, and payments | Accepts its commitment, pays, withdraws a refused payment |
| Unrelated party | Nothing | Nothing |

"Viewing as" in the app switches which ledger login runs every query. It is a demo convenience, not production sign-in.

## Run it locally

Requirements: Daml SDK 3.5.12 via `dpm`, JDK 21, Docker with about 10 GB of RAM and 6 GB of disk for LocalNet, Node 24, Chrome for the browser test.

```sh
export PATH="$HOME/.dpm/bin:$PATH" JAVA_HOME=/opt/homebrew/opt/openjdk@21

# Contracts
(cd contracts && dpm build --all)
scripts/gates/daml_core.sh
scripts/gates/mutation_check.sh

# LocalNet (Splice 0.8.4)
curl -sSfLO https://github.com/digital-asset/decentralized-canton-sync/releases/download/v0.8.4/0.8.4_splice-node.tar.gz
mkdir -p localnet && tar xzf 0.8.4_splice-node.tar.gz -C localnet && rm 0.8.4_splice-node.tar.gz
cd localnet/splice-node/docker-compose/localnet
export LOCALNET_DIR=$PWD IMAGE_TAG=0.8.4
docker compose --env-file compose.env --env-file env/common.env -f compose.yaml -f resource-constraints.yaml \
  --profile sv --profile app-provider --profile app-user up -d
cd -

# The app
(cd app/web && npm ci && npm run build)
node app/server.mjs        # http://localhost:4173, then "Create demo fund"
```

LocalNet uses its documented `unsafe` HS256 secret. Each party gets its own ledger user with rights on that party only.

## Tests and proof campaign

```sh
node --test 'scripts/test/*.test.mjs'  # unit tests: payment classifier, outcome truth, login, config
node scripts/demo/run.mjs          # canonical call, writes evidence/local/runs/<run>
node scripts/demo/summary.mjs      # plain-language summary of the latest run
node scripts/eval/campaign.mjs     # 100 seeded cases (DRAW_EVAL_SEED, DRAW_EVAL_CASES)
node scripts/eval/ablation.mjs     # database with a paid flag vs DRAW, same attacks
(cd app/web && npm run e2e)        # browser journey against the real app and ledger
scripts/setup/clean_room.sh        # fresh clone, build, test, and run
node scripts/evidence/manifest.mjs # index every evidence run with hashes
```

## DevNet

Copy `.env.example` to `.env`, set `DRAW_NETWORK=devnet`, and fill in the participant URL, OAuth token URL, Scan and registry URLs, and one user, party, and OAuth client per role. With a participant-admin user instead, run `node scripts/demo/provision.mjs` and paste its output. Then `node scripts/demo/run.mjs`. Evidence goes to `evidence/devnet/runs/`.

## Known limitations

On both LocalNet and the DevNet node, all parties share one participant, so its operator can read them all. On DevNet one login acts for every party. The demo server holds every role's credential. The token registry sees each payment's (random) reference. Full list: [`docs/LIMITATIONS.md`](docs/LIMITATIONS.md).

## Demo

[`docs/DEMO_SCRIPT.md`](docs/DEMO_SCRIPT.md) is a three-minute walkthrough that opens on the fund. The business brief is [`docs/BUSINESS_BRIEF.md`](docs/BUSINESS_BRIEF.md) and the pilot plan is [`docs/PILOT_PLAN.md`](docs/PILOT_PLAN.md).

Built from scratch during HackCanton Season 3 ([`docs/HACKATHON_DELTA.md`](docs/HACKATHON_DELTA.md)).
