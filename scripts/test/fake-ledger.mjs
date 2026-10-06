// A stand-in JSON Ledger API and token registry for the app server's tests and
// for driving the web app in a browser without a real network. It keeps an
// in-memory active contract set and implements only the reads and commands the
// app uses, with the Daml model's main checks. Nothing it produces is evidence.
//
// Run directly, it listens on PORT and gives each provisioned LP in the
// environment 100 CC:
//   PORT=4191 DRAW_LPA_PARTY=... node scripts/test/fake-ledger.mjs
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');

// The package id the app will look for, read from the same DAR it uses.
function packageId() {
  const version = readFileSync(join(ROOT, 'contracts/daml/daml.yaml'), 'utf8').match(/^version:\s*(\S+)/m)[1];
  const built = join(ROOT, `contracts/daml/.daml/dist/draw-${version}.dar`);
  const dar = existsSync(built) ? built : join(ROOT, `contracts/dist/draw-${version}.dar`);
  const manifest = execFileSync('unzip', ['-p', dar, 'META-INF/MANIFEST.MF']).toString().replace(/\r?\n /g, '');
  return manifest.match(/^Main-Dalf:\s*(\S+)/m)[1].match(/-([0-9a-f]{64})\//)[1];
}

const entity = (id) => id.split(':').slice(-2).join(':');
const TEMPLATE = (name) => `#draw:Draw.CapitalCall:${name}`;
const HOLDING = 'Splice.Api.Token.HoldingV1:Holding';
const ALLOCATION = 'Splice.Api.Token.AllocationV1:Allocation';
const AMULET = { admin: 'DSO::1220dso', id: 'Amulet' };
const OPEN = ['Issued', 'PaymentPending', 'Overdue'];

const refuse = (status, message) => Object.assign(new Error(message), { status });

// Which parties see a contract, the way the Daml model and the token standard
// decide it: the fund admin and the LP on DRAW contracts, the owner of a
// holding, and the sender, receiver and executor of an allocation.
function sees(contract, party) {
  if (contract.interface === HOLDING) return contract.view.owner === party;
  if (contract.interface === ALLOCATION) {
    const { settlement, transferLeg } = contract.view.allocation;
    return [transferLeg.sender, transferLeg.receiver, settlement.executor].includes(party);
  }
  return contract.payload.admin === party || contract.payload.lp === party;
}

export async function startFakeLedger({ listLimit = 200, port = 0 } = {}) {
  const pkg = packageId();
  let counter = 0;
  let offset = 1;
  const acs = [];
  const exercised = [];
  const transactions = new Map();
  // Requests to POST /v2/packages wait while `hold` is a pending promise.
  const gate = { hold: null };

  const add = (contract) => {
    const stored = { contractId: `00fake${String((counter += 1)).padStart(6, '0')}`, ...contract };
    acs.push(stored);
    return stored;
  };
  const find = (contractId) => {
    const contract = acs.find((c) => c.contractId === contractId);
    if (!contract) throw refuse(404, `CONTRACT_NOT_FOUND: Contract could not be found with id ${contractId}`);
    return contract;
  };
  const archive = (contractId) => acs.splice(acs.indexOf(find(contractId)), 1)[0];
  const created = (contract) => ({ CreatedEvent: { contractId: contract.contractId, templateId: contract.templateId, createArgument: contract.payload } });
  const holding = (owner, amount, lock = null) => add({ interface: HOLDING, view: { owner, amount: String(amount), instrumentId: AMULET, lock } });

  const choices = {
    Fund_InviteInvestor: (fund, { lp, committedScenarioAmount, instrumentId }) => [created(add({
      templateId: TEMPLATE('CommitmentInvitation'),
      payload: { admin: fund.payload.admin, lp, fundId: fund.payload.fundId, fundName: fund.payload.fundName, committedScenarioAmount, instrumentId },
    }))],

    Invitation_Accept: (invitation) => {
      archive(invitation.contractId);
      return [created(add({ templateId: TEMPLATE('InvestorCommitment'), payload: { ...invitation.payload, calledScenarioAmount: '0.0' } }))];
    },

    Invitation_Withdraw: (invitation) => {
      archive(invitation.contractId);
      return [];
    },

    Fund_IssueCall: (fund, { callId, description, dueAt, requests }) => {
      const commitments = requests.map((r) => find(r.commitmentCid));
      commitments.forEach((c, i) => {
        if (c.payload.fundId !== fund.payload.fundId) throw refuse(400, 'commitment belongs to a different fund');
        if (Number(c.payload.calledScenarioAmount) + Number(requests[i].scenarioAmount) > Number(c.payload.committedScenarioAmount)) throw refuse(400, 'call exceeds remaining commitment');
      });
      const events = requests.flatMap((r, i) => {
        const commitment = archive(commitments[i].contractId);
        const called = String(Number(commitment.payload.calledScenarioAmount) + Number(r.scenarioAmount));
        return [
          created(add({ templateId: TEMPLATE('InvestorCommitment'), payload: { ...commitment.payload, calledScenarioAmount: called } })),
          created(add({
            templateId: TEMPLATE('CapitalCallObligation'),
            payload: {
              admin: fund.payload.admin, lp: commitment.payload.lp, fundId: fund.payload.fundId, fundName: fund.payload.fundName, callId, obligationRef: r.obligationRef,
              amountDue: r.amountDue, scenarioAmount: r.scenarioAmount, instrumentId: commitment.payload.instrumentId, dueAt, state: 'Issued', pendingAllocationCid: null, settlement: null, reviewNote: null,
            },
          })),
        ];
      });
      const total = (field) => String(requests.reduce((sum, r) => sum + Number(r[field]), 0));
      events.push(created(add({
        templateId: TEMPLATE('CapitalCall'),
        payload: { admin: fund.payload.admin, fundId: fund.payload.fundId, callId, description, dueAt, obligationRefs: requests.map((r) => r.obligationRef), totalScenarioAmount: total('scenarioAmount'), totalAmountDue: total('amountDue') },
      })));
      return events;
    },

    Obligation_MarkPaymentPending: (obligation, { allocationCid }) => {
      if (obligation.payload.state !== 'Issued') throw refuse(400, 'only an issued obligation can become payment-pending');
      archive(obligation.contractId);
      return [created(add({ templateId: obligation.templateId, payload: { ...obligation.payload, state: 'PaymentPending', pendingAllocationCid: allocationCid } }))];
    },

    Obligation_Settle: (obligation, choiceArgument) => {
      const p = obligation.payload;
      const allocation = find(choiceArgument.allocationCid);
      const { settlement, transferLeg } = allocation.view.allocation;
      if (!OPEN.includes(p.state)) throw refuse(400, 'obligation is not open for settlement');
      if (Number(transferLeg.amount) !== Number(p.amountDue)) throw refuse(400, 'allocation amount does not equal amount due');
      if (transferLeg.sender !== p.lp) throw refuse(400, 'allocation sender is not the obligated LP');
      if (settlement.settlementRef.id !== p.obligationRef) throw refuse(400, 'allocation settlement reference does not match obligation');
      archive(allocation.contractId);
      archive(allocation.lockedHoldingCid);
      const received = holding(p.admin, transferLeg.amount);
      archive(obligation.contractId);
      const funded = add({
        templateId: obligation.templateId,
        payload: {
          ...p, state: 'Funded', pendingAllocationCid: null,
          settlement: { allocationCid: allocation.contractId, transferLegId: p.obligationRef, receiverHoldingCids: [received.contractId], settledAmount: transferLeg.amount, settledAfterDue: Date.now() > Date.parse(p.dueAt) },
        },
      });
      return [
        { ExercisedEvent: { contractId: obligation.contractId, templateId: obligation.templateId, choice: 'Obligation_Settle', consuming: true, choiceArgument } },
        { ExercisedEvent: { contractId: allocation.contractId, templateId: ALLOCATION, choice: 'Allocation_ExecuteTransfer', consuming: true, choiceArgument: {} } },
        created(funded),
      ];
    },

    Allocation_Withdraw: (allocation) => {
      archive(allocation.contractId);
      const locked = archive(allocation.lockedHoldingCid);
      holding(locked.view.owner, locked.view.amount);
      return [];
    },
  };

  // The allocation factory is not a contract in this ledger. It spends every
  // input holding, gives back change, and locks the amount for the allocation.
  function allocate({ contractId, choiceArgument: { allocation, inputHoldingCids } }) {
    const { sender, amount } = allocation.transferLeg;
    const inputs = inputHoldingCids.map(find);
    const total = inputs.reduce((sum, h) => sum + Number(h.view.amount), 0);
    if (total < Number(amount)) throw refuse(400, `Insufficient funds: you are missing ${Number(amount) - total} to complete this transfer.`);
    inputs.forEach((h) => archive(h.contractId));
    if (total > Number(amount)) holding(sender, total - Number(amount));
    const locked = holding(sender, amount, { holders: [AMULET.admin], expiresAt: allocation.settlement.settleBefore });
    const stored = add({ interface: ALLOCATION, view: { allocation }, lockedHoldingCid: locked.contractId });
    return [{ ExercisedEvent: { contractId, choice: 'AllocationFactory_Allocate', consuming: false, exerciseResult: { output: { tag: 'AllocationInstructionResult_Completed', value: { allocationCid: stored.contractId } } } } }];
  }

  function submit({ commands }) {
    const [command] = commands;
    let events;
    if (command.CreateCommand) {
      events = [created(add({ templateId: command.CreateCommand.templateId, payload: command.CreateCommand.createArguments }))];
    } else {
      const { choice, contractId, choiceArgument } = command.ExerciseCommand;
      exercised.push({ choice, contractId });
      if (choice === 'AllocationFactory_Allocate') events = allocate(command.ExerciseCommand);
      else if (choices[choice]) events = choices[choice](find(contractId), choiceArgument);
      else throw refuse(400, `the fake ledger has no choice ${choice}`);
    }
    offset += 1;
    const transaction = { updateId: `update-${offset}`, offset, recordTime: new Date().toISOString(), effectiveAt: new Date().toISOString(), events };
    transactions.set(transaction.updateId, transaction);
    return { transaction };
  }

  function visible({ eventFormat }) {
    const [[party, { cumulative }]] = Object.entries(eventFormat.filtersByParty);
    const { TemplateFilter, InterfaceFilter } = cumulative[0].identifierFilter;
    const wanted = TemplateFilter ? entity(TemplateFilter.value.templateId) : entity(InterfaceFilter.value.interfaceId);
    return acs.filter((c) => (c.interface ?? entity(c.templateId)) === wanted && sees(c, party)).map((c) => ({
      contractEntry: { JsActiveContract: { createdEvent: { contractId: c.contractId, templateId: c.templateId ?? c.interface, createArgument: c.payload ?? {}, interfaceViews: c.view ? [{ viewValue: c.view, viewStatus: { code: 0 } }] : [] } } },
    }));
  }

  // The whole list in one answer, refused past the list limit the way Canton 3.5 does.
  function active(request) {
    const entries = visible(request);
    if (entries.length > listLimit) throw refuse(413, `MaximumNumberOfElements: ${entries.length} > ${listLimit}`);
    return entries;
  }

  // The same list a page at a time, which has no list limit.
  function activePage({ maxPageSize = 1000, pageToken, ...request }) {
    const entries = visible(request);
    const start = pageToken ? Number(Buffer.from(pageToken, 'base64').toString()) : 0;
    const end = start + maxPageSize;
    return { activeContracts: entries.slice(start, end), activeAtOffset: request.activeAtOffset ?? offset, ...(end < entries.length ? { nextPageToken: Buffer.from(String(end)).toString('base64') } : {}) };
  }

  const context = { choiceContextData: { values: {} }, disclosedContracts: [] };
  const server = createServer(async (req, res) => {
    let raw = '';
    for await (const chunk of req) raw += chunk;
    const reply = (status, body) => {
      res.writeHead(status, { 'content-type': 'application/json' });
      res.end(JSON.stringify(body));
    };
    const json = () => (raw ? JSON.parse(raw) : {});
    const path = req.url;
    try {
      if (path === '/v2/state/ledger-end') return reply(200, { offset });
      if (path === '/v2/packages' && req.method === 'GET') return reply(200, { packageIds: [pkg] });
      if (path === '/v2/packages' && req.method === 'POST') {
        await gate.hold;
        return reply(200, {});
      }
      if (path === '/v2/state/active-contracts') return reply(200, active(json()));
      if (path === '/v2/state/active-contracts-page') return reply(200, activePage(json()));
      if (path === '/v2/commands/submit-and-wait-for-transaction') return reply(200, submit(json().commands));
      if (path === '/v2/updates/update-by-id') {
        const transaction = transactions.get(json().updateId);
        return transaction ? reply(200, { update: { Transaction: { value: transaction } } }) : reply(404, { code: 'UPDATE_NOT_FOUND' });
      }
      if (path === '/registry/metadata/v1/info') return reply(200, { adminId: AMULET.admin });
      if (path === '/registry/metadata/v1/instruments') return reply(200, { instruments: [{ id: 'Amulet', supportedApis: { 'splice-api-token-allocation-v1': 1 } }] });
      if (path === '/registry/allocation-instruction/v1/allocation-factory') {
        return reply(200, { factoryId: 'fake-allocation-factory', choiceContext: { ...context, disclosedContracts: [{ templateId: 'fake', contractId: 'fake-allocation-factory', createdEventBlob: '', synchronizerId: 'fake::synchronizer' }] } });
      }
      if (/^\/registry\/allocations\/v1\/[^/]+\/choice-contexts\/(withdraw|execute-transfer)$/.test(path)) return reply(200, context);
      return reply(404, { error: `the fake ledger has no ${req.method} ${path}` });
    } catch (error) {
      return reply(error.status ?? 500, { code: error.message, cause: error.message });
    }
  });
  await new Promise((resolve) => server.listen(port, '127.0.0.1', resolve));

  return {
    url: `http://127.0.0.1:${server.address().port}`,
    acs,
    exercised,
    gate,
    add,
    template: TEMPLATE,
    holding: (owner, amount = '100.0') => holding(owner, amount),
    allocation: ({ sender, receiver, ref, amount }) => {
      const locked = holding(sender, amount, { holders: [AMULET.admin] });
      return add({
        interface: ALLOCATION,
        lockedHoldingCid: locked.contractId,
        view: { allocation: { settlement: { executor: receiver, settlementRef: { id: ref }, requestedAt: new Date().toISOString(), settleBefore: new Date(Date.now() + 3_600_000).toISOString() }, transferLeg: { sender, receiver, amount, instrumentId: AMULET }, transferLegId: ref } },
      });
    },
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const fake = await startFakeLedger({ port: Number(process.env.PORT ?? 4191) });
  for (const key of ['LPA', 'LPB', 'LPC']) if (process.env[`DRAW_${key}_PARTY`]) fake.holding(process.env[`DRAW_${key}_PARTY`], '100.0');
  console.log(`fake ledger on ${fake.url}`);
}
