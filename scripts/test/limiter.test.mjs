import assert from 'node:assert/strict';
import { test } from 'node:test';

import { clientKey, createLimiter, parseLimit } from '../../app/limiter.mjs';

const MINUTE = 60_000;

function limiterAt(buckets) {
  const clock = { now: Date.parse('2026-10-06T12:00:00Z') };
  return { clock, limiter: createLimiter({ buckets, now: () => clock.now }) };
}

const only = (perClient, global = null) => ({ action: { perClient, global } });

test('limits are written as actions per seconds, or off', () => {
  assert.deepEqual(parseLimit('30/600', '1/1'), { limit: 30, windowMs: 600_000 });
  assert.deepEqual(parseLimit(undefined, '120/600'), { limit: 120, windowMs: 600_000 });
  assert.deepEqual(parseLimit('  ', '5/60'), { limit: 5, windowMs: 60_000 });
  assert.equal(parseLimit('off', '30/600'), null);
  for (const bad of ['30', '30/0', '0/600', 'ten/600', '30 per 600']) assert.throws(() => parseLimit(bad, '30/600'), /30\/600/);
});

test('a visitor gets its allowance, then a wait that ends when its oldest action leaves the window', () => {
  const { clock, limiter } = limiterAt(only({ limit: 3, windowMs: 10 * MINUTE }));
  for (let i = 0; i < 3; i += 1) {
    assert.deepEqual(limiter.take('1.2.3.4', ['action']), { ok: true });
    clock.now += MINUTE;
  }
  assert.deepEqual(limiter.take('1.2.3.4', ['action']), { ok: false, bucket: 'action', scope: 'client', retryAfterMs: 7 * MINUTE });
  clock.now += 7 * MINUTE - 1;
  assert.equal(limiter.take('1.2.3.4', ['action']).ok, false);
  clock.now += 1;
  assert.deepEqual(limiter.take('1.2.3.4', ['action']), { ok: true });
});

test('refused requests do not use up the allowance', () => {
  const { clock, limiter } = limiterAt(only({ limit: 1, windowMs: MINUTE }));
  assert.ok(limiter.take('a', ['action']).ok);
  for (let i = 0; i < 20; i += 1) assert.equal(limiter.take('a', ['action']).ok, false);
  clock.now += MINUTE;
  assert.ok(limiter.take('a', ['action']).ok);
});

test('each visitor has its own window, and the shared window caps them all', () => {
  const { limiter } = limiterAt(only({ limit: 2, windowMs: 10 * MINUTE }, { limit: 3, windowMs: 10 * MINUTE }));
  assert.ok(limiter.take('a', ['action']).ok);
  assert.ok(limiter.take('a', ['action']).ok);
  assert.equal(limiter.take('a', ['action']).scope, 'client');
  assert.ok(limiter.take('b', ['action']).ok);
  const crowd = limiter.take('c', ['action']);
  assert.equal(crowd.ok, false);
  assert.equal(crowd.scope, 'global');
  assert.equal(crowd.retryAfterMs, 10 * MINUTE);
});

test('an action that draws on two buckets goes ahead only if it fits both, and is counted in both', () => {
  const { limiter } = limiterAt({
    action: { perClient: { limit: 3, windowMs: 10 * MINUTE }, global: null },
    setup: { perClient: { limit: 1, windowMs: 60 * MINUTE }, global: null },
  });
  assert.ok(limiter.take('a', ['action', 'setup']).ok);
  const second = limiter.take('a', ['action', 'setup']);
  assert.equal(second.ok, false);
  assert.equal(second.bucket, 'setup');
  assert.equal(second.retryAfterMs, 60 * MINUTE);
  // The refused setup took nothing from the action bucket: two more actions fit.
  assert.ok(limiter.take('a', ['action']).ok);
  assert.ok(limiter.take('a', ['action']).ok);
  const third = limiter.take('a', ['action']);
  assert.equal(third.bucket, 'action');
  assert.ok(limiter.take('b', ['action', 'setup']).ok);
});

test('without a visitor address only the shared window applies', () => {
  const { limiter } = limiterAt(only({ limit: 1, windowMs: MINUTE }, { limit: 3, windowMs: MINUTE }));
  assert.ok(limiter.take(null, ['action']).ok);
  assert.ok(limiter.take(null, ['action']).ok);
  assert.ok(limiter.take(null, ['action']).ok);
  assert.equal(limiter.take(null, ['action']).scope, 'global');
});

test('turned off, nothing is limited', () => {
  const { limiter } = limiterAt(only(null));
  for (let i = 0; i < 1000; i += 1) assert.ok(limiter.take('a', ['action']).ok);
});

test('visitors who stopped acting are forgotten once many are tracked', () => {
  const { clock, limiter } = limiterAt(only({ limit: 1, windowMs: MINUTE }));
  for (let i = 0; i < 6000; i += 1) limiter.take(`10.0.${Math.floor(i / 256)}.${i % 256}`, ['action']);
  assert.equal(limiter.tracked(), 6000);
  clock.now += MINUTE;
  assert.ok(limiter.take('10.0.0.0', ['action']).ok);
  assert.equal(limiter.tracked(), 1);
  assert.equal(limiter.take('10.0.0.0', ['action']).ok, false);
});

test('an IPv6 visitor is counted by its /64, and an IPv4 one by its address', () => {
  assert.equal(clientKey('198.51.100.7'), '198.51.100.7');
  assert.equal(clientKey('::ffff:198.51.100.7'), '198.51.100.7');
  assert.equal(clientKey('2001:db8:5:6::1'), '2001:db8:5:6::/64');
  assert.equal(clientKey('2001:0DB8:0005:0006:ffff:ffff:ffff:9'), '2001:db8:5:6::/64');
  assert.equal(clientKey('2001:db8::1'), '2001:db8:0:0::/64');
  assert.equal(clientKey('fe80::1%en0'), 'fe80:0:0:0::/64');
  assert.equal(clientKey('64:ff9b::192.0.2.1'), '64:ff9b:0:0::/64');
  assert.equal(clientKey(null), null);
  assert.equal(clientKey(''), null);

  const { limiter } = limiterAt(only({ limit: 1, windowMs: MINUTE }));
  assert.ok(limiter.take('2001:db8:5:6::1', ['action']).ok);
  assert.equal(limiter.take('2001:db8:5:6:a:b:c:d', ['action']).ok, false);
  assert.ok(limiter.take('2001:db8:5:7::1', ['action']).ok);
});
