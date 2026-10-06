// Party-scoped JSON Ledger API v2 client. One instance per ledger user, so
// every read and write is authorized by that user's own rights on the
// participant, never by a shared admin credential.
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';

import { ledgerUserOf, tokenFor, tokenSubject } from './auth.mjs';

export const TEMPLATES = {
  Fund: '#draw:Draw.CapitalCall:Fund',
  CommitmentInvitation: '#draw:Draw.CapitalCall:CommitmentInvitation',
  InvestorCommitment: '#draw:Draw.CapitalCall:InvestorCommitment',
  CapitalCall: '#draw:Draw.CapitalCall:CapitalCall',
  CapitalCallObligation: '#draw:Draw.CapitalCall:CapitalCallObligation',
  PaymentRequest: '#draw:Draw.CapitalCall:PaymentRequest',
};

export const INTERFACES = {
  Holding: '#splice-api-token-holding-v1:Splice.Api.Token.HoldingV1:Holding',
  Allocation: '#splice-api-token-allocation-v1:Splice.Api.Token.AllocationV1:Allocation',
  AllocationFactory: '#splice-api-token-allocation-instruction-v1:Splice.Api.Token.AllocationInstructionV1:AllocationFactory',
  AllocationRequest: '#splice-api-token-allocation-request-v1:Splice.Api.Token.AllocationRequestV1:AllocationRequest',
};

const ACS_PAGE_SIZE = 500;

const subjectOf = (token) => {
  try {
    return JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()).sub ?? null;
  } catch {
    // Not a JWT. The request still goes out, just without a recorded subject.
    return null;
  }
};

export class LedgerError extends Error {
  constructor(status, path, body) {
    super(`${path} -> HTTP ${status}: ${typeof body === 'string' ? body : JSON.stringify(body)}`);
    this.status = status;
    this.path = path;
    this.body = body;
  }
}

export class LedgerClient {
  // `signer` makes this client act for an external party: every submission is
  // prepared by the participant, signed by the party's own key, then executed.
  // Without the key the participant cannot act for that party.
  constructor({ baseUrl, userId, label, signer }) {
    this.baseUrl = baseUrl;
    this.userId = userId;
    this.label = label ?? userId;
    this.signer = signer;
  }

  async request(method, path, { json, body, contentType } = {}) {
    const token = await tokenFor(this.userId);
    // Who the ledger sees make this request: the token's subject.
    this.lastSubject = subjectOf(token);
    const headers = { Authorization: `Bearer ${token}` };
    let payload = body;
    if (json !== undefined) {
      headers['Content-Type'] = 'application/json';
      payload = JSON.stringify(json);
    } else if (contentType) {
      headers['Content-Type'] = contentType;
    }
    const response = await fetch(`${this.baseUrl}${path}`, { method, headers, body: payload });
    const text = await response.text();
    let parsed = text;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      // Non-JSON error bodies are kept as text.
    }
    if (!response.ok) throw new LedgerError(response.status, path, parsed);
    return parsed;
  }

  async ledgerEnd() {
    return (await this.request('GET', '/v2/state/ledger-end')).offset;
  }

  async uploadDar(darPath) {
    const bytes = await readFile(darPath);
    return this.request('POST', '/v2/packages', { body: bytes, contentType: 'application/octet-stream' });
  }

  async allocateParty(partyIdHint) {
    const result = await this.request('POST', '/v2/parties', {
      json: { partyIdHint, identityProviderId: '' },
    });
    return result.partyDetails.party;
  }

  async createUser(userId, { actAs = [], readAs = [] }) {
    const rights = [
      ...actAs.map((party) => ({ kind: { CanActAs: { value: { party } } } })),
      ...readAs.map((party) => ({ kind: { CanReadAs: { value: { party } } } })),
    ];
    return this.request('POST', '/v2/users', {
      json: {
        user: { id: userId, primaryParty: actAs[0] ?? readAs[0] ?? '', isDeactivated: false, identityProviderId: '' },
        rights,
      },
    });
  }

  async knownPackageNames() {
    const { packageIds } = await this.request('GET', '/v2/packages');
    return packageIds;
  }

  // The ledger user this client's requests act as: its token's subject.
  async tokenSubject() {
    return tokenSubject(this.userId);
  }

  // The subject of the token the last request carried, without a new token
  // request, or null before the first request.
  get requestSubject() {
    return this.lastSubject ?? null;
  }

  async userRights(userId) {
    return this.request('GET', `/v2/users/${encodeURIComponent(await ledgerUserOf(userId))}/rights`);
  }

  static identifierFilter({ templateId, interfaceId }) {
    if (interfaceId) {
      return {
        identifierFilter: {
          InterfaceFilter: { value: { interfaceId, includeInterfaceView: true, includeCreatedEventBlob: false } },
        },
      };
    }
    return {
      identifierFilter: { TemplateFilter: { value: { templateId, includeCreatedEventBlob: false } } },
    };
  }

  // Active contracts visible to `party`, read through this client's own token.
  // Paged, so a party with more than the node's list limit (200 on Canton
  // 3.5's JSON API) still reads in full. Every page uses the same snapshot
  // offset. Nodes without the paged endpoint fall back to the plain one.
  async activeContracts(party, filter) {
    const activeAtOffset = await this.ledgerEnd();
    const eventFormat = {
      verbose: false,
      filtersByParty: { [party]: { cumulative: [LedgerClient.identifierFilter(filter)] } },
    };
    let result = [];
    try {
      let pageToken;
      do {
        const page = await this.request('POST', '/v2/state/active-contracts-page', {
          json: { activeAtOffset, eventFormat, maxPageSize: ACS_PAGE_SIZE, ...(pageToken ? { pageToken } : {}) },
        });
        result.push(...(page.activeContracts ?? []));
        pageToken = page.nextPageToken || undefined;
      } while (pageToken);
    } catch (error) {
      if (error.status !== 404) throw error;
      result = await this.request('POST', '/v2/state/active-contracts', { json: { activeAtOffset, eventFormat } });
    }
    return result
      .map((entry) => entry.contractEntry?.JsActiveContract?.createdEvent)
      .filter(Boolean)
      .map((event) => ({
        contractId: event.contractId,
        templateId: event.templateId,
        payload: event.createArgument,
        interfaceView: event.interfaceViews?.[0]?.viewValue,
        interfaceViewStatus: event.interfaceViews?.[0]?.viewStatus,
      }));
  }

  static transactionFormat(party) {
    return {
      eventFormat: {
        verbose: true,
        filtersByParty: { [party]: { cumulative: [{ identifierFilter: { WildcardFilter: { value: { includeCreatedEventBlob: false } } } }] } },
      },
      transactionShape: 'TRANSACTION_SHAPE_LEDGER_EFFECTS',
    };
  }

  // Interactive submission: the participant prepares, the party signs the hash.
  async prepare({ actAs, readAs = [], commands, disclosedContracts = [], synchronizerId }) {
    return this.request('POST', '/v2/interactive-submission/prepare', {
      json: {
        userId: await ledgerUserOf(this.userId),
        commandId: `draw-${randomUUID()}`,
        actAs,
        readAs,
        commands,
        disclosedContracts,
        packageIdSelectionPreference: [],
        ...(synchronizerId ? { synchronizerId } : {}),
      },
    });
  }

  async executeSigned({ prepared, party, signature }) {
    const result = await this.request('POST', '/v2/interactive-submission/executeAndWaitForTransaction', {
      json: {
        preparedTransaction: prepared.preparedTransaction,
        hashingSchemeVersion: prepared.hashingSchemeVersion,
        submissionId: randomUUID(),
        userId: await ledgerUserOf(this.userId),
        deduplicationPeriod: { Empty: {} },
        partySignatures: { signatures: [{ party, signatures: [signature] }] },
        transactionFormat: LedgerClient.transactionFormat(party),
      },
    });
    return { commandId: prepared.preparedTransactionHash, transaction: result.transaction };
  }

  // Onboards an external party whose key the caller holds. `sign` signs base64 bytes.
  async allocateExternalParty({ partyHint, publicKeySpki, fingerprintSign, synchronizerId, rightsFor }) {
    const topology = await this.request('POST', '/v2/parties/external/generate-topology', {
      json: {
        synchronizer: synchronizerId,
        partyHint,
        publicKey: { format: 'CRYPTO_KEY_FORMAT_DER_X509_SUBJECT_PUBLIC_KEY_INFO', keyData: publicKeySpki, keySpec: 'SIGNING_KEY_SPEC_EC_CURVE25519' },
      },
    });
    const signature = await fingerprintSign(topology.multiHash, topology.publicKeyFingerprint);
    const allocated = await this.request('POST', '/v2/parties/external/allocate', {
      json: {
        synchronizer: synchronizerId,
        onboardingTransactions: topology.topologyTransactions.map((transaction) => ({ transaction })),
        multiHashSignatures: [signature],
        waitForAllocation: true,
        ...(rightsFor ? { userId: rightsFor } : {}),
      },
    });
    return { party: allocated.partyId, fingerprint: topology.publicKeyFingerprint };
  }

  // Without a party, the participant's own connected synchronizers.
  async synchronizerFor(party) {
    const query = party ? `?party=${encodeURIComponent(party)}` : '';
    const result = await this.request('GET', `/v2/state/connected-synchronizers${query}`);
    return result.connectedSynchronizers?.[0]?.synchronizerId;
  }

  async submit({ actAs, readAs = [], commands, disclosedContracts = [], synchronizerId }) {
    if (this.signer && actAs.includes(this.signer.party)) {
      // Interactive submission needs the synchronizer explicitly.
      this.synchronizerCache ??= await this.synchronizerFor(this.signer.party);
      const prepared = await this.prepare({ actAs, readAs, commands, disclosedContracts, synchronizerId: synchronizerId ?? this.synchronizerCache });
      const signature = await this.signer.sign(prepared.preparedTransactionHash);
      return this.executeSigned({ prepared, party: this.signer.party, signature });
    }
    const commandId = `draw-${randomUUID()}`;
    const party = actAs[0];
    const result = await this.request('POST', '/v2/commands/submit-and-wait-for-transaction', {
      json: {
        commands: {
          commands,
          commandId,
          userId: await ledgerUserOf(this.userId),
          actAs,
          readAs,
          disclosedContracts,
          ...(synchronizerId ? { synchronizerId } : {}),
        },
        transactionFormat: {
          eventFormat: {
            verbose: true,
            filtersByParty: { [party]: { cumulative: [{ identifierFilter: { WildcardFilter: { value: { includeCreatedEventBlob: false } } } }] } },
          },
          transactionShape: 'TRANSACTION_SHAPE_LEDGER_EFFECTS',
        },
      },
    });
    return { commandId, transaction: result.transaction };
  }

  async exercise({ actAs, templateId, contractId, choice, argument, disclosedContracts, synchronizerId }) {
    return this.submit({
      actAs,
      disclosedContracts,
      synchronizerId,
      commands: [{ ExerciseCommand: { templateId, contractId, choice, choiceArgument: argument } }],
    });
  }

  async create({ actAs, templateId, argument }) {
    return this.submit({ actAs, commands: [{ CreateCommand: { templateId, createArguments: argument } }] });
  }

  // With `holdingViews`, created holdings in the update carry their CIP-0056
  // Holding view, including holdings this party only witnessed.
  async updateById(party, updateId, { holdingViews = false } = {}) {
    const cumulative = [{ identifierFilter: { WildcardFilter: { value: { includeCreatedEventBlob: false } } } }];
    if (holdingViews) cumulative.push(LedgerClient.identifierFilter({ interfaceId: INTERFACES.Holding }));
    return this.request('POST', '/v2/updates/update-by-id', {
      json: {
        updateId,
        updateFormat: {
          includeTransactions: {
            eventFormat: {
              verbose: true,
              filtersByParty: { [party]: { cumulative } },
            },
            transactionShape: 'TRANSACTION_SHAPE_LEDGER_EFFECTS',
          },
        },
      },
    });
  }

  // Every transaction this party saw between two offsets, with ledger effects,
  // so events it only witnessed are included too.
  async transactions(party, beginExclusive, endInclusive) {
    const updates = await this.request('POST', '/v2/updates', {
      json: {
        beginExclusive,
        endInclusive,
        updateFormat: {
          includeTransactions: {
            eventFormat: {
              verbose: true,
              filtersByParty: { [party]: { cumulative: [{ identifierFilter: { WildcardFilter: { value: { includeCreatedEventBlob: false } } } }] } },
            },
            transactionShape: 'TRANSACTION_SHAPE_LEDGER_EFFECTS',
          },
        },
      },
    });
    return updates.map((entry) => entry.update?.Transaction?.value).filter(Boolean);
  }

  async eventsByContractId(party, contractId) {
    return this.request('POST', '/v2/events/events-by-contract-id', {
      json: {
        contractId,
        eventFormat: {
          verbose: false,
          filtersByParty: { [party]: { cumulative: [{ identifierFilter: { WildcardFilter: { value: { includeCreatedEventBlob: false } } } }] } },
        },
      },
    });
  }
}

// Flattens a transaction's events into { kind, templateId, contractId, ... }.
export function transactionEvents(transaction) {
  return (transaction?.events ?? []).map((event) => {
    if (event.CreatedEvent) return { kind: 'created', ...event.CreatedEvent };
    if (event.ExercisedEvent) return { kind: 'exercised', ...event.ExercisedEvent };
    if (event.ArchivedEvent) return { kind: 'archived', ...event.ArchivedEvent };
    return { kind: 'unknown', raw: event };
  });
}

export const templateName = (templateId) => templateId.split(':').slice(-2).join(':');
