import * as Crypto from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';

let cachedDeviceId: string | null = null;

export function nowISO(): string {
  return new Date().toISOString();
}

export function newId(): string {
  return Crypto.randomUUID();
}

/** Stable id for this installation. Used to trace which device wrote a row. */
export async function getDeviceId(db: SQLiteDatabase): Promise<string> {
  if (cachedDeviceId) return cachedDeviceId;

  const row = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM app_meta WHERE key = 'device_id'`,
  );
  if (row?.value) {
    cachedDeviceId = row.value;
    return cachedDeviceId;
  }

  const id = newId();
  await db.runAsync(`INSERT OR REPLACE INTO app_meta (key, value) VALUES ('device_id', ?)`, id);
  cachedDeviceId = id;
  return id;
}
