import type {
  Business,
  Customer,
  CustomerWithStats,
  Employee,
  Expense,
  Product,
  Sale,
  Supply,
} from './types';

export type BusinessRow = {
  id: string;
  name: string;
  currency: string;
  owner_name: string | null;
  owner_email: string | null;
  created_at: string;
  updated_at: string;
};

export function mapBusiness(row: BusinessRow): Business {
  return {
    id: row.id,
    name: row.name,
    currency: row.currency,
    ownerName: row.owner_name,
    ownerEmail: row.owner_email,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export type ProductRow = {
  id: string;
  business_id: string;
  name: string;
  category: string | null;
  sku: string | null;
  unit: string;
  price_cents: number;
  cost_cents: number;
  stock: number;
  min_stock: number;
  active: number;
  created_at: string;
  updated_at: string;
};

export function mapProduct(row: ProductRow): Product {
  return {
    id: row.id,
    businessId: row.business_id,
    name: row.name,
    category: row.category,
    sku: row.sku,
    unit: row.unit,
    priceCents: row.price_cents,
    costCents: row.cost_cents,
    stock: row.stock,
    minStock: row.min_stock,
    active: row.active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export type SupplyRow = {
  id: string;
  business_id: string;
  name: string;
  unit: string;
  stock: number;
  min_stock: number;
  unit_cost_cents: number;
  created_at: string;
  updated_at: string;
};

export function mapSupply(row: SupplyRow): Supply {
  return {
    id: row.id,
    businessId: row.business_id,
    name: row.name,
    unit: row.unit,
    stock: row.stock,
    minStock: row.min_stock,
    unitCostCents: row.unit_cost_cents,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export type CustomerRow = {
  id: string;
  business_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export function mapCustomer(row: CustomerRow): Customer {
  return {
    id: row.id,
    businessId: row.business_id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export type CustomerStatsRow = CustomerRow & {
  purchases: number;
  total_spent_cents: number | null;
  last_purchase_date: string | null;
};

export function mapCustomerWithStats(row: CustomerStatsRow): CustomerWithStats {
  return {
    ...mapCustomer(row),
    purchases: row.purchases ?? 0,
    totalSpentCents: row.total_spent_cents ?? 0,
    lastPurchaseDate: row.last_purchase_date,
  };
}

export type SaleRow = {
  id: string;
  business_id: string;
  customer_id: string | null;
  customer_name: string | null;
  date: string;
  total_cents: number;
  payment_method: string;
  note: string | null;
  created_at: string;
  item_count: number;
  items_summary: string | null;
};

export function mapSale(row: SaleRow): Sale {
  return {
    id: row.id,
    businessId: row.business_id,
    customerId: row.customer_id,
    customerName: row.customer_name,
    date: row.date,
    totalCents: row.total_cents,
    paymentMethod: row.payment_method,
    note: row.note,
    createdAt: row.created_at,
    itemCount: row.item_count ?? 0,
    itemsSummary: row.items_summary,
  };
}

export type ExpenseRow = {
  id: string;
  business_id: string;
  category: string;
  description: string;
  amount_cents: number;
  date: string;
  note: string | null;
  created_at: string;
};

export function mapExpense(row: ExpenseRow): Expense {
  return {
    id: row.id,
    businessId: row.business_id,
    category: row.category,
    description: row.description,
    amountCents: row.amount_cents,
    date: row.date,
    note: row.note,
    createdAt: row.created_at,
  };
}

export type EmployeeRow = {
  id: string;
  business_id: string;
  name: string;
  email: string | null;
  role: string;
  status: string;
  created_at: string;
};

export function mapEmployee(row: EmployeeRow): Employee {
  return {
    id: row.id,
    businessId: row.business_id,
    name: row.name,
    email: row.email,
    role: row.role === 'dueno' ? 'dueno' : 'empleado',
    status:
      row.status === 'activo' ? 'activo' : row.status === 'inactivo' ? 'inactivo' : 'invitado',
    createdAt: row.created_at,
  };
}
