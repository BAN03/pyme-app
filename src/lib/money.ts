const CURRENCY_SYMBOLS: Record<string, string> = {
  MXN: '$',
  USD: '$',
  EUR: '€',
  COP: '$',
  ARS: '$',
  CLP: '$',
  PEN: 'S/',
  GTQ: 'Q',
  HNL: 'L',
  NIO: 'C$',
  CRC: '₡',
  DOP: 'RD$',
  PAB: 'B/.',
  UYU: '$U',
  PYG: '₲',
  BOB: 'Bs',
  VES: 'Bs.',
  BRL: 'R$',
};

export const CURRENCIES = Object.keys(CURRENCY_SYMBOLS);

export function currencySymbol(currency: string): string {
  return CURRENCY_SYMBOLS[currency] ?? '$';
}

function groupThousands(value: string): string {
  return value.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** Formats integer cents as money, e.g. 123450 -> "$1,234.50". */
export function formatMoney(cents: number, currency = 'MXN', withSymbol = true): string {
  const safe = Number.isFinite(cents) ? cents : 0;
  const negative = safe < 0;
  const absolute = Math.abs(Math.round(safe));
  const units = Math.floor(absolute / 100);
  const decimals = String(absolute % 100).padStart(2, '0');
  const symbol = withSymbol ? `${currencySymbol(currency)}` : '';
  return `${negative ? '-' : ''}${symbol}${groupThousands(String(units))}.${decimals}`;
}

/** Compact money for charts, e.g. 1250000 -> "$12.5k". */
export function formatCompactMoney(cents: number, currency = 'MXN'): string {
  const value = Math.abs(cents) / 100;
  const symbol = currencySymbol(currency);
  const sign = cents < 0 ? '-' : '';
  if (value >= 1_000_000) return `${sign}${symbol}${trim(value / 1_000_000)}M`;
  if (value >= 1_000) return `${sign}${symbol}${trim(value / 1_000)}k`;
  return `${sign}${symbol}${Math.round(value)}`;
}

function trim(value: number): string {
  return value >= 10 ? String(Math.round(value)) : value.toFixed(1).replace(/\.0$/, '');
}

/**
 * Parses a user-typed amount into integer cents.
 * Accepts "1234.5", "1,234.50", "$1 234,50" and similar.
 */
export function parseMoney(input: string): number {
  const cleaned = input.trim().replace(/[^\d.,-]/g, '');
  if (!cleaned) return 0;

  const negative = cleaned.startsWith('-');
  const digits = cleaned.replace(/-/g, '');
  const lastComma = digits.lastIndexOf(',');
  const lastDot = digits.lastIndexOf('.');
  let normalized = digits;

  if (lastComma !== -1 && lastDot !== -1) {
    normalized =
      lastComma > lastDot
        ? digits.replace(/\./g, '').replace(',', '.')
        : digits.replace(/,/g, '');
  } else if (lastComma !== -1) {
    normalized = digits.replace(',', '.');
  }

  const value = Number(normalized);
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) * (negative ? -1 : 1);
}

/** Formats integer cents for an editable input, without symbol or thousands separators. */
export function centsToInput(cents: number): string {
  if (!cents) return '';
  return (cents / 100).toFixed(2).replace(/\.00$/, '');
}

export function parseQuantity(input: string): number {
  const value = Number(input.trim().replace(',', '.'));
  return Number.isFinite(value) ? value : 0;
}

export function formatQuantity(value: number): string {
  if (!Number.isFinite(value)) return '0';
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}
