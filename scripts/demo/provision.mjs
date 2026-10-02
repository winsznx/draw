// Creates the five DRAW parties and one ledger user per party, plus the
// read-only verifier user, using a participant_admin user. Prints the `.env`
// lines that DRAW_PARTY_MODE=provisioned reads. Run once per network.
//   node scripts/demo/provision.mjs [hintPrefix]
// User ids come from DRAW_<ROLE>_USER when set (an OAuth client's subject on
// DevNet), otherwise `<hintPrefix>-<role>`.
import { LedgerClient } from './lib/ledger.mjs';
import { ROLES, network } from './lib/network.mjs';

const prefix = process.argv[2] ?? 'draw';
if (!network.operators.provider) throw new Error('DRAW_OPERATOR_USER (participant_admin) is required to provision');

const lines = [];
const partyOf = {};
for (const role of ROLES) {
  const operator = new LedgerClient({ baseUrl: network.apiFor(role), userId: network.operators.provider });
  const key = role.toUpperCase();
  const userId = process.env[`DRAW_${key}_USER`] || `${prefix}-${role}`;
  partyOf[role] = await operator.allocateParty(`${prefix}-${role}`);
  await operator.createUser(userId, { actAs: [partyOf[role]], readAs: [partyOf[role]] });
  lines.push(`DRAW_${key}_USER=${userId}`, `DRAW_${key}_PARTY=${partyOf[role]}`);
}
const verifierUser = process.env.DRAW_VERIFIER_USER || `${prefix}-verifier`;
await new LedgerClient({ baseUrl: network.apiFor('admin'), userId: network.operators.provider })
  .createUser(verifierUser, { readAs: [partyOf.admin] });
lines.push(`DRAW_VERIFIER_USER=${verifierUser}`);

console.log(['DRAW_PARTY_MODE=provisioned', ...lines].join('\n'));
