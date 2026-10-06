import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, test } from 'node:test';

import { createTourStore, isTourId, pruneTours } from '../../app/tours.mjs';

const HOUR = 3_600_000;
const START = Date.parse('2026-10-06T12:00:00Z');
const ID = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const FUND = (n) => ({ fundId: `FUND-${n}`, fundCid: `cid-${n}`, fundName: `Fund ${n}`, tag: `tag-${n}` });

let dir;
let file;
let clock;
const now = () => clock;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'draw-tours-'));
  file = join(dir, 'state', '.session-test-tours.json');
  clock = START;
});

afterEach(() => rmSync(dir, { recursive: true, force: true }));

test('a tour id is a long random token, nothing else', () => {
  assert.ok(isTourId('3f2b8c1e-9d4a-4f6b-8a7e-2c1d0b9a8f7e'));
  for (const bad of ['short', '', 'has spaces in it ok?', '../../etc/passwd-0000', 'x'.repeat(65), null, undefined, 42, ['3f2b8c1e-9d4a-4f6b-8a7e-2c1d0b9a8f7e']]) {
    assert.equal(isTourId(bad), false, String(bad));
  }
});

test('pruning keeps the most recently used tours within the cap and drops idle ones', () => {
  const at = (h) => new Date(START + h * HOUR).toISOString();
  const tours = {
    a: { createdAt: at(0), touchedAt: at(5) },
    b: { createdAt: at(1), touchedAt: at(1) },
    c: { createdAt: at(2) },
    d: { createdAt: at(-100), touchedAt: at(-100) },
  };
  assert.deepEqual(Object.keys(pruneTours(tours, { cap: 2, maxIdleMs: 48 * HOUR, now: START + 6 * HOUR })), ['a', 'c']);
  assert.deepEqual(Object.keys(pruneTours(tours, { cap: 10, maxIdleMs: 48 * HOUR, now: START + 6 * HOUR })), ['a', 'c', 'b']);
});

test('a cap that is not a whole number above zero is refused before anything is stored', () => {
  for (const cap of [0, -3, 2.5, Number.NaN, Number('lots')]) assert.throws(() => createTourStore({ file, cap, now }), /whole number above zero/);
  assert.equal(existsSync(file), false);
});

test('a saved tour survives a restart, and saving again keeps when it started', () => {
  const store = createTourStore({ file, now });
  store.put(ID(1), FUND(1));
  clock += HOUR;
  store.put(ID(1), { ...FUND(1), fundName: 'Renamed' });

  const reopened = createTourStore({ file, now });
  const tour = reopened.get(ID(1));
  assert.equal(tour.fundName, 'Renamed');
  assert.equal(tour.createdAt, new Date(START).toISOString());
  assert.equal(tour.touchedAt, new Date(START + HOUR).toISOString());
  assert.equal(reopened.get(ID(2)), null);
});

test('past the cap the least recently used tour is dropped, not the oldest one', () => {
  const store = createTourStore({ file, cap: 2, now });
  store.put(ID(1), FUND(1));
  clock += 1000;
  store.put(ID(2), FUND(2));
  clock += 1000;
  store.touch(ID(1));
  clock += 1000;
  store.put(ID(3), FUND(3));
  assert.ok(store.get(ID(1)));
  assert.equal(store.get(ID(2)), null);
  assert.ok(store.get(ID(3)));
  assert.equal(createTourStore({ file, cap: 2, now }).size(), 2);
});

test('an id that names a built-in object property is an unknown tour', () => {
  const store = createTourStore({ file, now });
  store.put(ID(1), FUND(1));
  for (const id of ['propertyIsEnumerable', 'constructor', 'hasOwnProperty', '__proto__', 'toString']) {
    assert.equal(store.get(id), null, id);
    store.touch(id);
    store.remove(id);
  }
  assert.equal(store.size(), 1);
  store.put('propertyIsEnumerable', FUND(2));
  assert.equal(store.get('propertyIsEnumerable').fundId, 'FUND-2');
  assert.equal(createTourStore({ file, now }).get('propertyIsEnumerable').fundId, 'FUND-2');
});

test('every tour pruning drops is reported, so its fund can be closed', () => {
  const dropped = [];
  const onEvict = (id, tour) => dropped.push([id, tour.fundId]);
  const store = createTourStore({ file, cap: 2, maxIdleMs: 24 * HOUR, now, onEvict });
  store.put(ID(1), FUND(1));
  clock += 1000;
  store.put(ID(2), FUND(2));
  clock += 1000;
  store.put(ID(3), FUND(3));
  assert.deepEqual(dropped, [[ID(1), 'FUND-1']]);
  store.put(ID(3), FUND(3));
  assert.equal(dropped.length, 1);

  clock += 25 * HOUR;
  createTourStore({ file, cap: 2, maxIdleMs: 24 * HOUR, now, onEvict });
  assert.deepEqual(dropped.slice(1).sort(), [[ID(2), 'FUND-2'], [ID(3), 'FUND-3']]);
});

test('removing a tour forgets it on disk too', () => {
  const store = createTourStore({ file, now });
  store.put(ID(1), FUND(1));
  store.remove(ID(1));
  store.remove(ID(9));
  assert.equal(store.get(ID(1)), null);
  assert.equal(createTourStore({ file, now }).get(ID(1)), null);
});

test('recent lists only the tours used within the window', () => {
  const store = createTourStore({ file, now });
  store.put(ID(1), FUND(1));
  clock += 2 * HOUR;
  store.put(ID(2), FUND(2));
  assert.deepEqual(store.recent(HOUR), [ID(2)]);
  assert.deepEqual(store.recent(3 * HOUR).sort(), [ID(1), ID(2)]);
});

test('tours idle for longer than the limit are gone after a restart', () => {
  createTourStore({ file, maxIdleMs: 24 * HOUR, now }).put(ID(1), FUND(1));
  clock += 25 * HOUR;
  assert.equal(createTourStore({ file, maxIdleMs: 24 * HOUR, now }).get(ID(1)), null);
});

test('a damaged file is set aside and the store starts empty', (t) => {
  const logged = t.mock.method(console, 'error', () => {});
  createTourStore({ file, now }).put(ID(1), FUND(1));
  writeFileSync(file, '{ not json');
  const store = createTourStore({ file, now });
  assert.equal(store.size(), 0);
  assert.equal(logged.mock.callCount(), 1);
  const kept = readdirSync(join(dir, 'state')).filter((name) => name.includes('.unreadable-'));
  assert.equal(kept.length, 1);
  assert.equal(readFileSync(join(dir, 'state', kept[0]), 'utf8'), '{ not json');
  store.check();
});

test('the health check notices a file that no longer parses', () => {
  const store = createTourStore({ file, now });
  store.check();
  store.put(ID(1), FUND(1));
  assert.ok(existsSync(file));
  writeFileSync(file, 'garbage');
  assert.throws(() => store.check());
});
