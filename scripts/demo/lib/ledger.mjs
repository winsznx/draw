// Party-scoped JSON Ledger API v2 client. One instance per ledger user, so
// every read and write is authorized by that user's own rights on the
// participant, never by a shared admin credential.
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';

import { tokenFor } from './auth.mjs';

export const TEMPLATES = {
  Fund: '#draw:Draw.CapitalCall:Fund',
  CommitmentInvitation: '#draw:Draw.CapitalCall:CommitmentInvitation',
  InvestorCommitment: '#draw:Draw.CapitalCall:InvestorCommitment',
  CapitalCall: '#draw:Draw.CapitalCall:CapitalCall',
  CapitalCallObligation: '#draw:Draw.CapitalCall:CapitalCallObligation',
};

export const INTERFACES = {
  Holding: '#splice-api-token-holding-v1:Splice.Api.Token.HoldingV1:Holding',
  Allocation: '#splice-api-token-allocation-v1:Splice.Api.Token.AllocationV1:Allocation',
  AllocationFactory: '#splice-api-token-allocation-instruction-v1:Splice.Api.Token.AllocationInstructionV1:AllocationFactory',
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
  constructor({ baseUrl, userId, label }) {
    this.baseUrl = baseUrl;
    this.userId = userId;
    this.label = label ?? userId;
  }

  async request(method, path, { json, body, contentType } = {}) {
    const headers = { Authorization: `Bearer ${await tokenFor(this.userId)}` };
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

  async userRights(userId) {
    return this.request('GET', `/v2/users/${encodeURIComponent(userId)}/rights`);
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
  async activeContracts(party, filter) {
    const activeAtOffset = await this.ledgerEnd();
    const result = await this.request('POST', '/v2/state/active-contracts', {
      json: {
        activeAtOffset,
        eventFormat: {
          verbose: false,
          filtersByParty: { [party]: { cumulative: [LedgerClient.identifierFilter(filter)] } },
        },
      },
    });
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

  async submit({ actAs, readAs = [], commands, disclosedContracts = [], synchronizerId }) {
    const commandId = `draw-${randomUUID()}`;
    const party = actAs[0];
    const result = await this.request('POST', '/v2/commands/submit-and-wait-for-transaction', {
      json: {
        commands: {
          commands,
          commandId,
          userId: this.userId,
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

  async updateById(party, updateId) {
    return this.request('POST', '/v2/updates/update-by-id', {
      json: {
        updateId,
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
