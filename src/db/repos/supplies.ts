import type { SQLiteDatabase } from 'expo-sqlite';

import { mapSupply, type SupplyRow } from '../mappers';
import type { Supply, SupplyInput } from '../types';
import { getDeviceId, newId, nowISO } from '../util';

export async function listSupplies(db: SQLiteDatabase, businessId: string): Promise<Supply[]> {
  const rows = await db.getAllAsync<SupplyRow>(
    `SELECT * FROM supplies
     WHERE business_id = ? AND deleted_at IS NULL
     ORDER BY name COLLATE NOCASE ASC`,
    businessId,
  );
  return rows.map(mapSupply);
}

export async function getSupply(db: SQLiteDatabase, id: string): Promise<Supply | null> {
  const row = await db.getFirstAsync<SupplyRow>(
    'SELECT * FROM supplies WHERE id = ? AND deleted_at IS NULL',
    id,
  );
  return row ? mapSupply(row) : null;
}

export async function createSupply(
  db: SQLiteDatabase,
  businessId: string,
  input: SupplyInput,
): Promise<string> {
  const id = newId();
  const now = nowISO();
  const deviceId = await getDeviceId(db);
  await db.runAsync(
    `INSERT INTO supplies
      (id, business_id, name, unit, stock, min_stock, unit_cost_cents, created_at, updated_at, device_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    businessId,
    input.name.trim(),
    input.unit.trim() || 'pza',
    input.stock,
    input.minStock,
    input.unitCostCents,
    now,
    now,
    deviceId,
  );
  return id;
}

export async function updateSupply(
  db: SQLiteDatabase,
  id: string,
  input: SupplyInput,
): Promise<void> {
  await db.runAsync(
    `UPDATE supplies
     SET name = ?, unit = ?, stock = ?, min_stock = ?, unit_cost_cents = ?, updated_at = ?
     WHERE id = ?`,
    input.name.trim(),
    input.unit.trim() || 'pza',
    input.stock,
    input.minStock,
    input.unitCostCents,
    nowISO(),
    id,
  );
}

export async function deleteSupply(db: SQLiteDatabase, id: string): Promise<void> {
  const now = nowISO();
  await db.runAsync(
    'UPDATE supplies SET deleted_at = ?, updated_at = ? WHERE id = ?',
    now,
    now,
    id,
  );
}

export type SupplyPurchaseInput = {
  supplyId: string;
  quantity: number;
  totalCostCents: number;
  date: string;
  note: string | null;
  recordExpense: boolean;
};

/**
 * Registers a purchase: increases stock, keeps the last unit cost and optionally
 * creates an expense in the "Insumos" category so the money is reflected in metrics.
 */
export async function registerSupplyPurchase(
  db: SQLiteDatabase,
  businessId: string,
  input: SupplyPurchaseInput,
): Promise<void> {
  if (input.quantity <= 0) throw new Error('La cantidad debe ser mayor que cero');

  const deviceId = await getDeviceId(db);
  const now = nowISO();

  await db.withTransactionAsync(async () => {
    const supply = await db.getFirstAsync<SupplyRow>(
      'SELECT * FROM supplies WHERE id = ? AND deleted_at IS NULL',
      input.supplyId,
    );
    if (!supply) throw new Error('Insumo no encontrado');

    const newStock = supply.stock + input.quantity;
    const newUnitCost =
      input.quantity > 0 ? Math.round(input.totalCostCents / input.quantity) : supply.unit_cost_cents;

    await db.runAsync(
      'UPDATE supplies SET stock = ?, unit_cost_cents = ?, updated_at = ? WHERE id = ?',
      newStock,
      newUnitCost,
      now,
      input.supplyId,
    );

    await db.runAsync(
      `INSERT INTO supply_movements
        (id, business_id, supply_id, kind, quantity, total_cost_cents, note, date, created_at, device_id)
       VALUES (?, ?, ?, 'purchase', ?, ?, ?, ?, ?, ?)`,
      newId(),
      businessId,
      input.supplyId,
      input.quantity,
      input.totalCostCents,
      input.note?.trim() || null,
      input.date,
      now,
      deviceId,
    );

    if (input.recordExpense && input.totalCostCents > 0) {
      await db.runAsync(
        `INSERT INTO expenses
          (id, business_id, category, description, amount_cents, date, note, created_at, updated_at, device_id)
         VALUES (?, ?, 'Insumos', ?, ?, ?, ?, ?, ?, ?)`,
        newId(),
        businessId,
        `Compra de ${supply.name}`,
        input.totalCostCents,
        input.date,
        input.note?.trim() || null,
        now,
        now,
        deviceId,
      );
    }
  });
}
