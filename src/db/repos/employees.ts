import type { SQLiteDatabase } from 'expo-sqlite';

import { mapEmployee, type EmployeeRow } from '../mappers';
import type { Employee, EmployeeInput } from '../types';
import { getDeviceId, newId, nowISO } from '../util';

export async function listEmployees(
  db: SQLiteDatabase,
  businessId: string,
): Promise<Employee[]> {
  const rows = await db.getAllAsync<EmployeeRow>(
    `SELECT * FROM employees
     WHERE business_id = ? AND deleted_at IS NULL
     ORDER BY role ASC, name COLLATE NOCASE ASC`,
    businessId,
  );
  return rows.map(mapEmployee);
}

export async function createEmployee(
  db: SQLiteDatabase,
  businessId: string,
  input: EmployeeInput,
): Promise<string> {
  const id = newId();
  const now = nowISO();
  const deviceId = await getDeviceId(db);
  await db.runAsync(
    `INSERT INTO employees
      (id, business_id, name, email, role, status, created_at, updated_at, device_id)
     VALUES (?, ?, ?, ?, ?, 'invitado', ?, ?, ?)`,
    id,
    businessId,
    input.name.trim(),
    input.email?.trim() || null,
    input.role,
    now,
    now,
    deviceId,
  );
  return id;
}

export async function updateEmployee(
  db: SQLiteDatabase,
  id: string,
  input: EmployeeInput,
): Promise<void> {
  await db.runAsync(
    'UPDATE employees SET name = ?, email = ?, role = ?, updated_at = ? WHERE id = ?',
    input.name.trim(),
    input.email?.trim() || null,
    input.role,
    nowISO(),
    id,
  );
}

export async function deleteEmployee(db: SQLiteDatabase, id: string): Promise<void> {
  const now = nowISO();
  await db.runAsync(
    'UPDATE employees SET deleted_at = ?, updated_at = ? WHERE id = ?',
    now,
    now,
    id,
  );
}
