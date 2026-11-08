import type { SQLiteDatabase } from 'expo-sqlite';

import { lastMonths, monthLabelShort, monthRange } from '@/lib/date';

import type { HomeData, MonthlyPoint, StockAlert, TopProduct } from '../types';

type SumRow = { total: number | null; count: number };

export async function getHomeData(
  db: SQLiteDatabase,
  businessId: string,
  monthKey: string,
): Promise<HomeData> {
  const range = monthRange(monthKey);
  const months = lastMonths(monthKey, 6);
  const seriesStart = `${months[0]}-01`;

  const income = await db.getFirstAsync<SumRow>(
    `SELECT COALESCE(SUM(total_cents), 0) AS total, COUNT(*) AS count
     FROM sales
     WHERE business_id = ? AND deleted_at IS NULL AND date >= ? AND date <= ?`,
    businessId,
    range.from,
    range.to,
  );

  const expenses = await db.getFirstAsync<SumRow>(
    `SELECT COALESCE(SUM(amount_cents), 0) AS total, COUNT(*) AS count
     FROM expenses
     WHERE business_id = ? AND deleted_at IS NULL AND date >= ? AND date <= ?`,
    businessId,
    range.from,
    range.to,
  );

  const customers = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) AS count FROM customers
     WHERE business_id = ? AND deleted_at IS NULL`,
    businessId,
  );

  const incomeCents = income?.total ?? 0;
  const expenseCents = expenses?.total ?? 0;
  const salesCount = income?.count ?? 0;

  const [series, topProducts, alerts] = await Promise.all([
    getMonthlySeries(db, businessId, months, seriesStart),
    getTopProducts(db, businessId, range.from, range.to),
    getStockAlerts(db, businessId),
  ]);

  return {
    summary: {
      incomeCents,
      expenseCents,
      profitCents: incomeCents - expenseCents,
      salesCount,
      averageTicketCents: salesCount > 0 ? Math.round(incomeCents / salesCount) : 0,
      customersCount: customers?.count ?? 0,
    },
    series,
    topProducts,
    alerts,
  };
}

async function getMonthlySeries(
  db: SQLiteDatabase,
  businessId: string,
  months: string[],
  startDate: string,
): Promise<MonthlyPoint[]> {
  const incomeRows = await db.getAllAsync<{ month: string; total: number }>(
    `SELECT substr(date, 1, 7) AS month, COALESCE(SUM(total_cents), 0) AS total
     FROM sales
     WHERE business_id = ? AND deleted_at IS NULL AND date >= ?
     GROUP BY month`,
    businessId,
    startDate,
  );

  const expenseRows = await db.getAllAsync<{ month: string; total: number }>(
    `SELECT substr(date, 1, 7) AS month, COALESCE(SUM(amount_cents), 0) AS total
     FROM expenses
     WHERE business_id = ? AND deleted_at IS NULL AND date >= ?
     GROUP BY month`,
    businessId,
    startDate,
  );

  const incomeByMonth = new Map(incomeRows.map((row) => [row.month, row.total]));
  const expenseByMonth = new Map(expenseRows.map((row) => [row.month, row.total]));

  return months.map((month) => ({
    month,
    label: monthLabelShort(month),
    incomeCents: incomeByMonth.get(month) ?? 0,
    expenseCents: expenseByMonth.get(month) ?? 0,
  }));
}

async function getTopProducts(
  db: SQLiteDatabase,
  businessId: string,
  from: string,
  to: string,
): Promise<TopProduct[]> {
  const rows = await db.getAllAsync<{
    product_id: string;
    name: string;
    quantity: number;
    revenue_cents: number;
  }>(
    `SELECT si.product_id,
            MAX(si.product_name) AS name,
            COALESCE(SUM(si.quantity), 0) AS quantity,
            COALESCE(SUM(si.quantity * si.unit_price_cents), 0) AS revenue_cents
     FROM sale_items si
     JOIN sales s ON s.id = si.sale_id
     WHERE s.business_id = ? AND s.deleted_at IS NULL AND s.date >= ? AND s.date <= ?
     GROUP BY si.product_id
     ORDER BY quantity DESC
     LIMIT 5`,
    businessId,
    from,
    to,
  );

  return rows.map((row) => ({
    productId: row.product_id,
    name: row.name,
    quantity: row.quantity,
    revenueCents: Math.round(row.revenue_cents),
  }));
}

async function getStockAlerts(db: SQLiteDatabase, businessId: string): Promise<StockAlert[]> {
  const products = await db.getAllAsync<{
    id: string;
    name: string;
    stock: number;
    min_stock: number;
    unit: string;
  }>(
    `SELECT id, name, stock, min_stock, unit FROM products
     WHERE business_id = ? AND deleted_at IS NULL AND active = 1 AND stock <= min_stock`,
    businessId,
  );

  const supplies = await db.getAllAsync<{
    id: string;
    name: string;
    stock: number;
    min_stock: number;
    unit: string;
  }>(
    `SELECT id, name, stock, min_stock, unit FROM supplies
     WHERE business_id = ? AND deleted_at IS NULL AND stock <= min_stock`,
    businessId,
  );

  const alerts: StockAlert[] = [
    ...products.map((row) => ({
      id: row.id,
      kind: 'product' as const,
      name: row.name,
      stock: row.stock,
      minStock: row.min_stock,
      unit: row.unit,
    })),
    ...supplies.map((row) => ({
      id: row.id,
      kind: 'supply' as const,
      name: row.name,
      stock: row.stock,
      minStock: row.min_stock,
      unit: row.unit,
    })),
  ];

  return alerts.sort((a, b) => a.stock - a.minStock - (b.stock - b.minStock)).slice(0, 8);
}
