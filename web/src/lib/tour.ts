// The demo fund this browser works in. Each browser gets its own (a "tour"), so
// visitors never share a fund. The id is random and kept on this device, the
// way the seat is, and every API request names it.
const TOUR_KEY = 'draw-tour';
export const TOUR_HEADER = 'x-draw-tour';

let memoryTour: string | null = null;

function readTour(): string | null {
  try {
    return window.localStorage.getItem(TOUR_KEY);
  } catch {
    return null;
  }
}

function writeTour(id: string): void {
  try {
    window.localStorage.setItem(TOUR_KEY, id);
  } catch {
    // Storage is blocked. The tour then lasts for this page only.
  }
  memoryTour = id;
}

// This browser's tour id, created on first use.
export function tourId(): string {
  const current = readTour() ?? memoryTour;
  if (current) return current;
  const id = crypto.randomUUID();
  writeTour(id);
  return id;
}

// Starting over moves this browser to a new tour. The old fund stays on the ledger.
export function startNewTour(): void {
  writeTour(crypto.randomUUID());
}

export const tourHeaders = (): Record<string, string> => ({ [TOUR_HEADER]: tourId() });
