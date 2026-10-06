// Room left on the ledger lists DRAW reads whole. Reads are paged (see
// LedgerClient.activeContracts), so the JSON Ledger API's 200-element list
// limit no longer breaks a view, but every list is still read in full on each
// poll. On DevNet every demo fund lives on the same five parties and nothing
// archives a settled notice, so those lists only grow. Before an action adds
// to a list, the server checks it still has room under a ceiling and refuses
// the action if it has not, so the demo fills up instead of slowing to a
// crawl. A single payment also spends every unlocked holding the LP has, and
// Amulet refuses more than 100 inputs, which the holding ceiling covers.
//
// Run directly, it prints the length of each list for the provisioned parties
// in `.env`. It only reads.
//   node app/capacity.mjs
import { fileURLToPath } from 'node:url';

import { INTERFACES, LedgerClient, TEMPLATES } from '../scripts/demo/lib/ledger.mjs';
import { network } from '../scripts/demo/lib/network.mjs';

// Canton 3.5's default http-list-max-elements-limit, for the unpaged fallback.
export const LEDGER_LIST_LIMIT = 200;
const DEFAULT_CEILING = 600;

export const LISTS = {
  Fund: { templateId: TEMPLATES.Fund },
  CommitmentInvitation: { templateId: TEMPLATES.CommitmentInvitation },
  InvestorCommitment: { templateId: TEMPLATES.InvestorCommitment },
  CapitalCall: { templateId: TEMPLATES.CapitalCall },
  CapitalCallObligation: { templateId: TEMPLATES.CapitalCallObligation },
  PaymentRequest: { templateId: TEMPLATES.PaymentRequest },
  Allocation: { interfaceId: INTERFACES.Allocation },
  Holding: { interfaceId: INTERFACES.Holding },
};

// What the health check counts. Every DRAW contract an LP sees, the fund
// manager sees too, so the fund manager's lists plus each LP's own holdings
// cover everything the app reads.
const WATCHED = [
  ...Object.keys(LISTS).map((list) => ['admin', list]),
  ['lpA', 'Holding'],
  ['lpB', 'Holding'],
  ['lpC', 'Holding'],
];

export class NoRoom extends Error {}

export function parseCeiling(text) {
  const value = Number(text?.trim() || DEFAULT_CEILING);
  if (!(Number.isInteger(value) && value > 0)) throw new Error(`DRAW_LIST_CEILING must be a whole number above zero, not "${text}"`);
  return value;
}

// One list's length as `reader` sees it, or Infinity when the ledger already
// refuses to return it. `reader` is anything with a ledger client and a party
// per role, like a DrawSession.
async function lengthOf(reader, role, list) {
  try {
    return (await reader.client[role].activeContracts(reader.party[role], LISTS[list])).length;
  } catch (error) {
    if (error.status === 413) return Infinity;
    throw error;
  }
}

export function createCapacity({ ceiling, now = () => Date.now() }) {
  let counted = [];
  let countedAt = null;

  // A need is { role, lists, add, ceiling? }: the lists' lengths together, plus
  // what the action adds, must stay within the ceiling. Lists share one need
  // when an action later moves a record from one to the other, as settling
  // turns a payment into a holding for the fund.
  async function fitsAll(reader, needs) {
    const pairs = [...new Set(needs.flatMap(({ role, lists }) => lists.map((list) => `${role}:${list}`)))];
    const lengths = new Map(await Promise.all(pairs.map(async (pair) => {
      const [role, list] = pair.split(':');
      return [pair, await lengthOf(reader, role, list)];
    })));
    return needs.every(({ role, lists, add, ceiling: own }) => lists.reduce((total, list) => total + lengths.get(`${role}:${list}`), add) <= (own ?? ceiling));
  }

  return {
    ceiling,

    // Throws NoRoom with `message` unless every need fits.
    async ensure(reader, needs, message) {
      if (!(await fitsAll(reader, needs))) throw new NoRoom(message);
    },

    // Whether one need fits, for a step an action can skip.
    fits: (reader, need) => fitsAll(reader, [need]),

    // Counts every watched list, one read at a time to go easy on a shared node.
    async refresh(reader) {
      const next = [];
      for (const [role, list] of WATCHED) next.push({ role, list, count: await lengthOf(reader, role, list) });
      counted = next;
      countedAt = now();
    },

    // The last count, fullest list first. `full` means some action is being
    // refused now. `warning` means a list is past four fifths of the ceiling.
    report() {
      if (!countedAt) return { ceiling, ledgerLimit: LEDGER_LIST_LIMIT, countedAt: null, full: null, warning: null, lists: [] };
      const lists = [...counted]
        .sort((a, b) => b.count - a.count)
        .map(({ role, list, count }) => (Number.isFinite(count) ? { role, list, count } : { role, list, count: null, overLedgerLimit: true }));
      const over = (share) => counted.some(({ count }) => count >= Math.floor(ceiling * share));
      return { ceiling, ledgerLimit: LEDGER_LIST_LIMIT, countedAt: new Date(countedAt).toISOString(), full: over(1), warning: over(0.8), lists };
    },
  };
}

// Ledger clients for the parties in `.env`, without opening a DrawSession.
// Only provisioned parties are shared by every tour, so other modes have none.
export function provisionedReader() {
  if (network.partyMode !== 'provisioned') return null;
  const roles = [...new Set(WATCHED.map(([role]) => role))];
  return {
    party: Object.fromEntries(roles.map((role) => [role, network.provisioned[role].party])),
    client: Object.fromEntries(roles.map((role) => [role, new LedgerClient({ baseUrl: network.apiFor(role), userId: network.provisioned[role].userId, label: `count-${role}` })])),
  };
}

async function printCounts() {
  const reader = provisionedReader();
  if (!reader) throw new Error(`counting needs provisioned parties, and DRAW_PARTY_MODE is ${network.partyMode}`);
  console.log(`${network.name}: list lengths for the provisioned parties. The ledger returns at most ${LEDGER_LIST_LIMIT} per read, and the app stops adding at ${parseCeiling(process.env.DRAW_LIST_CEILING)}.`);
  for (const role of Object.keys(reader.party)) {
    const shown = [];
    for (const list of Object.keys(LISTS)) {
      const n = await lengthOf(reader, role, list);
      shown.push(`${list} ${Number.isFinite(n) ? n : `over ${LEDGER_LIST_LIMIT}`}`);
    }
    console.log(`${role.padEnd(6)} ${shown.join(', ')}`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  printCounts().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
