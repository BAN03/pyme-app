import type { SQLiteDatabase } from 'expo-sqlite';

export const DATABASE_NAME = 'pyme.db';
export const DATABASE_VERSION = 2;

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
        name TEXT NOT NULL CHECK (length(trim(name)) >= 1 AND length(trim(name)) <= 100),
        currency TEXT NOT NULL DEFAULT 'MXN' CHECK (currency IN ('MXN', 'USD', 'EUR', 'COP', 'ARS', 'CLP', 'PEN', 'GTQ', 'HNL', 'NIO', 'CRC', 'DOP', 'PAB', 'UYU', 'PYG', 'BOB', 'VES', 'BRL')),
        owner_name TEXT CHECK (owner_name IS NULL OR length(trim(owner_name)) <= 100),
        owner_email TEXT CHECK (owner_email IS NULL OR (length(trim(owner_email)) <= 254 AND trim(owner_email) LIKE '%_@__%.__%')),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY NOT NULL,
        business_id TEXT NOT NULL,
        name TEXT NOT NULL CHECK (length(trim(name)) >= 1 AND length(trim(name)) <= 100),
        category TEXT CHECK (category IS NULL OR length(trim(category)) <= 50),
        sku TEXT CHECK (sku IS NULL OR length(trim(sku)) <= 50),
        unit TEXT NOT NULL DEFAULT 'pza' CHECK (length(trim(unit)) >= 1 AND length(trim(unit)) <= 20),
        price_cents INTEGER NOT NULL DEFAULT 0 CHECK (price_cents >= 0 AND price_cents <= 999999999),
        cost_cents INTEGER NOT NULL DEFAULT 0 CHECK (cost_cents >= 0 AND cost_cents <= 999999999),
        stock REAL NOT NULL DEFAULT 0 CHECK (stock >= 0 AND stock <= 999999),
        min_stock REAL NOT NULL DEFAULT 0 CHECK (min_stock >= 0 AND min_stock <= 999999),
        active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
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
        name TEXT NOT NULL CHECK (length(trim(name)) >= 1 AND length(trim(name)) <= 100),
        unit TEXT NOT NULL DEFAULT 'pza' CHECK (length(trim(unit)) >= 1 AND length(trim(unit)) <= 20),
        stock REAL NOT NULL DEFAULT 0 CHECK (stock >= 0 AND stock <= 999999),
        min_stock REAL NOT NULL DEFAULT 0 CHECK (min_stock >= 0 AND min_stock <= 999999),
        unit_cost_cents INTEGER NOT NULL DEFAULT 0 CHECK (unit_cost_cents >= 0 AND unit_cost_cents <= 999999999),
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
        kind TEXT NOT NULL DEFAULT 'purchase' CHECK (kind IN ('purchase', 'adjustment', 'consumption')),
        quantity REAL NOT NULL CHECK (quantity > 0 AND quantity <= 999999),
        total_cost_cents INTEGER NOT NULL DEFAULT 0 CHECK (total_cost_cents >= 0 AND total_cost_cents <= 999999999),
        note TEXT CHECK (note IS NULL OR length(trim(note)) <= 500),
        date TEXT NOT NULL CHECK (date GLOB '____-__-__'),
        created_at TEXT NOT NULL,
        device_id TEXT,
        FOREIGN KEY (supply_id) REFERENCES supplies(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_supply_movements_supply
        ON supply_movements(supply_id, date);

      CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY NOT NULL,
        business_id TEXT NOT NULL,
        name TEXT NOT NULL CHECK (length(trim(name)) >= 1 AND length(trim(name)) <= 100),
        phone TEXT CHECK (phone IS NULL OR (length(trim(phone)) <= 20 AND trim(phone) GLOB '[0-9+() -]*')),
        email TEXT CHECK (email IS NULL OR (length(trim(email)) <= 254 AND trim(email) LIKE '%_@__%.__%')),
        notes TEXT CHECK (notes IS NULL OR length(trim(notes)) <= 1000),
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
        date TEXT NOT NULL CHECK (date GLOB '____-__-__'),
        total_cents INTEGER NOT NULL DEFAULT 0 CHECK (total_cents >= 0),
        payment_method TEXT NOT NULL DEFAULT 'efectivo' CHECK (payment_method IN ('efectivo', 'transferencia', 'tarjeta', 'otro')),
        note TEXT CHECK (note IS NULL OR length(trim(note)) <= 500),
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
        product_name TEXT NOT NULL CHECK (length(trim(product_name)) >= 1),
        quantity REAL NOT NULL DEFAULT 1 CHECK (quantity > 0 AND quantity <= 999999),
        unit_price_cents INTEGER NOT NULL DEFAULT 0 CHECK (unit_price_cents >= 0 AND unit_price_cents <= 999999999),
        unit_cost_cents INTEGER NOT NULL DEFAULT 0 CHECK (unit_cost_cents >= 0 AND unit_cost_cents <= 999999999),
        created_at TEXT NOT NULL,
        device_id TEXT,
        FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);
      CREATE INDEX IF NOT EXISTS idx_sale_items_product ON sale_items(product_id);

      CREATE TABLE IF NOT EXISTS expenses (
        id TEXT PRIMARY KEY NOT NULL,
        business_id TEXT NOT NULL,
        category TEXT NOT NULL CHECK (length(trim(category)) >= 1 AND length(trim(category)) <= 50),
        description TEXT NOT NULL CHECK (length(trim(description)) >= 1 AND length(trim(description)) <= 200),
        amount_cents INTEGER NOT NULL DEFAULT 0 CHECK (amount_cents > 0 AND amount_cents <= 999999999),
        date TEXT NOT NULL CHECK (date GLOB '____-__-__'),
        note TEXT CHECK (note IS NULL OR length(trim(note)) <= 500),
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
        name TEXT NOT NULL CHECK (length(trim(name)) >= 1 AND length(trim(name)) <= 100),
        email TEXT CHECK (email IS NULL OR (length(trim(email)) <= 254 AND trim(email) LIKE '%_@__%.__%')),
        role TEXT NOT NULL DEFAULT 'empleado' CHECK (role IN ('dueno', 'empleado')),
        status TEXT NOT NULL DEFAULT 'invitado' CHECK (status IN ('activo', 'invitado', 'inactivo')),
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

  if (version === 1) {
    await migrateV1ToV2(db);
    version = 2;
  }

  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}

async function migrateV1ToV2(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    -- Recreate customers table with CHECK constraints
    CREATE TABLE customers_new (
      id TEXT PRIMARY KEY NOT NULL,
      business_id TEXT NOT NULL,
      name TEXT NOT NULL CHECK (length(trim(name)) >= 1 AND length(trim(name)) <= 100),
      phone TEXT CHECK (phone IS NULL OR (length(trim(phone)) <= 20 AND trim(phone) GLOB '[0-9+() -]*')),
      email TEXT CHECK (email IS NULL OR (length(trim(email)) <= 254 AND trim(email) LIKE '%_@__%.__%')),
      notes TEXT CHECK (notes IS NULL OR length(trim(notes)) <= 1000),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      device_id TEXT,
      FOREIGN KEY (business_id) REFERENCES business(id) ON DELETE CASCADE
    );
    INSERT INTO customers_new SELECT * FROM customers;
    DROP TABLE customers;
    ALTER TABLE customers_new RENAME TO customers;
    CREATE INDEX IF NOT EXISTS idx_customers_business ON customers(business_id, deleted_at);

    -- Recreate products table with CHECK constraints
    CREATE TABLE products_new (
      id TEXT PRIMARY KEY NOT NULL,
      business_id TEXT NOT NULL,
      name TEXT NOT NULL CHECK (length(trim(name)) >= 1 AND length(trim(name)) <= 100),
      category TEXT CHECK (category IS NULL OR length(trim(category)) <= 50),
      sku TEXT CHECK (sku IS NULL OR length(trim(sku)) <= 50),
      unit TEXT NOT NULL DEFAULT 'pza' CHECK (length(trim(unit)) >= 1 AND length(trim(unit)) <= 20),
      price_cents INTEGER NOT NULL DEFAULT 0 CHECK (price_cents >= 0 AND price_cents <= 999999999),
      cost_cents INTEGER NOT NULL DEFAULT 0 CHECK (cost_cents >= 0 AND cost_cents <= 999999999),
      stock REAL NOT NULL DEFAULT 0 CHECK (stock >= 0 AND stock <= 999999),
      min_stock REAL NOT NULL DEFAULT 0 CHECK (min_stock >= 0 AND min_stock <= 999999),
      active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      device_id TEXT,
      FOREIGN KEY (business_id) REFERENCES business(id) ON DELETE CASCADE
    );
    INSERT INTO products_new SELECT * FROM products;
    DROP TABLE products;
    ALTER TABLE products_new RENAME TO products;
    CREATE INDEX IF NOT EXISTS idx_products_business ON products(business_id, deleted_at);

    -- Recreate supplies table with CHECK constraints
    CREATE TABLE supplies_new (
      id TEXT PRIMARY KEY NOT NULL,
      business_id TEXT NOT NULL,
      name TEXT NOT NULL CHECK (length(trim(name)) >= 1 AND length(trim(name)) <= 100),
      unit TEXT NOT NULL DEFAULT 'pza' CHECK (length(trim(unit)) >= 1 AND length(trim(unit)) <= 20),
      stock REAL NOT NULL DEFAULT 0 CHECK (stock >= 0 AND stock <= 999999),
      min_stock REAL NOT NULL DEFAULT 0 CHECK (min_stock >= 0 AND min_stock <= 999999),
      unit_cost_cents INTEGER NOT NULL DEFAULT 0 CHECK (unit_cost_cents >= 0 AND unit_cost_cents <= 999999999),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      device_id TEXT,
      FOREIGN KEY (business_id) REFERENCES business(id) ON DELETE CASCADE
    );
    INSERT INTO supplies_new SELECT * FROM supplies;
    DROP TABLE supplies;
    ALTER TABLE supplies_new RENAME TO supplies;
    CREATE INDEX IF NOT EXISTS idx_supplies_business ON supplies(business_id, deleted_at);

    -- Recreate expenses table with CHECK constraints
    CREATE TABLE expenses_new (
      id TEXT PRIMARY KEY NOT NULL,
      business_id TEXT NOT NULL,
      category TEXT NOT NULL CHECK (length(trim(category)) >= 1 AND length(trim(category)) <= 50),
      description TEXT NOT NULL CHECK (length(trim(description)) >= 1 AND length(trim(description)) <= 200),
      amount_cents INTEGER NOT NULL DEFAULT 0 CHECK (amount_cents > 0 AND amount_cents <= 999999999),
      date TEXT NOT NULL CHECK (date GLOB '____-__-__'),
      note TEXT CHECK (note IS NULL OR length(trim(note)) <= 500),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      device_id TEXT,
      FOREIGN KEY (business_id) REFERENCES business(id) ON DELETE CASCADE
    );
    INSERT INTO expenses_new SELECT * FROM expenses;
    DROP TABLE expenses;
    ALTER TABLE expenses_new RENAME TO expenses;
    CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(business_id, date, deleted_at);

    -- Recreate sales table with CHECK constraints
    CREATE TABLE sales_new (
      id TEXT PRIMARY KEY NOT NULL,
      business_id TEXT NOT NULL,
      customer_id TEXT,
      date TEXT NOT NULL CHECK (date GLOB '____-__-__'),
      total_cents INTEGER NOT NULL DEFAULT 0 CHECK (total_cents >= 0),
      payment_method TEXT NOT NULL DEFAULT 'efectivo' CHECK (payment_method IN ('efectivo', 'transferencia', 'tarjeta', 'otro')),
      note TEXT CHECK (note IS NULL OR length(trim(note)) <= 500),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      device_id TEXT,
      FOREIGN KEY (business_id) REFERENCES business(id) ON DELETE CASCADE,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
    );
    INSERT INTO sales_new SELECT * FROM sales;
    DROP TABLE sales;
    ALTER TABLE sales_new RENAME TO sales;
    CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(business_id, date, deleted_at);
    CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_id);

    -- Recreate sale_items table with CHECK constraints
    CREATE TABLE sale_items_new (
      id TEXT PRIMARY KEY NOT NULL,
      business_id TEXT NOT NULL,
      sale_id TEXT NOT NULL,
      product_id TEXT,
      product_name TEXT NOT NULL CHECK (length(trim(product_name)) >= 1),
      quantity REAL NOT NULL DEFAULT 1 CHECK (quantity > 0 AND quantity <= 999999),
      unit_price_cents INTEGER NOT NULL DEFAULT 0 CHECK (unit_price_cents >= 0 AND unit_price_cents <= 999999999),
      unit_cost_cents INTEGER NOT NULL DEFAULT 0 CHECK (unit_cost_cents >= 0 AND unit_cost_cents <= 999999999),
      created_at TEXT NOT NULL,
      device_id TEXT,
      FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE
    );
    INSERT INTO sale_items_new SELECT * FROM sale_items;
    DROP TABLE sale_items;
    ALTER TABLE sale_items_new RENAME TO sale_items;
    CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);
    CREATE INDEX IF NOT EXISTS idx_sale_items_product ON sale_items(product_id);

    -- Recreate supply_movements table with CHECK constraints
    CREATE TABLE supply_movements_new (
      id TEXT PRIMARY KEY NOT NULL,
      business_id TEXT NOT NULL,
      supply_id TEXT NOT NULL,
      kind TEXT NOT NULL DEFAULT 'purchase' CHECK (kind IN ('purchase', 'adjustment', 'consumption')),
      quantity REAL NOT NULL CHECK (quantity > 0 AND quantity <= 999999),
      total_cost_cents INTEGER NOT NULL DEFAULT 0 CHECK (total_cost_cents >= 0 AND total_cost_cents <= 999999999),
      note TEXT CHECK (note IS NULL OR length(trim(note)) <= 500),
      date TEXT NOT NULL CHECK (date GLOB '____-__-__'),
      created_at TEXT NOT NULL,
      device_id TEXT,
      FOREIGN KEY (supply_id) REFERENCES supplies(id) ON DELETE CASCADE
    );
    INSERT INTO supply_movements_new SELECT * FROM supply_movements;
    DROP TABLE supply_movements;
    ALTER TABLE supply_movements_new RENAME TO supply_movements;
    CREATE INDEX IF NOT EXISTS idx_supply_movements_supply ON supply_movements(supply_id, date);

    -- Recreate employees table with CHECK constraints
    CREATE TABLE employees_new (
      id TEXT PRIMARY KEY NOT NULL,
      business_id TEXT NOT NULL,
      name TEXT NOT NULL CHECK (length(trim(name)) >= 1 AND length(trim(name)) <= 100),
      email TEXT CHECK (email IS NULL OR (length(trim(email)) <= 254 AND trim(email) LIKE '%_@__%.__%')),
      role TEXT NOT NULL DEFAULT 'empleado' CHECK (role IN ('dueno', 'empleado')),
      status TEXT NOT NULL DEFAULT 'invitado' CHECK (status IN ('activo', 'invitado', 'inactivo')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      device_id TEXT,
      FOREIGN KEY (business_id) REFERENCES business(id) ON DELETE CASCADE
    );
    INSERT INTO employees_new SELECT * FROM employees;
    DROP TABLE employees;
    ALTER TABLE employees_new RENAME TO employees;

    -- Recreate business table with CHECK constraints
    CREATE TABLE business_new (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL CHECK (length(trim(name)) >= 1 AND length(trim(name)) <= 100),
      currency TEXT NOT NULL DEFAULT 'MXN' CHECK (currency IN ('MXN', 'USD', 'EUR', 'COP', 'ARS', 'CLP', 'PEN', 'GTQ', 'HNL', 'NIO', 'CRC', 'DOP', 'PAB', 'UYU', 'PYG', 'BOB', 'VES', 'BRL')),
      owner_name TEXT CHECK (owner_name IS NULL OR length(trim(owner_name)) <= 100),
      owner_email TEXT CHECK (owner_email IS NULL OR (length(trim(owner_email)) <= 254 AND trim(owner_email) LIKE '%_@__%.__%')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    INSERT INTO business_new SELECT * FROM business;
    DROP TABLE business;
    ALTER TABLE business_new RENAME TO business;
  `);
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
