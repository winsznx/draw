// LP A's settlement from DevNet run 20261006T131900Z, as the JSON Ledger API v2
// answers DRAW's read-back. The settlement transaction is the ledger's own
// answer to the read-back's update-by-id request, the same request the run's
// read-back made, as the party its receipt says it read as. It was recorded
// read-only on 2026-10-06 through the demo seats' backend client and is kept
// as returned in devnet-settlement-update.json. The fund admin's active
// contracts are rebuilt: the funded obligation is the one that transaction
// created, and the received holding comes from the run's receipt, which is only
// read. That holding's Amulet template is a package-name reference, since the
// read-back reads only its Holding view.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const RUN = join(HERE, '../../../evidence/devnet/runs/20261006T131900Z');

export const receipt = JSON.parse(readFileSync(join(RUN, 'receipt-lpA.json'), 'utf8'));
export const party = JSON.parse(readFileSync(join(RUN, 'steps.jsonl'), 'utf8').split('\n', 1)[0]).detail.party;

const recorded = JSON.parse(readFileSync(join(HERE, 'devnet-settlement-update.json'), 'utf8'));
const recordedEvents = recorded.update.Transaction.value.events;

const HOLDING = '#splice-api-token-holding-v1:Splice.Api.Token.HoldingV1:Holding';
const entity = (id) => id.split(':').slice(-2).join(':');

const funded = recordedEvents.map((event) => event.CreatedEvent).find((event) => event && entity(event.templateId) === 'Draw.CapitalCall:CapitalCallObligation');

const received = {
  contractId: receipt.receiverHoldingCids[0],
  templateId: '#splice-amulet:Splice.Amulet:Amulet',
  createArgument: {},
  interfaceViews: [{
    interfaceId: HOLDING,
    viewStatus: { code: 0 },
    viewValue: { owner: party.admin, instrumentId: receipt.instrument, amount: receipt.receivedAmount.toFixed(10), lock: null, meta: { values: {} } },
  }],
};

// One page of the fund admin's active contracts for the filter in the request.
export function activeContractsPage({ eventFormat }) {
  const [[reader, { cumulative }]] = Object.entries(eventFormat.filtersByParty);
  const { TemplateFilter, InterfaceFilter } = cumulative[0].identifierFilter;
  const wanted = entity(TemplateFilter?.value.templateId ?? InterfaceFilter.value.interfaceId);
  const events = reader !== party.admin ? [] : [funded, received].filter((event) => (
    [event.templateId, ...(event.interfaceViews ?? []).map((view) => view.interfaceId)].some((id) => entity(id) === wanted)
  ));
  return { activeContracts: events.map((createdEvent) => ({ contractEntry: { JsActiveContract: { createdEvent } } })) };
}

// The recorded update-by-id answer. `actingParties` replaces the parties acting
// on the allocation's execution, and null leaves the field out.
export function settlementUpdate({ actingParties } = {}) {
  const answer = structuredClone(recorded);
  if (actingParties === undefined) return answer;
  const executeTransfer = answer.update.Transaction.value.events
    .map((event) => event.ExercisedEvent)
    .find((event) => event?.choice === 'Allocation_ExecuteTransfer');
  if (actingParties) executeTransfer.actingParties = actingParties;
  else delete executeTransfer.actingParties;
  return answer;
}
