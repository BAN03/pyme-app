import type { SQLiteDatabase } from 'expo-sqlite';

export const DATABASE_NAME = 'pyme.db';
export const DATABASE_VERSION = 1;

export const DEFAULT_BUSINESS_ID = '00000000-0000-4000-8000-000000000001';

const NOW = `strftime('%Y-%m-%dT%H:%M:%fZ','now')`;

/**
 * Runs on every app start (before the migration) and again after a restore.
 * PRAGMAs are per connection, so they must be set every time the database opens.
 */
export async function initDatabase(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
  `);
  await migrateDbIfNeeded(db);
}

export async function migrateDbIfNeeded(db: SQLiteDatabase): Promise<void> {
  const result = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = result?.user_version ?? 0;

  if (version >= DATABASE_VERSION) return;

  if (version === 0) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS business (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        currency TEXT NOT NULL DEFAULT 'MXN',
        owner_name TEXT,
        owner_email TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY NOT NULL,
        business_id TEXT NOT NULL,
        name TEXT NOT NULL,
        category TEXT,
        sku TEXT,
        unit TEXT NOT NULL DEFAULT 'pza',
        price_cents INTEGER NOT NULL DEFAULT 0,
        cost_cents INTEGER NOT NULL DEFAULT 0,
        stock REAL NOT NULL DEFAULT 0,
        min_stock REAL NOT NULL DEFAULT 0,
        active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT,
        device_id TEXT,
        FOREIGN KEY (business_id) REFERENCES business(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_products_business
        ON products(business_id, deleted_at);

      CREATE TABLE IF NOT EXISTS supplies (
        id TEXT PRIMARY KEY NOT NULL,
        business_id TEXT NOT NULL,
        name TEXT NOT NULL,
        unit TEXT NOT NULL DEFAULT 'pza',
        stock REAL NOT NULL DEFAULT 0,
        min_stock REAL NOT NULL DEFAULT 0,
        unit_cost_cents INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT,
        device_id TEXT,
        FOREIGN KEY (business_id) REFERENCES business(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_supplies_business
        ON supplies(business_id, deleted_at);

      CREATE TABLE IF NOT EXISTS supply_movements (
        id TEXT PRIMARY KEY NOT NULL,
        business_id TEXT NOT NULL,
        supply_id TEXT NOT NULL,
        kind TEXT NOT NULL DEFAULT 'purchase',
        quantity REAL NOT NULL,
        total_cost_cents INTEGER NOT NULL DEFAULT 0,
        note TEXT,
        date TEXT NOT NULL,
        created_at TEXT NOT NULL,
        device_id TEXT,
        FOREIGN KEY (supply_id) REFERENCES supplies(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_supply_movements_supply
        ON supply_movements(supply_id, date);

      CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY NOT NULL,
        business_id TEXT NOT NULL,
        name TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT,
        device_id TEXT,
        FOREIGN KEY (business_id) REFERENCES business(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_customers_business
        ON customers(business_id, deleted_at);

      CREATE TABLE IF NOT EXISTS sales (
        id TEXT PRIMARY KEY NOT NULL,
        business_id TEXT NOT NULL,
        customer_id TEXT,
        date TEXT NOT NULL,
        total_cents INTEGER NOT NULL DEFAULT 0,
        payment_method TEXT NOT NULL DEFAULT 'efectivo',
        note TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT,
        device_id TEXT,
        FOREIGN KEY (business_id) REFERENCES business(id) ON DELETE CASCADE,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
      );
      CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(business_id, date, deleted_at);
      CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_id);

      CREATE TABLE IF NOT EXISTS sale_items (
        id TEXT PRIMARY KEY NOT NULL,
        business_id TEXT NOT NULL,
        sale_id TEXT NOT NULL,
        product_id TEXT,
        product_name TEXT NOT NULL,
        quantity REAL NOT NULL DEFAULT 1,
        unit_price_cents INTEGER NOT NULL DEFAULT 0,
        unit_cost_cents INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        device_id TEXT,
        FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);
      CREATE INDEX IF NOT EXISTS idx_sale_items_product ON sale_items(product_id);

      CREATE TABLE IF NOT EXISTS expenses (
        id TEXT PRIMARY KEY NOT NULL,
        business_id TEXT NOT NULL,
        category TEXT NOT NULL,
        description TEXT NOT NULL,
        amount_cents INTEGER NOT NULL DEFAULT 0,
        date TEXT NOT NULL,
        note TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT,
        device_id TEXT,
        FOREIGN KEY (business_id) REFERENCES business(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_expenses_date
        ON expenses(business_id, date, deleted_at);

      CREATE TABLE IF NOT EXISTS employees (
        id TEXT PRIMARY KEY NOT NULL,
        business_id TEXT NOT NULL,
        name TEXT NOT NULL,
        email TEXT,
        role TEXT NOT NULL DEFAULT 'empleado',
        status TEXT NOT NULL DEFAULT 'invitado',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT,
        device_id TEXT,
        FOREIGN KEY (business_id) REFERENCES business(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS app_meta (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT
      );

      INSERT OR IGNORE INTO business (id, name, currency, created_at, updated_at)
      VALUES ('${DEFAULT_BUSINESS_ID}', 'Mi negocio', 'MXN', ${NOW}, ${NOW});
    `);
    version = 1;
  }

  // Future migrations go here:
  // if (version === 1) { ...; version = 2; }

  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}

/** Wipes every business record but keeps the local device id. */
export async function resetDatabase(db: SQLiteDatabase): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.execAsync(`
      DELETE FROM sale_items;
      DELETE FROM sales;
      DELETE FROM expenses;
      DELETE FROM supply_movements;
      DELETE FROM supplies;
      DELETE FROM products;
      DELETE FROM customers;
      DELETE FROM employees;
      DELETE FROM business;
    `);
    await db.runAsync(
      `INSERT INTO business (id, name, currency, created_at, updated_at)
       VALUES (?, 'Mi negocio', 'MXN', ?, ?)`,
      DEFAULT_BUSINESS_ID,
      new Date().toISOString(),
      new Date().toISOString(),
    );
  });
}
