/**
 * Shared validation utilities for forms and database constraints.
 */

export const VALIDATION_LIMITS = {
  customer: {
    name: { min: 1, max: 100 },
    phone: { max: 20 },
    email: { max: 254 },
    notes: { max: 1000 },
  },
  product: {
    name: { min: 1, max: 100 },
    category: { max: 50 },
    sku: { max: 50 },
    unit: { min: 1, max: 20 },
    priceCents: { min: 0, max: 999999999 },
    costCents: { min: 0, max: 999999999 },
    stock: { min: 0, max: 999999 },
    minStock: { min: 0, max: 999999 },
  },
  supply: {
    name: { min: 1, max: 100 },
    unit: { min: 1, max: 20 },
    unitCostCents: { min: 0, max: 999999999 },
    stock: { min: 0, max: 999999 },
    minStock: { min: 0, max: 999999 },
  },
  expense: {
    category: { min: 1, max: 50 },
    description: { min: 1, max: 200 },
    amountCents: { min: 1, max: 999999999 },
    note: { max: 500 },
  },
  sale: {
    freeTotalCents: { min: 1, max: 999999999 },
    quantity: { min: 0.01, max: 999999 },
    unitPriceCents: { min: 0, max: 999999999 },
    note: { max: 500 },
  },
  employee: {
    name: { min: 1, max: 100 },
    email: { max: 254 },
  },
  business: {
    name: { min: 1, max: 100 },
    ownerName: { max: 100 },
    ownerEmail: { max: 254 },
  },
} as const;

/**
 * Validates a string length.
 */
export function validateLength(
  value: string,
  min: number,
  max: number,
  fieldName: string,
): string | null {
  const trimmed = value.trim();
  if (trimmed.length < min) {
    return `${fieldName} debe tener al menos ${min} carácter${min !== 1 ? 'es' : ''}.`;
  }
  if (trimmed.length > max) {
    return `${fieldName} no puede exceder ${max} caracteres.`;
  }
  return null;
}

/**
 * Validates email format.
 */
export function validateEmail(email: string): string | null {
  const trimmed = email.trim();
  if (!trimmed) return null; // Optional field
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    return 'El formato del correo electrónico no es válido.';
  }
  if (trimmed.length > VALIDATION_LIMITS.customer.email.max) {
    return `El correo no puede exceder ${VALIDATION_LIMITS.customer.email.max} caracteres.`;
  }
  return null;
}

/**
 * Validates phone number format (Mexican format primarily, but flexible).
 */
export function validatePhone(phone: string): string | null {
  const trimmed = phone.trim();
  if (!trimmed) return null; // Optional field
  // Allow digits, spaces, dashes, parentheses, plus sign
  const phoneRegex = /^[\d\s\-\(\)\+]{7,20}$/;
  if (!phoneRegex.test(trimmed)) {
    return 'El teléfono solo puede contener números, espacios, guiones, paréntesis y el signo +.';
  }
  if (trimmed.length > VALIDATION_LIMITS.customer.phone.max) {
    return `El teléfono no puede exceder ${VALIDATION_LIMITS.customer.phone.max} caracteres.`;
  }
  return null;
}

/**
 * Validates a positive monetary amount (in cents).
 */
export function validatePositiveAmount(
  cents: number,
  fieldName: string = 'Monto',
): string | null {
  if (!Number.isFinite(cents) || cents <= 0) {
    return `${fieldName} debe ser mayor que cero.`;
  }
  if (cents > 999999999) {
    return `${fieldName} excede el máximo permitido.`;
  }
  return null;
}

/**
 * Validates a non-negative quantity.
 */
export function validateQuantity(
  quantity: number,
  fieldName: string = 'Cantidad',
): string | null {
  if (!Number.isFinite(quantity) || quantity < 0) {
    return `${fieldName} no puede ser negativa.`;
  }
  if (quantity > 999999) {
    return `${fieldName} excede el máximo permitido.`;
  }
  return null;
}

/**
 * Validates a non-negative integer (for stock).
 */
export function validateStock(
  stock: number,
  fieldName: string = 'Stock',
): string | null {
  if (!Number.isFinite(stock) || stock < 0) {
    return `${fieldName} no puede ser negativo.`;
  }
  if (!Number.isInteger(stock) && fieldName !== 'Stock actual' && fieldName !== 'Stock mínimo') {
    // Allow decimals for stock actual/min
  }
  if (stock > 999999) {
    return `${fieldName} excede el máximo permitido.`;
  }
  return null;
}

/**
 * Validation result type.
 */
export type ValidationResult = {
  valid: boolean;
  errors: Record<string, string>;
};

/**
 * Creates an empty validation result.
 */
export function createValidationResult(): ValidationResult {
  return { valid: true, errors: {} };
}

/**
 * Adds an error to validation result.
 */
export function addValidationError(
  result: ValidationResult,
  field: string,
  message: string,
): void {
  result.valid = false;
  result.errors[field] = message;
}

/**
 * Validates customer input.
 */
export function validateCustomerInput(input: {
  name: string;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
}): ValidationResult {
  const result = createValidationResult();

  const nameError = validateLength(
    input.name,
    VALIDATION_LIMITS.customer.name.min,
    VALIDATION_LIMITS.customer.name.max,
    'Nombre',
  );
  if (nameError) addValidationError(result, 'name', nameError);

  if (input.phone) {
    const phoneError = validatePhone(input.phone);
    if (phoneError) addValidationError(result, 'phone', phoneError);
  }

  if (input.email) {
    const emailError = validateEmail(input.email);
    if (emailError) addValidationError(result, 'email', emailError);
  }

  if (input.notes) {
    const notesError = validateLength(
      input.notes,
      0,
      VALIDATION_LIMITS.customer.notes.max,
      'Notas',
    );
    if (notesError) addValidationError(result, 'notes', notesError);
  }

  return result;
}

/**
 * Validates product input.
 */
export function validateProductInput(input: {
  name: string;
  category?: string | null;
  sku?: string | null;
  unit: string;
  priceCents: number;
  costCents: number;
  stock: number;
  minStock: number;
}): ValidationResult {
  const result = createValidationResult();

  const nameError = validateLength(
    input.name,
    VALIDATION_LIMITS.product.name.min,
    VALIDATION_LIMITS.product.name.max,
    'Nombre',
  );
  if (nameError) addValidationError(result, 'name', nameError);

  if (input.category) {
    const catError = validateLength(
      input.category,
      0,
      VALIDATION_LIMITS.product.category.max,
      'Categoría',
    );
    if (catError) addValidationError(result, 'category', catError);
  }

  if (input.sku) {
    const skuError = validateLength(
      input.sku,
      0,
      VALIDATION_LIMITS.product.sku.max,
      'SKU',
    );
    if (skuError) addValidationError(result, 'sku', skuError);
  }

  const unitError = validateLength(
    input.unit,
    VALIDATION_LIMITS.product.unit.min,
    VALIDATION_LIMITS.product.unit.max,
    'Unidad',
  );
  if (unitError) addValidationError(result, 'unit', unitError);

  const priceError = validatePositiveAmount(input.priceCents, 'Precio de venta');
  if (priceError) addValidationError(result, 'priceCents', priceError);

  const costError = validatePositiveAmount(input.costCents, 'Costo');
  if (costError) addValidationError(result, 'costCents', costError);

  const stockError = validateStock(input.stock, 'Stock actual');
  if (stockError) addValidationError(result, 'stock', stockError);

  const minStockError = validateStock(input.minStock, 'Stock mínimo');
  if (minStockError) addValidationError(result, 'minStock', minStockError);

  return result;
}

/**
 * Validates supply input.
 */
export function validateSupplyInput(input: {
  name: string;
  unit: string;
  unitCostCents: number;
  stock: number;
  minStock: number;
}): ValidationResult {
  const result = createValidationResult();

  const nameError = validateLength(
    input.name,
    VALIDATION_LIMITS.supply.name.min,
    VALIDATION_LIMITS.supply.name.max,
    'Nombre',
  );
  if (nameError) addValidationError(result, 'name', nameError);

  const unitError = validateLength(
    input.unit,
    VALIDATION_LIMITS.supply.unit.min,
    VALIDATION_LIMITS.supply.unit.max,
    'Unidad',
  );
  if (unitError) addValidationError(result, 'unit', unitError);

  const costError = validatePositiveAmount(input.unitCostCents, 'Costo por unidad');
  if (costError) addValidationError(result, 'unitCostCents', costError);

  const stockError = validateStock(input.stock, 'Stock actual');
  if (stockError) addValidationError(result, 'stock', stockError);

  const minStockError = validateStock(input.minStock, 'Stock mínimo');
  if (minStockError) addValidationError(result, 'minStock', minStockError);

  return result;
}

/**
 * Validates expense input.
 */
export function validateExpenseInput(input: {
  category: string;
  description: string;
  amountCents: number;
  date: string;
  note?: string | null;
}): ValidationResult {
  const result = createValidationResult();

  const catError = validateLength(
    input.category,
    VALIDATION_LIMITS.expense.category.min,
    VALIDATION_LIMITS.expense.category.max,
    'Categoría',
  );
  if (catError) addValidationError(result, 'category', catError);

  const descError = validateLength(
    input.description,
    VALIDATION_LIMITS.expense.description.min,
    VALIDATION_LIMITS.expense.description.max,
    'Descripción',
  );
  if (descError) addValidationError(result, 'description', descError);

  const amountError = validatePositiveAmount(input.amountCents, 'Monto');
  if (amountError) addValidationError(result, 'amountCents', amountError);

  if (input.note) {
    const noteError = validateLength(
      input.note,
      0,
      VALIDATION_LIMITS.expense.note.max,
      'Nota',
    );
    if (noteError) addValidationError(result, 'note', noteError);
  }

  // Validate date format (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(input.date)) {
    addValidationError(result, 'date', 'La fecha debe tener formato YYYY-MM-DD.');
  }

  return result;
}

/**
 * Validates sale input (free mode).
 */
export function validateSaleInput(input: {
  freeTotalCents?: number;
  items?: { quantity: number; unitPriceCents: number }[];
}): ValidationResult {
  const result = createValidationResult();

  if (input.freeTotalCents !== undefined) {
    const totalError = validatePositiveAmount(input.freeTotalCents, 'Monto de la venta');
    if (totalError) addValidationError(result, 'freeTotalCents', totalError);
  }

  if (input.items) {
    input.items.forEach((item, index) => {
      const qtyError = validateQuantity(item.quantity, `Cantidad (producto ${index + 1})`);
      if (qtyError) addValidationError(result, `items[${index}].quantity`, qtyError);

      const priceError = validatePositiveAmount(item.unitPriceCents, `Precio (producto ${index + 1})`);
      if (priceError) addValidationError(result, `items[${index}].unitPriceCents`, priceError);
    });
  }

  return result;
}

/**
 * Validates employee input.
 */
export function validateEmployeeInput(input: {
  name: string;
  email?: string | null;
}): ValidationResult {
  const result = createValidationResult();

  const nameError = validateLength(
    input.name,
    VALIDATION_LIMITS.employee.name.min,
    VALIDATION_LIMITS.employee.name.max,
    'Nombre',
  );
  if (nameError) addValidationError(result, 'name', nameError);

  if (input.email) {
    const emailError = validateEmail(input.email);
    if (emailError) addValidationError(result, 'email', emailError);
  }

  return result;
}

/**
 * Validates business input.
 */
export function validateBusinessInput(input: {
  name: string;
  ownerName?: string | null;
  ownerEmail?: string | null;
}): ValidationResult {
  const result = createValidationResult();

  const nameError = validateLength(
    input.name,
    VALIDATION_LIMITS.business.name.min,
    VALIDATION_LIMITS.business.name.max,
    'Nombre del negocio',
  );
  if (nameError) addValidationError(result, 'name', nameError);

  if (input.ownerName) {
    const ownerNameError = validateLength(
      input.ownerName,
      0,
      VALIDATION_LIMITS.business.ownerName.max,
      'Tu nombre',
    );
    if (ownerNameError) addValidationError(result, 'ownerName', ownerNameError);
  }

  if (input.ownerEmail) {
    const emailError = validateEmail(input.ownerEmail);
    if (emailError) addValidationError(result, 'ownerEmail', emailError);
  }

  return result;
}