// Token Standard registry and Scan reads for Amulet. Public on LocalNet. On
// DevNet they may sit behind a validator's scan proxy, which takes a token. They supply factories, choice contexts, and disclosed
// contracts. They never decide whether an obligation is funded.
import { tokenFor } from './auth.mjs';
import { network } from './network.mjs';

const REGISTRY_URL = network.registryUrl;
const SCAN_URL = network.scanUrl;

async function authHeaders() {
  return network.scanAuthUser ? { Authorization: `Bearer ${await tokenFor(network.scanAuthUser)}` } : {};
}

async function postJson(url, json) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify(json),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${url} -> HTTP ${response.status}: ${text}`);
  return JSON.parse(text);
}

async function getJson(url) {
  const response = await fetch(url, { headers: await authHeaders() });
  const text = await response.text();
  if (!response.ok) throw new Error(`${url} -> HTTP ${response.status}: ${text}`);
  return JSON.parse(text);
}

export async function registryInfo() {
  return getJson(`${REGISTRY_URL}/metadata/v1/info`);
}

export async function amuletInstrument() {
  const info = await registryInfo();
  const { instruments } = await getJson(`${REGISTRY_URL}/metadata/v1/instruments`);
  const amulet = instruments.find((instrument) => instrument.id === 'Amulet');
  if (!amulet) throw new Error('registry does not list an Amulet instrument');
  if (!amulet.supportedApis['splice-api-token-allocation-v1']) {
    throw new Error('registry does not support splice-api-token-allocation-v1 for Amulet');
  }
  return { admin: info.adminId, id: amulet.id };
}

export async function allocationFactory(choiceArguments) {
  return postJson(`${REGISTRY_URL}/allocation-instruction/v1/allocation-factory`, {
    choiceArguments,
    excludeDebugFields: true,
  });
}

export async function executeTransferContext(allocationCid) {
  return postJson(`${REGISTRY_URL}/allocations/v1/${encodeURIComponent(allocationCid)}/choice-contexts/execute-transfer`, {
    meta: {},
  });
}

export async function withdrawContext(allocationCid) {
  return postJson(`${REGISTRY_URL}/allocations/v1/${encodeURIComponent(allocationCid)}/choice-contexts/withdraw`, {
    meta: {},
  });
}

const toDisclosed = ({ contract, domain_id }) => ({
  templateId: contract.template_id,
  contractId: contract.contract_id,
  createdEventBlob: contract.created_event_blob,
  synchronizerId: domain_id,
});

// AmuletRules and the most recent mining round that is already open, both as
// disclosed contracts for AmuletRules_DevNet_Tap.
export async function tapContext() {
  // Through a validator's scan proxy (DevNet) the reads are GETs and return
  // plain contracts. Public Scan (LocalNet) takes POSTs and returns cache maps.
  const proxy = network.scanProxyUrl;
  const rules = proxy
    ? { amulet_rules_update: (await getJson(`${proxy}/amulet-rules`)).amulet_rules }
    : await postJson(`${SCAN_URL}/v0/amulet-rules`, {});
  const rounds = proxy
    ? await getJson(`${proxy}/open-and-issuing-mining-rounds`)
    : await postJson(`${SCAN_URL}/v0/open-and-issuing-mining-rounds`, {
      cached_open_mining_round_contract_ids: [],
      cached_issuing_round_contract_ids: [],
    });
  const now = Date.now();
  const open = Object.values(rounds.open_mining_rounds)
    .filter(({ contract }) => Date.parse(contract.payload.opensAt) <= now)
    .sort((a, b) => Number(b.contract.payload.round.number) - Number(a.contract.payload.round.number));
  if (open.length === 0) throw new Error('no open mining round yet');
  return {
    amuletRules: toDisclosed(rules.amulet_rules_update),
    openRound: toDisclosed(open[0]),
    synchronizerId: rules.amulet_rules_update.domain_id,
  };
}

