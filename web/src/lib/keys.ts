// Each party's Ed25519 key, generated and kept in this browser (IndexedDB).
// Only public keys and signatures ever leave it. Losing the key means losing
// control of the party, so the header offers a backup download.

const DB_NAME = 'draw-keys';
const STORE = 'keys';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Could not open key storage.'));
  });
}

async function withStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const request = run(db.transaction(STORE, mode).objectStore(STORE));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Key storage failed.'));
  });
}

const keyId = (network: string, sessionTag: string, role: string): string => `${network}:${sessionTag}:${role}`;

const toBase64 = (bytes: ArrayBuffer): string => btoa(String.fromCharCode(...new Uint8Array(bytes)));
const fromBase64 = (b64: string): Uint8Array<ArrayBuffer> => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

export async function hasKey(network: string, sessionTag: string, role: string): Promise<boolean> {
  return (await withStore<CryptoKeyPair | undefined>('readonly', (s) => s.get(keyId(network, sessionTag, role)))) !== undefined;
}

// Creates and stores a new key pair. Returns the public key as base64 DER (SPKI).
export async function createKey(network: string, sessionTag: string, role: string): Promise<string> {
  const pair = (await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify'])) as CryptoKeyPair;
  await withStore('readwrite', (s) => s.put(pair, keyId(network, sessionTag, role)));
  return toBase64(await crypto.subtle.exportKey('spki', pair.publicKey));
}

async function loadKey(network: string, sessionTag: string, role: string): Promise<CryptoKeyPair> {
  const pair = await withStore<CryptoKeyPair | undefined>('readonly', (s) => s.get(keyId(network, sessionTag, role)));
  if (!pair) throw new Error('This browser does not hold the key for this account. Restore it from your backup.');
  return pair;
}

// Signs the base64 hash the ledger asked for. Returns a base64 signature.
export async function signHash(network: string, sessionTag: string, role: string, hashB64: string): Promise<string> {
  const pair = await loadKey(network, sessionTag, role);
  return toBase64(await crypto.subtle.sign({ name: 'Ed25519' }, pair.privateKey, fromBase64(hashB64)));
}

// The private key as PKCS#8 PEM, for the user to keep somewhere safe.
export async function backupPem(network: string, sessionTag: string, role: string): Promise<string> {
  const pair = await loadKey(network, sessionTag, role);
  const b64 = toBase64(await crypto.subtle.exportKey('pkcs8', pair.privateKey));
  return `-----BEGIN PRIVATE KEY-----\n${b64.match(/.{1,64}/g)?.join('\n')}\n-----END PRIVATE KEY-----\n`;
}
