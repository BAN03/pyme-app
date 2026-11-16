/**
 * Small, synchronous preferences that survive app restarts. Values are read
 * from the SQLite key/value store so the welcome flow can decide its route
 * before the first paint (no flash of the wrong screen).
 */

import Storage from 'expo-sqlite/kv-store';
import { useSyncExternalStore } from 'react';

const WELCOME_SEEN_KEY = 'pyme.welcome.seen';

let welcomeSeenCache: boolean | null = null;
const listeners = new Set<() => void>();

function readWelcomeSeen(): boolean {
  if (welcomeSeenCache !== null) return welcomeSeenCache;
  try {
    welcomeSeenCache = Storage.getItemSync(WELCOME_SEEN_KEY) === '1';
  } catch {
    welcomeSeenCache = false;
  }
  return welcomeSeenCache;
}

export function hasSeenWelcome(): boolean {
  return readWelcomeSeen();
}

export function markWelcomeSeen(): void {
  if (welcomeSeenCache === true) return;
  welcomeSeenCache = true;
  try {
    Storage.setItemSync(WELCOME_SEEN_KEY, '1');
  } catch {
    // Preferences are best-effort; the app still works without them.
  }
  listeners.forEach((listener) => listener());
}

/** Reactive version of {@link hasSeenWelcome} for use inside components. */
export function useWelcomeSeen(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },
    readWelcomeSeen,
    readWelcomeSeen,
  );
}
