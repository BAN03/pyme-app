const MONTHS = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

const MONTHS_SHORT = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
];

/** Local date (not UTC) formatted as YYYY-MM-DD. */
export function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

/** Parses YYYY-MM-DD as a local date (avoids the UTC shift of new Date('YYYY-MM-DD')). */
export function parseISODate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return new Date();
  return new Date(year, month - 1, day);
}

export function currentMonthKey(): string {
  return todayISO().slice(0, 7);
}

export function monthKeyOf(isoDate: string): string {
  return isoDate.slice(0, 7);
}

export function monthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  if (!year || !month) return monthKey;
  return `${MONTHS[month - 1]} ${year}`;
}

export function monthLabelShort(monthKey: string): string {
  const [, month] = monthKey.split('-').map(Number);
  if (!month) return monthKey;
  return MONTHS_SHORT[month - 1];
}

export function addMonths(monthKey: string, delta: number): string {
  const [year, month] = monthKey.split('-').map(Number);
  const date = new Date(year, month - 1 + delta, 1);
  return toISODate(date).slice(0, 7);
}

/** Inclusive first and last day of the month. */
export function monthRange(monthKey: string): { from: string; to: string } {
  const [year, month] = monthKey.split('-').map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  return {
    from: `${monthKey}-01`,
    to: `${monthKey}-${String(lastDay).padStart(2, '0')}`,
  };
}

/** Last N month keys, oldest first, ending at `endMonth`. */
export function lastMonths(endMonth: string, count: number): string[] {
  return Array.from({ length: count }, (_, index) => addMonths(endMonth, index - (count - 1)));
}

export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  if (!year || !month || !day) return isoDate;
  return `${day} ${MONTHS_SHORT[month - 1]} ${year}`;
}

export function formatDateShort(isoDate: string): string {
  const [, month, day] = isoDate.split('-').map(Number);
  if (!month || !day) return isoDate;
  return `${day} ${MONTHS_SHORT[month - 1]}`;
}

export function relativeDayLabel(isoDate: string): string | null {
  const today = todayISO();
  if (isoDate === today) return 'Hoy';
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (isoDate === toISODate(yesterday)) return 'Ayer';
  return null;
}
