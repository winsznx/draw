// Relay signing for parties whose keys live in the user's browser. An action
// runs on the server until the ledger needs a party's signature. The HTTP
// response then carries the hash to sign (status 202). The browser signs with
// its own key and posts the signature back; the action resumes and the reply
// to that second request carries the next request or the final result. The
// server never holds a party's private key.
import { randomUUID } from 'node:crypto';

const SIGNATURE_TIMEOUT_MS = 3 * 60_000;

export function createRelay() {
  let respond = null;
  let label = '';
  let count = 0;
  const pending = new Map();

  return {
    // Runs one action. `first` resolves with the first reply (done, failed, or a
    // signature request). `done` settles when the action itself has finished.
    run(action, explain) {
      let done;
      const first = new Promise((reply) => {
        respond = reply;
        count = 0;
        done = action().then(
          (body) => respond({ status: 200, body }),
          (error) => respond({ status: 422, body: explain(error) }),
        );
      });
      return { first, done };
    },

    // What the user is about to authorize, shown next to the Sign button.
    describe(text) {
      label = text;
    },

    signerFor(role, party, fingerprint) {
      return {
        party,
        fingerprint,
        sign: (hash) => new Promise((resolve, reject) => {
          const id = randomUUID();
          const timer = setTimeout(() => {
            pending.delete(id);
            reject(new Error('The signature was not given within three minutes. Start the action again.'));
          }, SIGNATURE_TIMEOUT_MS);
          pending.set(id, { resolve, reject, timer, fingerprint });
          count += 1;
          respond({ status: 202, body: { needsSignature: { id, role, party, hash, description: label, step: count } } });
        }),
      };
    },

    // The browser's answer to a signature request. `reply` receives what happens next.
    answer(id, { signature, cancel }, reply) {
      const request = pending.get(id);
      if (!request) {
        reply({ status: 404, body: { error: 'That signature request has expired. Start the action again.' } });
        return;
      }
      pending.delete(id);
      clearTimeout(request.timer);
      respond = reply;
      if (cancel) {
        request.reject(new Error('Signing was cancelled. Nothing was submitted.'));
        return;
      }
      request.resolve({
        format: 'SIGNATURE_FORMAT_CONCAT',
        signature,
        signedBy: request.fingerprint,
        signingAlgorithmSpec: 'SIGNING_ALGORITHM_SPEC_ED25519',
      });
    },
  };
}
