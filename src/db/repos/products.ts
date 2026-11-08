import type { SQLiteDatabase } from 'expo-sqlite';

import { mapProduct, type ProductRow } from '../mappers';
import type { Product, ProductInput } from '../types';
import { getDeviceId, newId, nowISO } from '../util';

const SELECT_PRODUCTS = `
  SELECT * FROM products
  WHERE business_id = ? AND deleted_at IS NULL
  ORDER BY active DESC, name COLLATE NOCASE ASC
`;

export async function listProducts(db: SQLiteDatabase, businessId: string): Promise<Product[]> {
  const rows = await db.getAllAsync<ProductRow>(SELECT_PRODUCTS, businessId);
  return rows.map(mapProduct);
}

export async function getProduct(db: SQLiteDatabase, id: string): Promise<Product | null> {
  const row = await db.getFirstAsync<ProductRow>(
    'SELECT * FROM products WHERE id = ? AND deleted_at IS NULL',
    id,
  );
  return row ? mapProduct(row) : null;
}

export async function createProduct(
  db: SQLiteDatabase,
  businessId: string,
  input: ProductInput,
): Promise<string> {
  const id = newId();
  const now = nowISO();
  const deviceId = await getDeviceId(db);
  await db.runAsync(
    `INSERT INTO products
      (id, business_id, name, category, sku, unit, price_cents, cost_cents, stock, min_stock,
       active, created_at, updated_at, device_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`,
    id,
    businessId,
    input.name.trim(),
    input.category?.trim() || null,
    input.sku?.trim() || null,
    input.unit.trim() || 'pza',
    input.priceCents,
    input.costCents,
    input.stock,
    input.minStock,
    now,
    now,
    deviceId,
  );
  return id;
}

export async function updateProduct(
  db: SQLiteDatabase,
  id: string,
  input: ProductInput,
): Promise<void> {
  await db.runAsync(
    `UPDATE products
     SET name = ?, category = ?, sku = ?, unit = ?, price_cents = ?, cost_cents = ?,
         stock = ?, min_stock = ?, updated_at = ?
     WHERE id = ?`,
    input.name.trim(),
    input.category?.trim() || null,
    input.sku?.trim() || null,
    input.unit.trim() || 'pza',
    input.priceCents,
    input.costCents,
    input.stock,
    input.minStock,
    nowISO(),
    id,
  );
}

export async function deleteProduct(db: SQLiteDatabase, id: string): Promise<void> {
  const now = nowISO();
  await db.runAsync(
    'UPDATE products SET deleted_at = ?, updated_at = ?, active = 0 WHERE id = ?',
    now,
    now,
    id,
  );
}

export async function lowStockProducts(db: SQLiteDatabase, businessId: string): Promise<Product[]> {
  const rows = await db.getAllAsync<ProductRow>(
    `SELECT * FROM products
     WHERE business_id = ? AND deleted_at IS NULL AND active = 1 AND stock <= min_stock
     ORDER BY (stock - min_stock) ASC`,
    businessId,
  );
  return rows.map(mapProduct);
}
