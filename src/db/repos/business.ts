import type { SQLiteDatabase } from 'expo-sqlite';

import { mapBusiness, type BusinessRow } from '../mappers';
import { DEFAULT_BUSINESS_ID } from '../schema';
import type { Business, BusinessInput } from '../types';
import { nowISO } from '../util';

export async function getBusiness(db: SQLiteDatabase): Promise<Business> {
  const row = await db.getFirstAsync<BusinessRow>(
    'SELECT * FROM business ORDER BY created_at ASC LIMIT 1',
  );
  if (row) return mapBusiness(row);

  const now = nowISO();
  await db.runAsync(
    `INSERT INTO business (id, name, currency, created_at, updated_at)
     VALUES (?, 'Mi negocio', 'MXN', ?, ?)`,
    DEFAULT_BUSINESS_ID,
    now,
    now,
  );

  const created = await db.getFirstAsync<BusinessRow>(
    'SELECT * FROM business WHERE id = ?',
    DEFAULT_BUSINESS_ID,
  );
  if (!created) throw new Error('No se pudo crear el negocio');
  return mapBusiness(created);
}

export async function updateBusiness(
  db: SQLiteDatabase,
  id: string,
  input: BusinessInput,
): Promise<void> {
  await db.runAsync(
    `UPDATE business
     SET name = ?, currency = ?, owner_name = ?, owner_email = ?, updated_at = ?
     WHERE id = ?`,
    input.name.trim(),
    input.currency,
    input.ownerName?.trim() || null,
    input.ownerEmail?.trim() || null,
    nowISO(),
    id,
  );
}
