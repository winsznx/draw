// Sliding-window limits on ledger actions. Each bucket has one window per
// visitor and one shared by everyone, so neither a single visitor nor a crowd
// can flood the shared node. An action can draw on several buckets at once,
// such as every action plus the tighter one for starting demo funds, and it
// goes ahead only if it fits all of them. A refused request learns how long
// until it would fit.

// "30/600" allows 30 actions in any 600 seconds. "off" turns the limit off.
export function parseLimit(text, fallback) {
  const value = text?.trim() || fallback;
  if (value === 'off') return null;
  const [, count, seconds] = value.match(/^(\d+)\/(\d+)$/) ?? [];
  if (!(Number(count) > 0 && Number(seconds) > 0)) throw new Error(`a limit is written like 30/600 (actions per seconds) or off, not "${value}"`);
  return { limit: Number(count), windowMs: Number(seconds) * 1000 };
}

// Expands an IPv6 address into its eight groups, or returns null.
function ipv6Groups(text) {
  const halves = text.split('::');
  if (halves.length > 2) return null;
  const groupsOf = (part) => (part ? part.split(':').flatMap((group) => (group.includes('.') ? ['0', '0'] : [group])) : []);
  const head = groupsOf(halves[0]);
  const tail = halves.length === 2 ? groupsOf(halves[1]) : [];
  const missing = 8 - head.length - tail.length;
  if (missing < 0 || (halves.length === 1 && missing !== 0)) return null;
  const groups = [...head, ...Array(missing).fill('0'), ...tail];
  return groups.every((group) => /^[0-9a-f]{1,4}$/.test(group)) ? groups : null;
}

// The key one visitor is counted under. An IPv6 visitor is counted by its /64,
// the block a single connection is usually given, so rotating through the
// addresses of one block does not reset the count.
export function clientKey(address) {
  if (!address) return null;
  const text = String(address).trim().toLowerCase().replace(/%.*$/, '');
  const mapped = text.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (mapped) return mapped[1];
  if (!text.includes(':')) return text;
  const groups = ipv6Groups(text);
  return groups ? `${groups.slice(0, 4).map((group) => group.replace(/^0+(?=.)/, '')).join(':')}::/64` : text;
}

// Once this many windows are held, idle ones are dropped, at most once a minute.
const SWEEP_AT = 5000;
const SWEEP_EVERY_MS = 60_000;

// `buckets` maps a name to { perClient, global }, each a parsed limit or null.
export function createLimiter({ buckets, now = () => Date.now() }) {
  // Window key to { windowMs, times }.
  const hits = new Map();
  let sweptAt = -Infinity;
  const within = (key, windowMs, at) => (hits.get(key)?.times ?? []).filter((t) => at - t < windowMs);

  function sweep(at) {
    sweptAt = at;
    for (const [key, { windowMs, times }] of hits) {
      if (times.every((t) => at - t >= windowMs)) hits.delete(key);
    }
  }

  return {
    // Counts one action for `client` in every named bucket if it fits all of
    // their windows, and counts nothing otherwise. `client` is null when the
    // address is unknown, and then only the shared windows apply.
    take(client, names) {
      const at = now();
      if (hits.size > SWEEP_AT && at - sweptAt >= SWEEP_EVERY_MS) sweep(at);
      const key = clientKey(client);
      const windows = names.flatMap((bucket) => {
        const { perClient, global } = buckets[bucket] ?? {};
        return [
          perClient && key ? { bucket, scope: 'client', key: `${bucket}:client:${key}`, ...perClient } : null,
          global ? { bucket, scope: 'global', key: `${bucket}:global`, ...global } : null,
        ].filter(Boolean);
      });
      for (const { bucket, scope, key: windowKey, limit, windowMs } of windows) {
        const recent = within(windowKey, windowMs, at);
        if (recent.length >= limit) return { ok: false, bucket, scope, retryAfterMs: recent[0] + windowMs - at };
      }
      for (const { key: windowKey, windowMs } of windows) hits.set(windowKey, { windowMs, times: [...within(windowKey, windowMs, at), at] });
      return { ok: true };
    },

    // How many windows are held, the shared ones included.
    tracked: () => hits.size,
  };
}
