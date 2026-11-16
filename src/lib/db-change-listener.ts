/**
 * Database change listener for triggering auto-backups when data is modified.
 * Uses a simple event emitter pattern to notify the backup system of changes.
 */

type ChangeListener = () => void;

const listeners = new Set<ChangeListener>();

/**
 * Subscribe to database change events.
 * Returns an unsubscribe function.
 */
export function subscribeToDbChanges(listener: ChangeListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Notify all listeners that the database has changed.
 * Call this after any successful write operation (INSERT, UPDATE, DELETE).
 */
export function notifyDbChanged(): void {
  for (const listener of listeners) {
    try {
      listener();
    } catch (error) {
      console.warn('Error in db change listener:', error);
    }
  }
}

/**
 * Debounced version of notifyDbChanged to avoid excessive backup triggers.
 * Only triggers if the last notification was more than DEBOUNCE_MS ago.
 */
let debounceTimeout: ReturnType<typeof setTimeout> | null = null;
const DEBOUNCE_MS = 2000; // Wait 2 seconds after last change before triggering backup check

export function notifyDbChangedDebounced(): void {
  if (debounceTimeout) {
    clearTimeout(debounceTimeout);
  }
  debounceTimeout = setTimeout(() => {
    notifyDbChanged();
    debounceTimeout = null;
  }, DEBOUNCE_MS);
}