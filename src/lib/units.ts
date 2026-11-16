/**
 * Units of measure offered when registering products and supplies.
 * `value` is what gets stored; `label` is what the user sees.
 */

export type UnitOption = {
  value: string;
  label: string;
};

export const UNITS: UnitOption[] = [
  { value: 'pza', label: 'Pieza' },
  { value: 'kg', label: 'Kilogramo (kg)' },
  { value: 'g', label: 'Gramo (g)' },
  { value: 'L', label: 'Litro (L)' },
  { value: 'ml', label: 'Mililitro (ml)' },
  { value: 'caja', label: 'Caja' },
  { value: 'paquete', label: 'Paquete' },
  { value: 'docena', label: 'Docena' },
  { value: 'botella', label: 'Botella' },
  { value: 'lata', label: 'Lata' },
  { value: 'bolsa', label: 'Bolsa' },
  { value: 'm', label: 'Metro (m)' },
  { value: 'manojo', label: 'Manojo' },
];

/** Human readable label for a stored unit value, falling back to the raw value. */
export function unitLabel(value: string): string {
  return UNITS.find((unit) => unit.value === value)?.label ?? value;
}
