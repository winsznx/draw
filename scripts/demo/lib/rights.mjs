// What a ledger user may do, as the node's user rights API lists it, and
// whether that matches what DRAW's setup needs. Pure functions, so the probe's
// judgements can be tested against any answer the node might give.

export const hint = (party) => party.split('::')[0];

const PARTY_RIGHTS = ['CanActAs', 'CanReadAs', 'CanExecuteAs'];

// `{ rights: [{ kind: { CanActAs: { value: { party } } } }, ...] }` from
// GET /v2/users/{user}/rights, as party lists plus any right that is not
// about one party (CanReadAsAnyParty, ParticipantAdmin and so on).
export function summarizeRights({ rights = [] } = {}) {
  const parties = (kind) => rights.flatMap((right) => (right.kind?.[kind] ? [right.kind[kind].value.party] : []));
  return {
    actAs: parties('CanActAs'),
    readAs: parties('CanReadAs'),
    executeAs: parties('CanExecuteAs'),
    other: rights.flatMap((right) => Object.keys(right.kind ?? {})).filter((kind) => !PARTY_RIGHTS.includes(kind)),
  };
}

// The backend client acts for every demo party and for nothing else.
// Returns what is wrong, or an empty list.
export function judgeBackend(rights, demoParties) {
  const problems = [];
  const missing = demoParties.filter((party) => !rights.actAs.includes(party));
  const outside = [...new Set([...rights.actAs, ...rights.readAs, ...rights.executeAs])].filter((party) => !demoParties.includes(party));
  if (missing.length) problems.push(`cannot act for ${missing.map(hint).join(', ')}`);
  if (outside.length) problems.push(`also has rights on ${outside.map(hint).join(', ')}`);
  if (rights.other.length) problems.push(`also holds ${rights.other.join(', ')}`);
  return problems;
}

// The verifier client reads as the fund's party and can do nothing else.
// Returns what is wrong, or an empty list.
export function judgeVerifier(rights, fundParty) {
  const problems = [];
  if (!rights.readAs.includes(fundParty)) problems.push('cannot read as the fund');
  const acts = [...new Set([...rights.actAs, ...rights.executeAs])];
  if (acts.length) problems.push(`can act for ${acts.map(hint).join(', ')}`);
  const elsewhere = rights.readAs.filter((party) => party !== fundParty);
  if (elsewhere.length) problems.push(`also reads as ${elsewhere.map(hint).join(', ')}`);
  if (rights.other.length) problems.push(`also holds ${rights.other.join(', ')}`);
  return problems;
}
