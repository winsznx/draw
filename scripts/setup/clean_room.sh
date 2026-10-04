#!/usr/bin/env bash
# Clean-room reproduction: clone the committed repo into a temporary folder and
# rebuild everything from there. Results go to evidence/<net>/clean_room/<run>/
# in the original checkout. Ledger steps run only if LocalNet answers.
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
RUN_ID="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="$ROOT/evidence/local/clean_room/$RUN_ID"
WORK="$(mktemp -d)"
mkdir -p "$OUT"
export PATH="$HOME/.dpm/bin:$PATH"
export JAVA_HOME="${JAVA_HOME:-/opt/homebrew/opt/openjdk@21}"

steps=()
run_step() {
  local name="$1"; shift
  local started=$(date +%s)
  ( "$@" ) >"$OUT/$name.log" 2>&1
  local code=$?
  steps+=("$(jq -n --arg name "$name" --argjson code "$code" --argjson seconds "$(( $(date +%s) - started ))" '{name: $name, exit: $code, seconds: $seconds}')")
  echo "$name exit=$code"
  return $code
}

COMMIT="$(git -C "$ROOT" rev-parse HEAD)"
run_step clone git clone --quiet "$ROOT" "$WORK/draw"
cd "$WORK/draw"
run_step prerequisites bash -c 'dpm version --active && java -version 2>&1 | head -1 && node --version && npm --version && docker --version'
run_step contracts-build bash -c 'cd contracts && dpm build --all'
run_step contracts-test bash -c 'cd contracts/tests && dpm test'
run_step unit-tests node --test 'scripts/test/*.test.mjs'
run_step web-install bash -c 'cd app/web && npm ci --no-audit --no-fund'
run_step web-build bash -c 'cd app/web && npm run build'

LEDGER=skipped
if curl -s -o /dev/null -w '%{http_code}' http://localhost:3975/v2/version | grep -q 401; then
  LEDGER=ran
  run_step canonical-run node scripts/demo/run.mjs
else
  echo "LocalNet not reachable, ledger steps skipped" | tee "$OUT/canonical-run.log"
fi

TESTS_OK=$(grep -cE 'CapitalCallTest.daml:test_[a-z_]+: ok,' "$OUT/contracts-test.log")
printf '%s\n' "${steps[@]}" | jq -s \
  --arg runId "$RUN_ID" --arg commit "$COMMIT" --arg ledger "$LEDGER" --argjson damlSuitesOk "$TESTS_OK" \
  '{check: "CLEAN_ROOM", runId: $runId, commit: $commit, ledgerSteps: $ledger, damlSuitesOk: $damlSuitesOk, steps: ., verdict: (if all(.[]; .exit == 0) then (if $ledger == "ran" then "PASS" else "PASS_OFFLINE_ONLY" end) else "FAIL" end)}' \
  >"$OUT/result.json"
cat "$OUT/result.json"
rm -rf "$WORK"
