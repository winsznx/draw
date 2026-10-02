#!/usr/bin/env bash
# DAML_CORE gate: builds both packages, runs the Daml Script suites, and writes
# the verdict from the command output. Never edit the result files by hand.
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
export PATH="$HOME/.dpm/bin:$PATH"
export JAVA_HOME="${JAVA_HOME:-/opt/homebrew/opt/openjdk@21}"

RUN_ID="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="$ROOT/evidence/local/daml_core/$RUN_ID"
mkdir -p "$OUT"

REQUIRED_TESTS=(test_visibility test_authority test_settlement_lifecycle test_resolution_paths test_review_paths)

(cd "$ROOT/contracts" && dpm build --all) >"$OUT/build.log" 2>&1
BUILD_EXIT=$?
(cd "$ROOT/contracts/tests" && dpm test) >"$OUT/test.log" 2>&1
TEST_EXIT=$?

DAR="$ROOT/contracts/daml/.daml/dist/draw-$(awk '/^version:/{print $2}' "$ROOT/contracts/daml/daml.yaml").dar"
PACKAGE_ID="$(dpm damlc inspect-dar --json "$DAR" 2>/dev/null | jq -r .main_package_id)"

missing=()
for t in "${REQUIRED_TESTS[@]}"; do
  grep -Eq "CapitalCallTest.daml:${t}: ok," "$OUT/test.log" || missing+=("$t")
done

VERDICT=FAIL
if [[ $BUILD_EXIT -eq 0 && $TEST_EXIT -eq 0 && ${#missing[@]} -eq 0 ]]; then
  VERDICT=PASS
fi

jq -n \
  --arg gate DAML_CORE \
  --arg verdict "$VERDICT" \
  --arg runId "$RUN_ID" \
  --arg commit "$(git -C "$ROOT" rev-parse HEAD 2>/dev/null || echo uncommitted)" \
  --arg dirty "$(git -C "$ROOT" status --porcelain 2>/dev/null | wc -l | tr -d ' ')" \
  --arg sdk "$(dpm version --active 2>/dev/null | tr -d ' *')" \
  --arg packageId "$PACKAGE_ID" \
  --arg darSha256 "$(shasum -a 256 "$DAR" | cut -d' ' -f1)" \
  --argjson buildExit "$BUILD_EXIT" \
  --argjson testExit "$TEST_EXIT" \
  --argjson missing "$(printf '%s\n' "${missing[@]+"${missing[@]}"}" | jq -R . | jq -s 'map(select(length>0))')" \
  --argjson tests "$(grep -E 'CapitalCallTest.daml:[a-z_]+: ' "$OUT/test.log" | sed -E 's/.*CapitalCallTest.daml:([a-z_]+): (.*)/\1\t\2/' | jq -R 'split("\t") | {name: .[0], result: .[1]}' | jq -s .)" \
  '{gate: $gate, verdict: $verdict, runId: $runId, commit: $commit, uncommittedFiles: ($dirty|tonumber), sdkVersion: $sdk, packageId: $packageId, darSha256: $darSha256, buildExit: $buildExit, testExit: $testExit, missingTests: $missing, tests: $tests}' \
  >"$OUT/result.json"

cat "$OUT/result.json"
[[ $VERDICT == PASS ]]
