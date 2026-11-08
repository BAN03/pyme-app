import type { SQLiteDatabase } from 'expo-sqlite';

import { mapExpense, type ExpenseRow } from '../mappers';
import type { Expense, ExpenseInput } from '../types';
import { getDeviceId, newId, nowISO } from '../util';

export async function listExpenses(
  db: SQLiteDatabase,
  businessId: string,
  from: string,
  to: string,
): Promise<Expense[]> {
  const rows = await db.getAllAsync<ExpenseRow>(
    `SELECT * FROM expenses
     WHERE business_id = ? AND deleted_at IS NULL AND date >= ? AND date <= ?
     ORDER BY date DESC, created_at DESC`,
    businessId,
    from,
    to,
  );
  return rows.map(mapExpense);
}

export async function getExpense(db: SQLiteDatabase, id: string): Promise<Expense | null> {
  const row = await db.getFirstAsync<ExpenseRow>(
    'SELECT * FROM expenses WHERE id = ? AND deleted_at IS NULL',
    id,
  );
  return row ? mapExpense(row) : null;
}

export async function createExpense(
  db: SQLiteDatabase,
  businessId: string,
  input: ExpenseInput,
): Promise<string> {
  const id = newId();
  const now = nowISO();
  const deviceId = await getDeviceId(db);
  await db.runAsync(
    `INSERT INTO expenses
      (id, business_id, category, description, amount_cents, date, note,
       created_at, updated_at, device_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    businessId,
    input.category.trim(),
    input.description.trim(),
    input.amountCents,
    input.date,
    input.note?.trim() || null,
    now,
    now,
    deviceId,
  );
  return id;
}

export async function updateExpense(
  db: SQLiteDatabase,
  id: string,
  input: ExpenseInput,
): Promise<void> {
  await db.runAsync(
    `UPDATE expenses
     SET category = ?, description = ?, amount_cents = ?, date = ?, note = ?, updated_at = ?
     WHERE id = ?`,
    input.category.trim(),
    input.description.trim(),
    input.amountCents,
    input.date,
    input.note?.trim() || null,
    nowISO(),
    id,
  );
}

export async function deleteExpense(db: SQLiteDatabase, id: string): Promise<void> {
  const now = nowISO();
  await db.runAsync(
    'UPDATE expenses SET deleted_at = ?, updated_at = ? WHERE id = ?',
    now,
    now,
    id,
  );
}
