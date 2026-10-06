// Demo tours. Each browser that opens the demo gets its own fund, so visitors
// never share one. The browser keeps a random tour id, the way it keeps its
// seat, and sends it with every request. This store maps a tour id to that
// tour's session in one small JSON file and keeps the most recently used tours.
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const TOUR_ID = /^[A-Za-z0-9-]{16,64}$/;

export const isTourId = (value) => typeof value === 'string' && TOUR_ID.test(value);

const lastUsed = (tour) => Date.parse(tour.touchedAt ?? tour.createdAt) || 0;

// Tours are kept in objects with no prototype, so an id such as
// "propertyIsEnumerable" names no tour instead of a built-in.
const table = (entries = []) => Object.assign(Object.create(null), Object.fromEntries(entries));

// A file next to the store that still ends in .json, so the same ignore rule covers it.
const beside = (file, label) => file.replace(/(\.json)?$/, `.${label}.json`);

// The tours worth keeping: none idle longer than `maxIdleMs`, and at most
// `cap` of them, the most recently used first.
export function pruneTours(tours, { cap, maxIdleMs, now }) {
  return table(Object.entries(tours)
    .filter(([, tour]) => now - lastUsed(tour) <= maxIdleMs)
    .sort(([, a], [, b]) => lastUsed(b) - lastUsed(a))
    .slice(0, cap));
}

function load(file) {
  if (!existsSync(file)) return table();
  try {
    return table(Object.entries(JSON.parse(readFileSync(file, 'utf8'))));
  } catch (error) {
    // A damaged file must not keep the demo down. It is kept for inspection and
    // every visitor starts a new tour.
    const kept = beside(file, `unreadable-${Date.now()}`);
    renameSync(file, kept);
    console.error(`tours: ${file} could not be read (${error.message}), moved it to ${kept}`);
    return table();
  }
}

// `onEvict(id, tour)` hears about every tour that pruning drops, so its open
// records on the ledger can be closed.
export function createTourStore({ file, cap = 300, maxIdleMs = 30 * 86_400_000, now = () => Date.now(), onEvict = () => {} }) {
  if (!(Number.isInteger(cap) && cap > 0)) throw new Error(`the tour cap must be a whole number above zero, not "${cap}"`);
  const has = (id) => Object.hasOwn(tours, id);
  const stamp = () => new Date(now()).toISOString();

  function prune(all) {
    const kept = pruneTours(all, { cap, maxIdleMs, now: now() });
    for (const [id, tour] of Object.entries(all)) if (!Object.hasOwn(kept, id)) onEvict(id, tour);
    return kept;
  }

  let tours = prune(load(file));

  // Written to a temporary file first, so a crash mid-write leaves the old file whole.
  function save() {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(beside(file, 'tmp'), `${JSON.stringify(tours, null, 2)}\n`);
    renameSync(beside(file, 'tmp'), file);
  }

  return {
    get: (id) => (has(id) ? tours[id] : null),

    put(id, session) {
      const at = stamp();
      tours = prune(table([...Object.entries(tours), [id, { ...session, createdAt: has(id) ? tours[id].createdAt : at, touchedAt: at }]]));
      save();
      return has(id) ? tours[id] : null;
    },

    touch(id) {
      if (!has(id)) return;
      tours[id].touchedAt = stamp();
      save();
    },

    remove(id) {
      if (!has(id)) return;
      delete tours[id];
      save();
    },

    // Ids of the tours used within the last `withinMs`.
    recent: (withinMs) => Object.keys(tours).filter((id) => now() - lastUsed(tours[id]) <= withinMs),

    size: () => Object.keys(tours).length,

    // For the health check: the file on disk still parses.
    check() {
      if (existsSync(file)) JSON.parse(readFileSync(file, 'utf8'));
    },
  };
}
