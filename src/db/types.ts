export type Business = {
  id: string;
  name: string;
  currency: string;
  ownerName: string | null;
  ownerEmail: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BusinessInput = {
  name: string;
  currency: string;
  ownerName: string | null;
  ownerEmail: string | null;
};

export type Product = {
  id: string;
  businessId: string;
  name: string;
  category: string | null;
  sku: string | null;
  unit: string;
  priceCents: number;
  costCents: number;
  stock: number;
  minStock: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ProductInput = {
  name: string;
  category: string | null;
  sku: string | null;
  unit: string;
  priceCents: number;
  costCents: number;
  stock: number;
  minStock: number;
};

export type Supply = {
  id: string;
  businessId: string;
  name: string;
  unit: string;
  stock: number;
  minStock: number;
  unitCostCents: number;
  createdAt: string;
  updatedAt: string;
};

export type SupplyInput = {
  name: string;
  unit: string;
  stock: number;
  minStock: number;
  unitCostCents: number;
};

export type SupplyMovement = {
  id: string;
  supplyId: string;
  kind: 'purchase' | 'adjustment' | 'consumption';
  quantity: number;
  totalCostCents: number;
  note: string | null;
  date: string;
};

export type Customer = {
  id: string;
  businessId: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CustomerWithStats = Customer & {
  purchases: number;
  totalSpentCents: number;
  lastPurchaseDate: string | null;
};

export type CustomerInput = {
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
};

export type SaleItem = {
  id: string;
  productId: string | null;
  productName: string;
  quantity: number;
  unitPriceCents: number;
  unitCostCents: number;
};

export type Sale = {
  id: string;
  businessId: string;
  customerId: string | null;
  customerName: string | null;
  date: string;
  totalCents: number;
  paymentMethod: string;
  note: string | null;
  createdAt: string;
  itemCount: number;
  itemsSummary: string | null;
};

export type NewSaleItem = {
  productId: string;
  quantity: number;
  unitPriceCents: number;
};

export type NewSaleInput = {
  date: string;
  customerId: string | null;
  paymentMethod: string;
  note: string | null;
  items: NewSaleItem[];
  /** Only used for quick sales without itemized products. */
  totalCents?: number;
};

export type Expense = {
  id: string;
  businessId: string;
  category: string;
  description: string;
  amountCents: number;
  date: string;
  note: string | null;
  createdAt: string;
};

export type ExpenseInput = {
  category: string;
  description: string;
  amountCents: number;
  date: string;
  note: string | null;
};

export type Employee = {
  id: string;
  businessId: string;
  name: string;
  email: string | null;
  role: 'dueno' | 'empleado';
  status: 'activo' | 'invitado' | 'inactivo';
  createdAt: string;
};

export type EmployeeInput = {
  name: string;
  email: string | null;
  role: 'dueno' | 'empleado';
};

export type MonthSummary = {
  incomeCents: number;
  expenseCents: number;
  profitCents: number;
  salesCount: number;
  averageTicketCents: number;
  customersCount: number;
};

export type MonthlyPoint = {
  month: string;
  label: string;
  incomeCents: number;
  expenseCents: number;
};

export type TopProduct = {
  productId: string;
  name: string;
  quantity: number;
  revenueCents: number;
};

export type StockAlert = {
  id: string;
  kind: 'product' | 'supply';
  name: string;
  stock: number;
  minStock: number;
  unit: string;
};

export type HomeData = {
  summary: MonthSummary;
  series: MonthlyPoint[];
  topProducts: TopProduct[];
  alerts: StockAlert[];
};
