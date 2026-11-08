import type { SQLiteDatabase } from 'expo-sqlite';

import { mapCustomerWithStats, type CustomerStatsRow } from '../mappers';
import type { Customer, CustomerInput, CustomerWithStats } from '../types';
import { getDeviceId, newId, nowISO } from '../util';

export async function listCustomers(
  db: SQLiteDatabase,
  businessId: string,
  search = '',
): Promise<CustomerWithStats[]> {
  const term = search.trim();
  const rows = await db.getAllAsync<CustomerStatsRow>(
    `SELECT c.*,
            COUNT(s.id) AS purchases,
            COALESCE(SUM(s.total_cents), 0) AS total_spent_cents,
            MAX(s.date) AS last_purchase_date
     FROM customers c
     LEFT JOIN sales s ON s.customer_id = c.id AND s.deleted_at IS NULL
     WHERE c.business_id = ? AND c.deleted_at IS NULL
       ${term ? 'AND c.name LIKE ?' : ''}
     GROUP BY c.id
     ORDER BY c.name COLLATE NOCASE ASC`,
    ...(term ? [businessId, `%${term}%`] : [businessId]),
  );
  return rows.map(mapCustomerWithStats);
}

export async function getCustomer(db: SQLiteDatabase, id: string): Promise<Customer | null> {
  const row = await db.getFirstAsync<CustomerStatsRow>(
    `SELECT c.*, 0 AS purchases, 0 AS total_spent_cents, NULL AS last_purchase_date
     FROM customers c WHERE c.id = ? AND c.deleted_at IS NULL`,
    id,
  );
  if (!row) return null;
  return mapCustomerWithStats(row);
}

export async function createCustomer(
  db: SQLiteDatabase,
  businessId: string,
  input: CustomerInput,
): Promise<string> {
  const id = newId();
  const now = nowISO();
  const deviceId = await getDeviceId(db);
  await db.runAsync(
    `INSERT INTO customers
      (id, business_id, name, phone, email, notes, created_at, updated_at, device_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    businessId,
    input.name.trim(),
    input.phone?.trim() || null,
    input.email?.trim() || null,
    input.notes?.trim() || null,
    now,
    now,
    deviceId,
  );
  return id;
}

export async function updateCustomer(
  db: SQLiteDatabase,
  id: string,
  input: CustomerInput,
): Promise<void> {
  await db.runAsync(
    `UPDATE customers SET name = ?, phone = ?, email = ?, notes = ?, updated_at = ?
     WHERE id = ?`,
    input.name.trim(),
    input.phone?.trim() || null,
    input.email?.trim() || null,
    input.notes?.trim() || null,
    nowISO(),
    id,
  );
}

export async function deleteCustomer(db: SQLiteDatabase, id: string): Promise<void> {
  const now = nowISO();
  await db.runAsync(
    'UPDATE customers SET deleted_at = ?, updated_at = ? WHERE id = ?',
    now,
    now,
    id,
  );
}
