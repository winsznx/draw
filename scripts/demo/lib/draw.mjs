// DRAW ledger actions, shared by the evidence run and the app. Every method
// submits or reads with the acting role's own ledger user.
import { execFileSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { LedgerClient, TEMPLATES, INTERFACES, transactionEvents } from './ledger.mjs';
import { allocationFactory, amuletInstrument, executeTransferContext, tapContext, withdrawContext } from './registry.mjs';
import { SettlementVerifier } from './verifier.mjs';
import { ROLES, ROOT, network } from './network.mjs';

const darVersion = readFileSync(join(ROOT, 'contracts/daml/daml.yaml'), 'utf8').match(/^version:\s*(\S+)/m)[1];
export const DAR = join(ROOT, `contracts/daml/.daml/dist/draw-${darVersion}.dar`);
export const LPS = ['lpA', 'lpB', 'lpC'];

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
export const sum = (values) => values.reduce((a, b) => a + Number(b), 0);
// Opaque so the token registry's view of an allocation does not name the LP.
export const newRef = () => `DRAW-${randomBytes(8).toString('hex')}`;

// Parties may sit on different participants, so a read right after another
// party's commit can briefly lag. Retries a read until `accept` holds.
export async function eventually(read, accept = Boolean, attempts = 30) {
  let value;
  for (let i = 0; i < attempts; i += 1) {
    value = await read();
    if (accept(value)) return value;
    await sleep(500);
  }
  return value;
}

export function packageInfo() {
  const inspect = execFileSync(join(process.env.HOME, '.dpm/bin/dpm'), ['damlc', 'inspect-dar', '--json', DAR], {
    env: { ...process.env, JAVA_HOME: process.env.JAVA_HOME ?? '/opt/homebrew/opt/openjdk@21' },
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  return {
    packageId: JSON.parse(inspect.toString()).main_package_id,
    darSha256: createHash('sha256').update(readFileSync(DAR)).digest('hex'),
  };
}

const firstCreated = (transaction) => transactionEvents(transaction).find((e) => e.kind === 'created');

export class DrawSession {
  constructor({ party, users, instrument }) {
    this.party = party;
    this.users = users;
    this.instrument = instrument;
    this.client = Object.fromEntries(ROLES.map((role) => [role, new LedgerClient({ baseUrl: network.apiFor(role), userId: users[role], label: role })]));
    this.verifier = new SettlementVerifier({ baseUrl: network.apiFor('admin'), userId: users.verifier, adminParty: party.admin, instrument });
  }

  get state() {
    return { network: network.name, party: this.party, users: this.users };
  }

  roleOf(partyId) {
    return ROLES.find((role) => this.party[role] === partyId);
  }

  // Allocate mode creates fresh parties and users named after `tag`.
  // Provisioned mode uses the ones in `.env` and checks the package is there.
  static async open({ tag, packageId, onStep = () => {} }) {
    const party = {};
    const users = {};
    const apis = [...new Set(ROLES.map((role) => network.apiFor(role)))];

    if (network.partyMode === 'allocate') {
      const operators = Object.fromEntries(apis.map((api) => [api, new LedgerClient({ baseUrl: api, userId: network.operators.provider })]));
      for (const operator of Object.values(operators)) await operator.uploadDar(DAR);
      onStep('dar uploaded', { participants: apis, packageId });
      for (const role of ROLES) {
        const operator = operators[network.apiFor(role)];
        party[role] = await operator.allocateParty(`draw-${role}-${tag}`);
        users[role] = `draw-${role}-${tag}`;
        await operator.createUser(users[role], { actAs: [party[role]], readAs: [party[role]] });
      }
      users.verifier = `draw-verifier-${tag}`;
      await operators[network.apiFor('admin')].createUser(users.verifier, { readAs: [party.admin] });
    } else {
      for (const role of ROLES) {
        party[role] = network.provisioned[role].party;
        users[role] = network.provisioned[role].userId;
      }
      users.verifier = network.provisioned.verifier.userId;
      if (network.operators.provider) {
        await new LedgerClient({ baseUrl: network.apiFor('admin'), userId: network.operators.provider }).uploadDar(DAR);
        onStep('dar uploaded', { participant: network.apiFor('admin'), packageId });
      }
      for (const api of apis) {
        const role = ROLES.find((r) => network.apiFor(r) === api);
        const known = await new LedgerClient({ baseUrl: api, userId: users[role] }).knownPackageNames();
        if (!known.includes(packageId)) throw new Error(`package ${packageId} is not on ${api}. Upload ${DAR} first.`);
      }
    }
    return new DrawSession({ party, users, instrument: await amuletInstrument() });
  }

  static async resume({ party, users }) {
    return new DrawSession({ party, users, instrument: await amuletInstrument() });
  }

  async tap(role, amount) {
    const tap = await tapContext();
    const result = await this.client[role].exercise({
      actAs: [this.party[role]],
      templateId: tap.amuletRules.templateId,
      contractId: tap.amuletRules.contractId,
      choice: 'AmuletRules_DevNet_Tap',
      argument: { receiver: this.party[role], amount, openRound: tap.openRound.contractId },
      disclosedContracts: [tap.amuletRules, tap.openRound],
      synchronizerId: tap.synchronizerId,
    });
    return result.transaction.updateId;
  }

  async holdings(role) {
    const holdings = await this.client[role].activeContracts(this.party[role], { interfaceId: INTERFACES.Holding });
    return holdings.filter((h) => h.interfaceView.owner === this.party[role] && h.interfaceView.instrumentId.id === this.instrument.id);
  }

  async balance(role) {
    return sum((await this.holdings(role)).filter((h) => !h.interfaceView.lock).map((h) => h.interfaceView.amount));
  }

  async contracts(reader, templateId, fundId) {
    const all = await this.client[reader].activeContracts(this.party[reader], { templateId });
    return fundId ? all.filter((c) => c.payload.fundId === fundId) : all;
  }

  async createFund({ fundId, fundName }) {
    const result = await this.client.admin.create({
      actAs: [this.party.admin], templateId: TEMPLATES.Fund, argument: { admin: this.party.admin, fundId, fundName },
    });
    return firstCreated(result.transaction).contractId;
  }

  async invite(fundCid, role, committedScenarioAmount) {
    return this.client.admin.exercise({
      actAs: [this.party.admin], templateId: TEMPLATES.Fund, contractId: fundCid, choice: 'Fund_InviteInvestor',
      argument: { lp: this.party[role], committedScenarioAmount, instrumentId: this.instrument },
    });
  }

  async acceptInvitation(role, invitationCid) {
    return this.client[role].exercise({
      actAs: [this.party[role]], templateId: TEMPLATES.CommitmentInvitation, contractId: invitationCid, choice: 'Invitation_Accept', argument: {},
    });
  }

  // requests: [{ commitmentCid, obligationRef, amountDue, scenarioAmount }]
  async issueCall(fundCid, { callId, description, dueAt, requests }) {
    return this.client.admin.exercise({
      actAs: [this.party.admin], templateId: TEMPLATES.Fund, contractId: fundCid, choice: 'Fund_IssueCall',
      argument: { callId, description, dueAt, requests },
    });
  }

  async allocate(role, { obligationRef, amount }) {
    const now = Date.now();
    const iso = (offsetMs) => new Date(now + offsetMs).toISOString();
    const inputHoldingCids = (await this.holdings(role)).filter((h) => !h.interfaceView.lock).map((h) => h.contractId);
    const choiceArguments = {
      expectedAdmin: this.instrument.admin,
      allocation: {
        settlement: {
          executor: this.party.admin,
          settlementRef: { id: obligationRef, cid: null },
          requestedAt: iso(-60_000),
          allocateBefore: iso(3_600_000),
          settleBefore: iso(7_200_000),
          meta: { values: {} },
        },
        transferLegId: obligationRef,
        transferLeg: { sender: this.party[role], receiver: this.party.admin, amount, instrumentId: this.instrument, meta: { values: {} } },
      },
      requestedAt: iso(-60_000),
      inputHoldingCids,
      extraArgs: { context: { values: {} }, meta: { values: {} } },
    };
    const factory = await allocationFactory(choiceArguments);
    const result = await this.client[role].exercise({
      actAs: [this.party[role]],
      templateId: INTERFACES.AllocationFactory,
      contractId: factory.factoryId,
      choice: 'AllocationFactory_Allocate',
      argument: { ...choiceArguments, extraArgs: { context: factory.choiceContext.choiceContextData, meta: { values: {} } } },
      disclosedContracts: factory.choiceContext.disclosedContracts,
      synchronizerId: factory.choiceContext.disclosedContracts[0].synchronizerId,
    });
    const root = transactionEvents(result.transaction).find((e) => e.kind === 'exercised' && e.choice === 'AllocationFactory_Allocate');
    const { output } = root.exerciseResult;
    if (output.tag !== 'AllocationInstructionResult_Completed') throw new Error(`allocation not completed: ${JSON.stringify(output)}`);
    return { allocationCid: output.value.allocationCid, updateId: result.transaction.updateId };
  }

  async allocations(reader) {
    return this.client[reader].activeContracts(this.party[reader], { interfaceId: INTERFACES.Allocation });
  }

  async markPending(obligationCid, allocationCid) {
    return this.client.admin.exercise({
      actAs: [this.party.admin], templateId: TEMPLATES.CapitalCallObligation, contractId: obligationCid,
      choice: 'Obligation_MarkPaymentPending', argument: { allocationCid },
    });
  }

  async settle(obligationCid, allocationCid) {
    const context = await executeTransferContext(allocationCid);
    return this.client.admin.exercise({
      actAs: [this.party.admin],
      templateId: TEMPLATES.CapitalCallObligation,
      contractId: obligationCid,
      choice: 'Obligation_Settle',
      argument: { allocationCid, extraArgs: { context: context.choiceContextData, meta: { values: {} } } },
      disclosedContracts: context.disclosedContracts,
      synchronizerId: context.disclosedContracts[0]?.synchronizerId,
    });
  }

  // Returns a rejected allocation's locked funds to the LP.
  async withdraw(role, allocationCid) {
    const context = await withdrawContext(allocationCid);
    return this.client[role].exercise({
      actAs: [this.party[role]],
      templateId: INTERFACES.Allocation,
      contractId: allocationCid,
      choice: 'Allocation_Withdraw',
      argument: { extraArgs: { context: context.choiceContextData, meta: { values: {} } } },
      disclosedContracts: context.disclosedContracts,
      synchronizerId: context.disclosedContracts[0]?.synchronizerId,
    });
  }

  async markOverdue(obligationCid) {
    return this.client.admin.exercise({
      actAs: [this.party.admin], templateId: TEMPLATES.CapitalCallObligation, contractId: obligationCid,
      choice: 'Obligation_MarkOverdue', argument: {},
    });
  }

  async resolve(obligationCid, choice, note) {
    return this.client.admin.exercise({
      actAs: [this.party.admin], templateId: TEMPLATES.CapitalCallObligation, contractId: obligationCid,
      choice, argument: { note },
    });
  }

  flagReview(obligationCid, note) { return this.resolve(obligationCid, 'Obligation_FlagManualReview', note); }

  waive(obligationCid, note) { return this.resolve(obligationCid, 'Obligation_Waive', note); }

  reopen(obligationCid, note) { return this.resolve(obligationCid, 'Obligation_Reopen', note); }

  releasePending(obligationCid, note) { return this.resolve(obligationCid, 'Obligation_ReleasePending', note); }
}
