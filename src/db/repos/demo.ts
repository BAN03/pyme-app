import type { SQLiteDatabase } from 'expo-sqlite';

import { currentMonthKey, lastMonths, monthRange, todayISO } from '@/lib/date';

import { nowISO } from '../util';
import { createCustomer } from './customers';
import { createExpense } from './expenses';
import { createProduct } from './products';
import { createSale } from './sales';
import { createSupply } from './supplies';

/** Small deterministic PRNG so the demo dataset looks the same every time. */
function mulberry32(seed: number) {
  let value = seed;
  return () => {
    value |= 0;
    value = (value + 0x6d2b79f5) | 0;
    let t = Math.imul(value ^ (value >>> 15), 1 | value);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PRODUCTS = [
  { name: 'Café americano', category: 'Bebidas', price: 3500, cost: 1200, stock: 40, min: 10 },
  { name: 'Capuchino', category: 'Bebidas', price: 4500, cost: 1600, stock: 28, min: 10 },
  { name: 'Pan de chocolate', category: 'Panadería', price: 2800, cost: 1100, stock: 22, min: 8 },
  { name: 'Croissant', category: 'Panadería', price: 3200, cost: 1300, stock: 60, min: 12 },
  { name: 'Sándwich', category: 'Comida', price: 5500, cost: 2600, stock: 14, min: 6 },
  { name: 'Agua embotellada', category: 'Bebidas', price: 1500, cost: 600, stock: 80, min: 20 },
  { name: 'Jugo natural', category: 'Bebidas', price: 3000, cost: 1200, stock: 6, min: 10 },
  { name: 'Galleta de avena', category: 'Panadería', price: 1800, cost: 700, stock: 30, min: 8 },
];

const SUPPLIES = [
  { name: 'Café en grano', unit: 'kg', stock: 4, min: 2, cost: 38000 },
  { name: 'Leche entera', unit: 'L', stock: 12, min: 6, cost: 2600 },
  { name: 'Azúcar', unit: 'kg', stock: 5, min: 2, cost: 3200 },
  { name: 'Vasos 12 oz', unit: 'pza', stock: 150, min: 200, cost: 120 },
  { name: 'Bolsas de papel', unit: 'pza', stock: 300, min: 100, cost: 80 },
  { name: 'Chocolate en polvo', unit: 'kg', stock: 1.5, min: 1, cost: 21000 },
];

const CUSTOMERS = [
  { name: 'Mariana López', phone: '555 120 4432', notes: 'Prefiere leche de almendra.' },
  { name: 'Diego Hernández', phone: '555 890 1120', notes: 'Cliente frecuente de la mañana.' },
  { name: 'Sofía Ramírez', phone: '555 334 7781', notes: 'Pide factura cada mes.' },
  { name: 'Emiliano Torres', phone: '555 672 2094', notes: null },
  { name: 'Valeria Cruz', phone: '555 441 9087', notes: 'Le gusta el pan recién horneado.' },
  { name: 'Iván Morales', phone: '555 220 5566', notes: null },
  { name: 'Regina Flores', phone: '555 903 3312', notes: 'Compra para su oficina.' },
  { name: 'Alejandro Ruiz', phone: '555 118 7745', notes: null },
];

const VARIABLE_EXPENSES = [
  { category: 'Marketing', description: 'Publicidad en redes' },
  { category: 'Transporte', description: 'Reparto a domicilio' },
  { category: 'Insumos', description: 'Compra de insumos' },
  { category: 'Equipo', description: 'Mantenimiento de equipo' },
];
const PAYMENT_METHODS = ['efectivo', 'transferencia', 'tarjeta'];

export async function seedDemoData(db: SQLiteDatabase, businessId: string): Promise<void> {
  const existing = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM products WHERE business_id = ? AND deleted_at IS NULL',
    businessId,
  );
  if ((existing?.count ?? 0) > 0) {
    throw new Error('Ya tienes productos registrados. Vacía los datos antes de cargar la demo.');
  }

  const random = mulberry32(42);
  const pick = <T>(list: T[]): T => list[Math.floor(random() * list.length)];

  const productIds: string[] = [];
  for (const product of PRODUCTS) {
    const id = await createProduct(db, businessId, {
      name: product.name,
      category: product.category,
      sku: null,
      unit: 'pza',
      priceCents: product.price,
      costCents: product.cost,
      stock: product.stock,
      minStock: product.min,
    });
    productIds.push(id);
  }

  for (const supply of SUPPLIES) {
    await createSupply(db, businessId, {
      name: supply.name,
      unit: supply.unit,
      stock: supply.stock,
      minStock: supply.min,
      unitCostCents: supply.cost,
    });
  }

  const customerIds: string[] = [];
  for (const customer of CUSTOMERS) {
    const id = await createCustomer(db, businessId, {
      name: customer.name,
      phone: customer.phone,
      email: null,
      notes: customer.notes,
    });
    customerIds.push(id);
  }

  const today = todayISO();
  const currentMonth = currentMonthKey();
  const months = lastMonths(currentMonth, 6);

  for (const month of months) {
    const range = monthRange(month);
    const lastDay = Number(range.to.slice(-2));
    // Past months use the full month; the current month stops at today so the
    // demo never creates sales or expenses in the future.
    const maxDay = month === currentMonth ? Number(today.slice(-2)) : Math.min(lastDay, 28);
    const salesInMonth = 18 + Math.floor(random() * 11);

    for (let index = 0; index < salesInMonth; index += 1) {
      const day = 1 + Math.floor(random() * maxDay);
      const date = `${month}-${String(day).padStart(2, '0')}`;
      const itemCount = 1 + Math.floor(random() * 3);
      const chosen = new Set<string>();
      const items = [];

      for (let itemIndex = 0; itemIndex < itemCount; itemIndex += 1) {
        const productIndex = Math.floor(random() * PRODUCTS.length);
        if (chosen.has(productIds[productIndex])) continue;
        chosen.add(productIds[productIndex]);
        items.push({
          productId: productIds[productIndex],
          quantity: 1 + Math.floor(random() * 3),
          unitPriceCents: PRODUCTS[productIndex].price,
        });
      }

      await createSale(db, businessId, {
        date,
        customerId: random() < 0.65 ? pick(customerIds) : null,
        paymentMethod: pick(PAYMENT_METHODS),
        note: null,
        items,
      });
    }

    // Fixed monthly costs plus a couple of variable ones. Keeping rent at a
    // realistic level for a small business makes the demo profitable and the
    // income/expense chart readable.
    const expenses = [
      { category: 'Renta', description: 'Renta del local', amountCents: 120000 },
      {
        category: 'Servicios',
        description: 'Luz e internet',
        amountCents: 28000 + Math.floor(random() * 12000),
      },
    ];
    const variableCount = 2 + Math.floor(random() * 2);
    for (let index = 0; index < variableCount; index += 1) {
      const variable = pick(VARIABLE_EXPENSES);
      expenses.push({
        category: variable.category,
        description: variable.description,
        amountCents: 9000 + Math.floor(random() * 16000),
      });
    }

    for (const expense of expenses) {
      const day = 1 + Math.floor(random() * maxDay);
      await createExpense(db, businessId, {
        category: expense.category,
        description: expense.description,
        amountCents: expense.amountCents,
        date: `${month}-${String(day).padStart(2, '0')}`,
        note: null,
      });
    }
  }

  // Recording sales decrements stock, which would leave the demo catalog empty
  // or negative. Restore the starting inventory so the sample data stays
  // believable (and a couple of items intentionally sit below their minimum).
  const now = nowISO();
  for (let index = 0; index < productIds.length; index += 1) {
    await db.runAsync(
      'UPDATE products SET stock = ?, updated_at = ? WHERE id = ?',
      PRODUCTS[index].stock,
      now,
      productIds[index],
    );
  }
}
