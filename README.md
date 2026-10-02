# DRAW

Capital-call operations on Canton. A fund calls capital from its LPs. Each LP sees only its own obligation. An obligation becomes funded only when a CIP-0056 token allocation carrying its reference is executed and an independent reader confirms it. The admin's funded and unresolved totals are recomputed from those obligations.

Status: working on LocalNet. Not deployed on DevNet. See `claims.yaml` for exactly what has been verified and where.

## What the LocalNet run shows

From `evidence/local/runs/20261001T162427Z` (Splice 0.8.4, Canton 3.5.19, real Amulet):

- A fund called $1,000,000 from three LPs: $400,000, $350,000, $250,000 (settled as 40, 35, and 25 Amulet).
- Each LP's own ledger credential returns only its own obligation and commitment. The unrelated party sees nothing. LP A cannot fetch LP B's obligation even by contract id.
- LP A and LP B paid through Amulet allocations. A separate read-only verifier credential read each settlement back and issued `VERIFIED_FUNDED`.
- Wrong amount, wrong payer, wrong reference, and a replayed allocation were refused without funding.
- LP C did not pay. Overdue was refused before the due time and set after it.
- Admin totals: $750,000 funded, $250,000 unresolved. The admin's Amulet balance grew by exactly 75.

Print it again with `node scripts/demo/summary.mjs`.

## Layout

```text
contracts/daml/      draw package: Fund, CommitmentInvitation, InvestorCommitment, CapitalCall, CapitalCallObligation
contracts/tests/     Daml Script suites and a test-only token used by dpm test
scripts/gates/       DAML_CORE gate and guard mutation check
scripts/demo/        LocalNet client, independent verifier, canonical run, summary
app/                 thin role view that queries the ledger as the selected party
docs/                environment, architecture and visibility matrix, sponsor findings, decisions, gates
evidence/local/      results written by the scripts, never by hand
claims.yaml          ceiling for anything said about DRAW
```

## Run it

Requirements: Daml SDK 3.5.12 via `dpm`, JDK 21, Docker with about 10 GB for the VM, Node 24.

```sh
export PATH="$HOME/.dpm/bin:$PATH" JAVA_HOME=/opt/homebrew/opt/openjdk@21

# Contracts
scripts/gates/daml_core.sh
scripts/gates/mutation_check.sh

# LocalNet (Splice 0.8.4 bundle extracted under localnet/, which is gitignored)
curl -sSfLO https://github.com/digital-asset/decentralized-canton-sync/releases/download/v0.8.4/0.8.4_splice-node.tar.gz
mkdir -p localnet && tar xzf 0.8.4_splice-node.tar.gz -C localnet
cd localnet/splice-node/docker-compose/localnet
export LOCALNET_DIR=$PWD IMAGE_TAG=0.8.4
docker compose --env-file compose.env --env-file env/common.env -f compose.yaml -f resource-constraints.yaml \
  --profile sv --profile app-provider --profile app-user up -d
cd -

# Canonical run (takes about two minutes, it waits for LP C's due time)
node scripts/demo/run.mjs
node scripts/demo/summary.mjs

# Role view of the latest run
node app/server.mjs   # http://localhost:4173
```

LocalNet uses its documented `unsafe` HS256 secret. Each party gets its own ledger user with rights on that party only.

### DevNet

Copy `.env.example` to `.env`, set `DRAW_NETWORK=devnet`, and fill in the participant URL, OAuth token URL, Scan and registry URLs, and one user, party, and OAuth client per role. If you were given a participant_admin user instead of ready-made parties, set `DRAW_OPERATOR_*` and run `node scripts/demo/provision.mjs`, then paste its output into `.env`. Then run `node scripts/demo/run.mjs`. Evidence goes to `evidence/devnet/runs/`.

## Not done yet

- DevNet deployment: blocked on AppsFactory or NODERS credentials.
- Empirical ablation against a database plus `paid = true` baseline.
- Reading the DSO's view of allocations in the privacy campaign.
- UI polish, business brief, pilot plan.
