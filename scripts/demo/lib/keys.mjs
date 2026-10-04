// Ed25519 keys for external parties, held by the party itself. In scripts this
// stands in for each user's device. Keys live in `.keys/` (gitignored) and are
// never sent anywhere: only signatures leave this module.
import { createPrivateKey, createPublicKey, generateKeyPairSync, sign } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { ROOT } from './network.mjs';

const KEY_DIR = join(ROOT, '.keys');

export class PartyKey {
  constructor(privateKey) {
    this.privateKey = privateKey;
    this.publicKeySpki = createPublicKey(privateKey).export({ type: 'spki', format: 'der' }).toString('base64');
  }

  static generate() {
    return new PartyKey(generateKeyPairSync('ed25519').privateKey);
  }

  // Loads the key stored under `name`, creating it on first use.
  static named(name) {
    mkdirSync(KEY_DIR, { recursive: true, mode: 0o700 });
    const file = join(KEY_DIR, `${name}.pem`);
    if (existsSync(file)) return new PartyKey(createPrivateKey(readFileSync(file)));
    const key = PartyKey.generate();
    writeFileSync(file, key.privateKey.export({ type: 'pkcs8', format: 'pem' }), { mode: 0o600 });
    return key;
  }

  signature(hashB64, fingerprint) {
    return {
      format: 'SIGNATURE_FORMAT_CONCAT',
      signature: sign(null, Buffer.from(hashB64, 'base64'), this.privateKey).toString('base64'),
      signedBy: fingerprint,
      signingAlgorithmSpec: 'SIGNING_ALGORITHM_SPEC_ED25519',
    };
  }

  // The signer a LedgerClient needs once the party exists.
  signerFor(party, fingerprint) {
    return { party, fingerprint, sign: async (hashB64) => this.signature(hashB64, fingerprint) };
  }
}
