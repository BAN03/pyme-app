import { useSQLiteContext } from 'expo-sqlite';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';

import { createBackupSnapshot, restoreBackupSnapshot } from '@/db/backup';
import {
  DriveError,
  downloadBackup,
  listBackups as listDriveBackups,
  pruneBackups,
  uploadBackup,
  type DriveBackupFile,
} from '@/lib/drive';
import {
  isGoogleAuthConfigured,
  refreshAccessToken,
  restoreGoogleSession,
  signInWithGoogle,
  signOutGoogle,
  type GoogleAccount,
} from '@/lib/google-auth';
import {
  setAccount as saveAccount,
  setAutoBackup as saveAutoBackup,
  setLastBackup as saveLastBackup,
  useBackupStore,
  type BackupMeta,
} from '@/lib/backup-store';

const AUTO_BACKUP_INTERVAL_MS = 12 * 60 * 60 * 1000;
const MAX_BACKUPS = 5;

export type BackupBusyState = 'connect' | 'disconnect' | 'backup' | 'restore' | null;

type BackupContextValue = {
  configured: boolean;
  account: GoogleAccount | null;
  lastBackup: BackupMeta | null;
  autoBackup: boolean;
  busy: BackupBusyState;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  backupNow: () => Promise<BackupMeta | null>;
  listBackups: () => Promise<DriveBackupFile[]>;
  restore: (file: DriveBackupFile) => Promise<void>;
  setAutoBackup: (value: boolean) => void;
};

const BackupContext = createContext<BackupContextValue | null>(null);

async function withDriveToken<T>(
  getToken: () => Promise<string>,
  refreshToken: (staleToken: string) => Promise<string>,
  operation: (token: string) => Promise<T>,
): Promise<T> {
  const token = await getToken();

  try {
    return await operation(token);
  } catch (error) {
    if (error instanceof DriveError && error.status === 401) {
      const freshToken = await refreshToken(token);
      return operation(freshToken);
    }
    throw error;
  }
}

function backupFileName(date = new Date()): string {
  return `pyme-${date.toISOString().replace(/[:.]/g, '-')}.db`;
}

function isBackupDue(lastBackup: BackupMeta | null): boolean {
  if (!lastBackup) return true;

  const timestamp = new Date(lastBackup.createdAt).getTime();
  if (Number.isNaN(timestamp)) return true;

  return Date.now() - timestamp >= AUTO_BACKUP_INTERVAL_MS;
}

export function BackupProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const { account, lastBackup, autoBackup } = useBackupStore();

  const [busy, setBusy] = useState<BackupBusyState>(null);
  const busyRef = useRef<BackupBusyState>(null);
  const tokenRef = useRef<{ token: string; accountId: string } | null>(null);

  const begin = useCallback((kind: Exclude<BackupBusyState, null>) => {
    if (busyRef.current) return false;
    busyRef.current = kind;
    setBusy(kind);
    return true;
  }, []);

  const end = useCallback(() => {
    busyRef.current = null;
    setBusy(null);
  }, []);

  const ensureAccessToken = useCallback(async () => {
    if (tokenRef.current && tokenRef.current.accountId === account?.id) {
      return tokenRef.current.token;
    }

    const session = await restoreGoogleSession();
    if (!session) {
      saveAccount(null);
      throw new Error('Tu sesión de Google expiró. Vuelve a conectar tu cuenta.');
    }

    tokenRef.current = { token: session.accessToken, accountId: session.account.id };
    saveAccount(session.account);
    return session.accessToken;
  }, [account?.id]);

  const refreshToken = useCallback(
    async (staleToken: string) => {
      const freshToken = await refreshAccessToken(staleToken);
      if (account?.id) {
        tokenRef.current = { token: freshToken, accountId: account.id };
      }
      return freshToken;
    },
    [account?.id],
  );

  const connect = useCallback(async () => {
    if (!begin('connect')) return;

    try {
      const session = await signInWithGoogle();
      tokenRef.current = { token: session.accessToken, accountId: session.account.id };
      saveAccount(session.account);
    } finally {
      end();
    }
  }, [begin, end]);

  const disconnect = useCallback(async () => {
    if (!begin('disconnect')) return;

    try {
      await signOutGoogle();
      tokenRef.current = null;
      saveAccount(null);
    } finally {
      end();
    }
  }, [begin, end]);

  const backupNow = useCallback(async () => {
    if (!begin('backup')) return null;

    try {
      const bytes = await createBackupSnapshot(db);
      const file = await withDriveToken(ensureAccessToken, refreshToken, (token) =>
        uploadBackup(token, bytes, backupFileName()),
      );

      const meta: BackupMeta = {
        fileId: file.id,
        name: file.name,
        size: bytes.byteLength,
        createdAt: new Date().toISOString(),
        accountEmail: account?.email ?? '',
      };

      saveLastBackup(meta);

      try {
        await withDriveToken(ensureAccessToken, refreshToken, (token) =>
          pruneBackups(token, MAX_BACKUPS),
        );
      } catch {
        // The backup itself succeeded; old-file cleanup is optional.
      }

      return meta;
    } finally {
      end();
    }
  }, [begin, end, db, ensureAccessToken, refreshToken, account?.email]);

  const listBackups = useCallback(
    () => withDriveToken(ensureAccessToken, refreshToken, listDriveBackups),
    [ensureAccessToken, refreshToken],
  );

  const restore = useCallback(
    async (file: DriveBackupFile) => {
      if (!begin('restore')) return;

      try {
        const bytes = await withDriveToken(ensureAccessToken, refreshToken, (token) =>
          downloadBackup(token, file.id),
        );

        await restoreBackupSnapshot(db, bytes);

        saveLastBackup({
          fileId: file.id,
          name: file.name,
          size: file.size || bytes.byteLength,
          createdAt: file.createdAt,
          accountEmail: account?.email ?? '',
        });
      } finally {
        end();
      }
    },
    [begin, end, db, ensureAccessToken, refreshToken, account?.email],
  );

  const maybeAutoBackup = useCallback(() => {
    if (!autoBackup || !account || busyRef.current) return;
    if (!isBackupDue(lastBackup)) return;

    void backupNow().catch((error: unknown) => {
      console.warn(
        'No se pudo respaldar automáticamente',
        error instanceof Error ? error.message : error,
      );
    });
  }, [autoBackup, account, lastBackup, backupNow]);

  useEffect(() => {
    const timeout = setTimeout(maybeAutoBackup, 1500);

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') maybeAutoBackup();
    });

    return () => {
      clearTimeout(timeout);
      subscription.remove();
    };
  }, [maybeAutoBackup]);

  const value = useMemo<BackupContextValue>(
    () => ({
      configured: isGoogleAuthConfigured(),
      account,
      lastBackup,
      autoBackup,
      busy,
      connect,
      disconnect,
      backupNow,
      listBackups,
      restore,
      setAutoBackup: saveAutoBackup,
    }),
    [
      account,
      lastBackup,
      autoBackup,
      busy,
      connect,
      disconnect,
      backupNow,
      listBackups,
      restore,
    ],
  );

  return <BackupContext.Provider value={value}>{children}</BackupContext.Provider>;
}

export function useBackup(): BackupContextValue {
  const value = useContext(BackupContext);
  if (!value) throw new Error('useBackup debe usarse dentro de BackupProvider');
  return value;
}
