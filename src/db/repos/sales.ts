import type { SQLiteDatabase } from 'expo-sqlite';

import { mapSale, type ProductRow, type SaleRow } from '../mappers';
import type { NewSaleInput, Sale } from '../types';
import { getDeviceId, newId, nowISO } from '../util';

const SALE_SELECT = `
  SELECT s.*,
         c.name AS customer_name,
         (SELECT COUNT(*) FROM sale_items si WHERE si.sale_id = s.id) AS item_count,
         (SELECT GROUP_CONCAT(si.product_name, ', ') FROM sale_items si WHERE si.sale_id = s.id)
           AS items_summary
  FROM sales s
  LEFT JOIN customers c ON c.id = s.customer_id
`;

export async function listSales(
  db: SQLiteDatabase,
  businessId: string,
  from: string,
  to: string,
): Promise<Sale[]> {
  const rows = await db.getAllAsync<SaleRow>(
    `${SALE_SELECT}
     WHERE s.business_id = ? AND s.deleted_at IS NULL AND s.date >= ? AND s.date <= ?
     ORDER BY s.date DESC, s.created_at DESC`,
    businessId,
    from,
    to,
  );
  return rows.map(mapSale);
}

export async function createSale(
  db: SQLiteDatabase,
  businessId: string,
  input: NewSaleInput,
): Promise<string> {
  const id = newId();
  const now = nowISO();
  const deviceId = await getDeviceId(db);
  const items = input.items.filter((item) => item.quantity > 0);

  await db.withTransactionAsync(async () => {
    const resolved: {
      productId: string;
      productName: string;
      quantity: number;
      unitPriceCents: number;
      unitCostCents: number;
    }[] = [];

    let totalCents = 0;

    for (const item of items) {
      const product = await db.getFirstAsync<ProductRow>(
        'SELECT * FROM products WHERE id = ? AND deleted_at IS NULL',
        item.productId,
      );
      if (!product) throw new Error('Uno de los productos ya no existe');

      resolved.push({
        productId: product.id,
        productName: product.name,
        quantity: item.quantity,
        unitPriceCents: item.unitPriceCents,
        unitCostCents: product.cost_cents,
      });
      totalCents += Math.round(item.quantity * item.unitPriceCents);
    }

    if (resolved.length === 0) {
      totalCents = input.totalCents ?? 0;
      if (totalCents <= 0) throw new Error('Agrega productos o escribe un monto mayor que cero');
    }

    await db.runAsync(
      `INSERT INTO sales
        (id, business_id, customer_id, date, total_cents, payment_method, note,
         created_at, updated_at, device_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      businessId,
      input.customerId,
      input.date,
      totalCents,
      input.paymentMethod,
      input.note?.trim() || null,
      now,
      now,
      deviceId,
    );

    for (const item of resolved) {
      await db.runAsync(
        `INSERT INTO sale_items
          (id, business_id, sale_id, product_id, product_name, quantity,
           unit_price_cents, unit_cost_cents, created_at, device_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        newId(),
        businessId,
        id,
        item.productId,
        item.productName,
        item.quantity,
        item.unitPriceCents,
        item.unitCostCents,
        now,
        deviceId,
      );

      await db.runAsync(
        'UPDATE products SET stock = stock - ?, updated_at = ? WHERE id = ?',
        item.quantity,
        now,
        item.productId,
      );
    }
  });

  return id;
}

export async function deleteSale(db: SQLiteDatabase, id: string): Promise<void> {
  const now = nowISO();

  await db.withTransactionAsync(async () => {
    const items = await db.getAllAsync<{ product_id: string | null; quantity: number }>(
      'SELECT product_id, quantity FROM sale_items WHERE sale_id = ?',
      id,
    );

    for (const item of items) {
      if (!item.product_id) continue;
      await db.runAsync(
        'UPDATE products SET stock = stock + ?, updated_at = ? WHERE id = ?',
        item.quantity,
        now,
        item.product_id,
      );
    }

    await db.runAsync(
      'UPDATE sales SET deleted_at = ?, updated_at = ? WHERE id = ?',
      now,
      now,
      id,
    );
  });
}
