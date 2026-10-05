'use client';

import { useSyncExternalStore } from 'react';

import { applyTheme, currentTheme, type ThemeChoice } from '@/lib/theme';

const ORDER: ThemeChoice[] = ['system', 'light', 'dark'];
const LABEL: Record<ThemeChoice, string> = { system: 'Theme: match device', light: 'Theme: light', dark: 'Theme: dark' };

const listeners = new Set<() => void>();
const subscribe = (notify: () => void) => {
  listeners.add(notify);
  return () => listeners.delete(notify);
};

function Icon({ choice }: { choice: ThemeChoice }) {
  if (choice === 'light') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <circle cx="12" cy="12" r="4.2" />
        <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6" strokeLinecap="round" />
      </svg>
    );
  }
  if (choice === 'dark') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 3.5v17A8.5 8.5 0 0 0 12 3.5Z" fill="currentColor" />
    </svg>
  );
}

export function ThemeSwitch() {
  const choice = useSyncExternalStore(subscribe, currentTheme, () => 'system' as ThemeChoice);
  const next = ORDER[(ORDER.indexOf(choice) + 1) % ORDER.length] ?? 'system';
  return (
    <button
      type="button"
      className="btn btn-quiet btn-sm"
      aria-label={`${LABEL[choice]}. Switch to ${next}.`}
      title={LABEL[choice]}
      onClick={() => {
        applyTheme(next);
        listeners.forEach((notify) => notify());
      }}
    >
      <Icon choice={choice} />
    </button>
  );
}
