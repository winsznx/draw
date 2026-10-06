// DRAW ledger actions, shared by the evidence run and the app. Every method
// submits or reads with the acting role's own ledger user.
import { execFileSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { LedgerClient, TEMPLATES, INTERFACES, transactionEvents } from './ledger.mjs';
import { allocationFactory, amuletInstrument, executeTransferContext, tapContext, withdrawContext } from './registry.mjs';
import { SettlementVerifier } from './verifier.mjs';
import { ROLES, ROOT, network } from './network.mjs';
import { ledgerUserOf, tokenSubject } from './auth.mjs';
import { PartyKey } from './keys.mjs';

const darVersion = readFileSync(join(ROOT, 'contracts/daml/daml.yaml'), 'utf8').match(/^version:\s*(\S+)/m)[1];
// A fresh build if there is one, otherwise the committed release copy, so a
// server without the Daml SDK still deploys the exact same package.
const built = join(ROOT, `contracts/daml/.daml/dist/draw-${darVersion}.dar`);
export const DAR = existsSync(built) ? built : join(ROOT, `contracts/dist/draw-${darVersion}.dar`);
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

// The main package id, read from the DAR's manifest. Manifest lines wrap at 72
// characters with continuation lines that start with a space.
function packageIdFromManifest() {
  const manifest = execFileSync('unzip', ['-p', DAR, 'META-INF/MANIFEST.MF']).toString().replace(/\r?\n /g, '');
  const mainDalf = manifest.match(/^Main-Dalf:\s*(\S+)/m)?.[1];
  const id = mainDalf?.match(/-([0-9a-f]{64})\//)?.[1];
  if (!id) throw new Error(`could not read the package id from ${DAR}`);
  return id;
}

export function packageInfo() {
  const darSha256 = createHash('sha256').update(readFileSync(DAR)).digest('hex');
  return { packageId: packageIdFromManifest(), darSha256, version: darVersion };
}

const firstCreated = (transaction) => transactionEvents(transaction).find((e) => e.kind === 'created');

export const providedParties = () => network.partyMode === 'provisioned' || network.partyMode === 'external-provisioned';

// The users the provided parties act through, as the configuration names them
// now: placeholders such as __backend__, or explicit ids. A stored session's
// ids are never reused for these: a stored id may name a client this process
// has not resolved, or a setup that has since changed, and either would put a
// different credential behind a seat. Nothing here touches the network, so a
// broken client fails only the requests that use it.
export function configuredUsers() {
  const provided = network.partyMode === 'external-provisioned' ? network.provisionedExternal : network.provisioned;
  return Object.fromEntries([...ROLES, 'verifier'].map((role) => [role, provided[role].userId]));
}

// The same users as the ledger user ids their tokens belong to. A configured
// id that is not who its token belongs to stops here, before any evidence or
// label is built from it.
export async function providedUsers() {
  const users = {};
  for (const [role, configured] of Object.entries(configuredUsers())) {
    const id = await ledgerUserOf(configured);
    const subject = await tokenSubject(id);
    if (subject !== id) {
      throw new Error(`the ${role} is configured as ledger user ${configured}, but its token belongs to ${subject}. Fix its DRAW_*_USER or leave it unset.`);
    }
    users[role] = id;
  }
  return users;
}

// What the resolved ledger users can show: whether every seat has a user of
// its own, and whether the read-back verifier is none of the seats.
export function credentialFacts(users) {
  const seats = ROLES.map((role) => users[role]);
  return { seatsSeparate: new Set(seats).size === seats.length, verifierSeparate: Boolean(users.verifier) && !seats.includes(users.verifier) };
}

export class DrawSession {
  // `external` maps a role to { keyName, fingerprint } when that party holds
  // its own key. Its client then signs every submission with that key.
  // `signers` overrides that per role, for keys held somewhere else (a browser).
  // `verifierParty` (draw 0.3.0) is named on new funds as an observer, so the
  // verifier reads settlements through its own party.
  constructor({ party, users, instrument, external = {}, signers = {}, verifierParty = network.verifierParty }) {
    this.party = party;
    this.users = users;
    this.instrument = instrument;
    this.external = external;
    this.verifierParty = verifierParty;
    this.client = Object.fromEntries(ROLES.map((role) => {
      const ext = external[role];
      const signer = signers[role] ?? (ext?.keyName ? PartyKey.named(ext.keyName).signerFor(party[role], ext.fingerprint) : undefined);
      return [role, new LedgerClient({ baseUrl: network.apiFor(role), userId: users[role], label: role, signer })];
    }));
    this.verifier = new SettlementVerifier({ baseUrl: network.apiFor('admin'), userId: users.verifier, adminParty: party.admin, instrument, verifierParty });
  }

  get state() {
    return { network: network.name, party: this.party, users: this.users, external: this.external, verifierParty: this.verifierParty };
  }

  roleOf(partyId) {
    return ROLES.find((role) => this.party[role] === partyId);
  }

  // Allocate mode creates fresh parties and users named after `tag`.
  // External mode does the same, but each party is onboarded with its own key
  // and its ledger user can only relay transactions that key has signed.
  // Provisioned mode uses the ones in `.env` and checks the package is there.
  // External-provisioned mode uses external parties the node operator allocated
  // from topology we signed; the keys are local and sign every transaction.
  static async open({ tag, packageId, onStep = () => {} }) {
    const party = {};
    const users = {};
    const apis = [...new Set(ROLES.map((role) => network.apiFor(role)))];

    const external = {};
    if (network.partyMode === 'external') {
      const operators = Object.fromEntries(apis.map((api) => [api, new LedgerClient({ baseUrl: api, userId: network.operators.provider })]));
      for (const operator of Object.values(operators)) await operator.uploadDar(DAR);
      onStep('dar uploaded', { participants: apis, packageId });
      for (const role of ROLES) {
        const operator = operators[network.apiFor(role)];
        users[role] = `draw-${role}-${tag}`;
        await operator.createUser(users[role], {});
        const keyName = `${tag}-${role}`;
        const key = PartyKey.named(keyName);
        const synchronizerId = await operator.synchronizerFor();
        const { party: id, fingerprint } = await operator.allocateExternalParty({
          partyHint: `draw-${role}-${tag}`,
          publicKeySpki: key.publicKeySpki,
          fingerprintSign: async (hash, fp) => key.signature(hash, fp),
          synchronizerId,
          rightsFor: users[role],
        });
        party[role] = id;
        external[role] = { keyName, fingerprint };
      }
      users.verifier = `draw-verifier-${tag}`;
      await operators[network.apiFor('admin')].createUser(users.verifier, { readAs: [party.admin] });
    } else if (network.partyMode === 'allocate') {
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
      const provided = network.partyMode === 'external-provisioned' ? network.provisionedExternal : network.provisioned;
      for (const role of ROLES) {
        party[role] = provided[role].party;
        if (provided[role].keyName) external[role] = { keyName: provided[role].keyName, fingerprint: provided[role].fingerprint };
      }
      Object.assign(users, configuredUsers());
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
    return new DrawSession({ party, users, external, instrument: await amuletInstrument() });
  }

  // Provided parties act through the users the configuration names now, not
  // the ones stored with the session (see configuredUsers).
  static async resume({ party, users, external, signers, verifierParty }) {
    const current = providedParties() ? configuredUsers() : users;
    return new DrawSession({ party, users: current, external, signers, verifierParty: verifierParty ?? network.verifierParty, instrument: await amuletInstrument() });
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
      actAs: [this.party.admin], templateId: TEMPLATES.Fund,
      argument: { admin: this.party.admin, fundId, fundName, verifier: this.verifierParty ?? null },
    });
    return firstCreated(result.transaction).contractId;
  }

  async invite(fundCid, role, committedScenarioAmount) {
    return this.inviteParty(fundCid, this.party[role], committedScenarioAmount);
  }

  // An investor that is none of this session's roles, such as an LP that
  // signed in with its own login. Only the LP's own credential can accept.
  async inviteParty(fundCid, lp, committedScenarioAmount) {
    return this.client.admin.exercise({
      actAs: [this.party.admin], templateId: TEMPLATES.Fund, contractId: fundCid, choice: 'Fund_InviteInvestor',
      argument: { lp, committedScenarioAmount, instrumentId: this.instrument },
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

  // Payment requests (draw 0.3.0) visible to `reader`.
  async paymentRequests(reader) {
    return this.client[reader].activeContracts(this.party[reader], { templateId: TEMPLATES.PaymentRequest });
  }

  // The open payment request for the obligation with this contract id, if any.
  async paymentRequestFor(obligationCid) {
    const obligation = (await this.client.admin.activeContracts(this.party.admin, { templateId: TEMPLATES.CapitalCallObligation }))
      .find((o) => o.contractId === obligationCid);
    if (!obligation) return null;
    const request = (await this.paymentRequests('admin')).find((r) => r.payload.obligationRef === obligation.payload.obligationRef);
    return request?.contractId ?? null;
  }

  // Withdraws a payment request as the fund, the request's executor, so the
  // LP's wallet stops offering it. Used when a demo fund closes with notices
  // still open.
  async withdrawPaymentRequest(requestCid) {
    return this.client.admin.exercise({
      actAs: [this.party.admin], templateId: INTERFACES.AllocationRequest, contractId: requestCid, choice: 'AllocationRequest_Withdraw',
      argument: { extraArgs: { context: { values: {} }, meta: { values: {} } } },
    });
  }

  // What the LP's wallet shows for a payment request: the CIP-0056
  // AllocationRequest view, read through the LP's own party.
  async allocationRequests(role) {
    return this.client[role].activeContracts(this.party[role], { interfaceId: INTERFACES.AllocationRequest });
  }

  // Creates the allocation exactly as a Canton wallet's Accept does: the
  // request's settlement info and its transfer leg, unchanged.
  async allocateFromRequest(role, requestCid) {
    const request = (await this.allocationRequests(role)).find((r) => r.contractId === requestCid);
    if (!request?.interfaceView) throw new Error('That payment request is not visible to this LP.');
    const [[transferLegId, transferLeg]] = Object.entries(request.interfaceView.transferLegs);
    const inputHoldingCids = (await this.holdings(role)).filter((h) => !h.interfaceView.lock).map((h) => h.contractId);
    const choiceArguments = {
      expectedAdmin: this.instrument.admin,
      allocation: { settlement: request.interfaceView.settlement, transferLegId, transferLeg },
      requestedAt: new Date().toISOString(),
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
    return { allocationCid: output.value.allocationCid, updateId: result.transaction.updateId, transferLegId };
  }

  // Settling also closes the obligation's payment request, so the LP's wallet
  // stops offering it.
  async settle(obligationCid, allocationCid, { paymentRequestCid } = {}) {
    const requestCid = paymentRequestCid === undefined ? await this.paymentRequestFor(obligationCid) : paymentRequestCid;
    const context = await executeTransferContext(allocationCid);
    return this.client.admin.exercise({
      actAs: [this.party.admin],
      templateId: TEMPLATES.CapitalCallObligation,
      contractId: obligationCid,
      choice: 'Obligation_Settle',
      argument: { allocationCid, extraArgs: { context: context.choiceContextData, meta: { values: {} } }, paymentRequestCid: requestCid },
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
    const argument = choice === 'Obligation_Waive' ? { note, paymentRequestCid: await this.paymentRequestFor(obligationCid) } : { note };
    return this.client.admin.exercise({
      actAs: [this.party.admin], templateId: TEMPLATES.CapitalCallObligation, contractId: obligationCid,
      choice, argument,
    });
  }

  flagReview(obligationCid, note) { return this.resolve(obligationCid, 'Obligation_FlagManualReview', note); }

  waive(obligationCid, note) { return this.resolve(obligationCid, 'Obligation_Waive', note); }

  reopen(obligationCid, note) { return this.resolve(obligationCid, 'Obligation_Reopen', note); }

  releasePending(obligationCid, note) { return this.resolve(obligationCid, 'Obligation_ReleasePending', note); }
}
