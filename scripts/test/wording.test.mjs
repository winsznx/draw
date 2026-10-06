import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

// What the site says about who signs, from web/src/lib/format.ts, run from its
// TypeScript source. The page may only say what the configuration shows, and a
// setting it doesn't know must read as less separation, never more.
const { actorName, networkNote, seatSigner } = await import(pathToFileURL(join(dirname(fileURLToPath(import.meta.url)), '../../web/src/lib/format.ts')).href);

const devnet = { network: 'DevNet', browserKeys: false };

test('the shared login and an older API without the new fields both read as one hackathon login that also reads back', () => {
  const shared = networkNote({ ...devnet, singleCredential: true, seatCredential: 'shared-login', separateVerifier: false });
  assert.equal(shared, 'DevNet, HackCanton shared node. One hackathon login signs for every demo seat, and the same login reads each settlement back.');
  assert.equal(networkNote({ ...devnet, singleCredential: true }), shared);
  assert.equal(networkNote({ ...devnet, singleCredential: true, seatCredential: 'per-seat' }), shared, 'per-seat only counts when the seats really are separate');
});

test('the backend client is named, and the read-back login is only called the same or a different one', () => {
  const note = networkNote({ ...devnet, singleCredential: true, seatCredential: 'backend-client', separateVerifier: true });
  assert.equal(note, 'DevNet, HackCanton shared node. DRAW’s backend login signs for every demo seat, and a different login reads each settlement back.');
  assert.doesNotMatch(note, /read-only|can only read/, 'that the login cannot act is for the evidence to say');
  const live = 'DevNet, HackCanton shared node. DRAW’s backend login signs for every demo seat, and the same login reads each settlement back.';
  assert.equal(networkNote({ ...devnet, singleCredential: true, seatCredential: 'backend-client', separateVerifier: false }), live);
  assert.equal(networkNote({ ...devnet, singleCredential: true, seatCredential: 'backend-client' }), live, 'an API that does not say reads as the same login');
});

test('seats that share some other user read as one login', () => {
  assert.equal(seatSigner({ network: 'DevNet', singleCredential: true, seatCredential: 'shared-user' }), 'One hackathon login');
  assert.equal(seatSigner({ network: 'LocalNet', singleCredential: true, seatCredential: 'shared-user' }), 'One login');
});

test('a login per seat and browser keys keep their own sentences', () => {
  assert.equal(networkNote({ network: 'LocalNet', browserKeys: false, singleCredential: false, seatCredential: 'per-seat', separateVerifier: true }), 'LocalNet. Each party reads and acts with its own ledger login.');
  assert.equal(networkNote({ network: 'LocalNet', browserKeys: true, singleCredential: false }), 'LocalNet. Each party signs with its own key.');
});

test('the timeline names the read-back step as DRAW’s own, and every seat by its role', () => {
  assert.equal(actorName('read-back'), 'DRAW’s read-back step');
  assert.equal(actorName('admin'), 'Fund manager');
  assert.equal(actorName('lpA'), 'LP A');
});
