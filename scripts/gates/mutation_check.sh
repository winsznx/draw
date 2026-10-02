#!/usr/bin/env bash
# Weakens one guard at a time in a scratch copy of contracts/ and requires the
# Daml Script suite to fail. A surviving mutant means a test is vacuous.
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
export PATH="$HOME/.dpm/bin:$PATH"
export JAVA_HOME="${JAVA_HOME:-/opt/homebrew/opt/openjdk@21}"

RUN_ID="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="$ROOT/evidence/local/mutation/$RUN_ID"
mkdir -p "$OUT"
MODEL=daml/daml/Draw/CapitalCall.daml

# name|perl substitution applied to the model
MUTANTS=(
  "drop-amount-check|s/leg\.amount == obligation\.amountDue/True/"
  "drop-sender-check|s/leg\.sender == obligation\.lp/True/"
  "drop-reference-checks|s/spec\.settlement\.settlementRef\.id == obligation\.obligationRef/True/; s/spec\.transferLegId == obligation\.obligationRef/True/"
  "drop-executor-check|s/spec\.settlement\.executor == obligation\.admin/True/"
  "drop-instrument-check|s/leg\.instrumentId == obligation\.instrumentId/True/"
  "drop-deadline-check|s/assertMsg \"obligation is not yet due\" pastDue/pure ()/"
  "settle-from-funded|s/\[Issued, PaymentPending, Overdue, ManualReview\]/[Issued, PaymentPending, Overdue, ManualReview, Funded]/"
  "lp-controls-flag|s/(choice Obligation_FlagManualReview : ContractId CapitalCallObligation\n      with\n        note : Text\n      controller) admin/\$1 lp/"
  "release-from-any-state|s/assertMsg "only a payment-pending obligation can be released" \(state == PaymentPending\)/pure ()/"
  "reopen-from-any-state|s/assertMsg "only an obligation in manual review can be reopened" \(state == ManualReview\)/pure ()/"
)

results=()
for entry in "${MUTANTS[@]}"; do
  name="${entry%%|*}"; expr="${entry#*|}"
  work="$(mktemp -d)"
  rsync -a --exclude .daml "$ROOT/contracts/" "$work/"
  perl -0pi -e "$expr" "$work/$MODEL"
  if cmp -s "$ROOT/contracts/$MODEL" "$work/$MODEL"; then
    status=NOT_APPLIED
  else
    (cd "$work" && dpm build --all && cd tests && dpm test) >"$OUT/$name.log" 2>&1
    if [[ $? -ne 0 ]]; then status=KILLED; else status=SURVIVED; fi
  fi
  rm -rf "$work"
  echo "$name $status"
  results+=("{\"mutant\":\"$name\",\"status\":\"$status\"}")
done

printf '%s\n' "${results[@]}" | jq -s --arg runId "$RUN_ID" \
  --arg commit "$(git -C "$ROOT" rev-parse HEAD)" \
  '{check: "MUTATION", runId: $runId, commit: $commit, verdict: (if all(.[]; .status == "KILLED") then "PASS" else "FAIL" end), mutants: .}' \
  >"$OUT/result.json"
cat "$OUT/result.json"
