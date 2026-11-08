import { backupDatabaseAsync, deserializeDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import { DATABASE_VERSION, initDatabase } from './schema';

const SQLITE_HEADER = 'SQLite format 3\u0000';
const REQUIRED_TABLES = ['business', 'products', 'customers', 'sales', 'expenses'];

function assertHeader(bytes: Uint8Array): void {
  if (bytes.byteLength < SQLITE_HEADER.length) {
    throw new Error('El respaldo está vacío o dañado.');
  }

  const header = String.fromCharCode(...bytes.subarray(0, SQLITE_HEADER.length));
  if (header !== SQLITE_HEADER) {
    throw new Error('El archivo no es una base de datos SQLite válida.');
  }
}

async function assertHealthy(database: SQLiteDatabase): Promise<void> {
  const integrity = await database.getFirstAsync<{ integrity_check: string }>(
    'PRAGMA integrity_check',
  );

  if (!integrity || integrity.integrity_check !== 'ok') {
    throw new Error('El respaldo está dañado y no se puede restaurar.');
  }

  const versionRow = await database.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const version = versionRow?.user_version ?? 0;

  if (version > DATABASE_VERSION) {
    throw new Error(
      'Este respaldo viene de una versión más nueva de Pyme App. Actualiza la app para restaurarlo.',
    );
  }

  const placeholders = REQUIRED_TABLES.map(() => '?').join(', ');
  const tables = await database.getAllAsync<{ name: string }>(
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name IN (${placeholders})`,
    ...REQUIRED_TABLES,
  );

  if (tables.length < REQUIRED_TABLES.length) {
    throw new Error('El archivo no parece ser un respaldo de Pyme App.');
  }
}

/**
 * Flushes the write-ahead log and serializes the whole database into bytes.
 * The checkpoint guarantees that the snapshot includes every committed change.
 */
export async function createBackupSnapshot(database: SQLiteDatabase): Promise<Uint8Array> {
  await database.execAsync('PRAGMA wal_checkpoint(TRUNCATE);');
  return database.serializeAsync();
}

/**
 * Replaces the live database with the downloaded snapshot. The snapshot is
 * opened in memory first so a corrupt file never touches the real database.
 */
export async function restoreBackupSnapshot(
  database: SQLiteDatabase,
  bytes: Uint8Array,
): Promise<void> {
  assertHeader(bytes);

  const snapshot = await deserializeDatabaseAsync(bytes);

  try {
    await assertHealthy(snapshot);
    await backupDatabaseAsync({ sourceDatabase: snapshot, destDatabase: database });
  } finally {
    await snapshot.closeAsync();
  }

  // Re-apply connection PRAGMAs and run any migration the snapshot may need.
  await initDatabase(database);
}
