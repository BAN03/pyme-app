import Storage from 'expo-sqlite/kv-store';
import { useSyncExternalStore } from 'react';

export type GoogleAccount = {
  id: string;
  name: string | null;
  email: string;
  photo: string | null;
};

export type BackupMeta = {
  fileId: string;
  name: string;
  size: number;
  createdAt: string;
  accountEmail: string;
};

type BackupState = {
  account: GoogleAccount | null;
  lastBackup: BackupMeta | null;
  autoBackup: boolean;
};

const ACCOUNT_KEY = 'pyme.google.account';
const LAST_BACKUP_KEY = 'pyme.backup.last';
const AUTO_BACKUP_KEY = 'pyme.backup.auto';

function readJson<T>(key: string): T | null {
  try {
    const raw = Storage.getItemSync(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    if (value == null) {
      Storage.removeItemSync(key);
    } else {
      Storage.setItemSync(key, JSON.stringify(value));
    }
  } catch (error) {
    console.warn(`No se pudo guardar ${key}`, error);
  }
}

function readState(): BackupState {
  let autoBackup = true;

  try {
    autoBackup = Storage.getItemSync(AUTO_BACKUP_KEY) !== '0';
  } catch {
    // Default to enabled when the key-value store is unavailable.
  }

  return {
    account: readJson<GoogleAccount>(ACCOUNT_KEY),
    lastBackup: readJson<BackupMeta>(LAST_BACKUP_KEY),
    autoBackup,
  };
}

let state: BackupState = readState();
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): BackupState {
  return state;
}

export function setAccount(account: GoogleAccount | null): void {
  const accountChanged = state.account?.id !== account?.id;

  state = {
    ...state,
    account,
    // Backups belong to an account, so do not show another account's metadata.
    lastBackup: accountChanged ? null : state.lastBackup,
  };

  writeJson(ACCOUNT_KEY, account);
  if (accountChanged) writeJson(LAST_BACKUP_KEY, state.lastBackup);
  emit();
}

export function setLastBackup(lastBackup: BackupMeta | null): void {
  state = { ...state, lastBackup };
  writeJson(LAST_BACKUP_KEY, lastBackup);
  emit();
}

export function setAutoBackup(autoBackup: boolean): void {
  state = { ...state, autoBackup };

  try {
    Storage.setItemSync(AUTO_BACKUP_KEY, autoBackup ? '1' : '0');
  } catch (error) {
    console.warn('No se pudo guardar la preferencia de respaldo', error);
  }

  emit();
}

export function useBackupStore(): BackupState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
