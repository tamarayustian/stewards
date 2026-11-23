const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const DAY_MS = 24 * 60 * 60 * 1000;

const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/** `YYYY-MM-DD` for the UTC calendar day of `date`. */
export function expenseDateKey(date: Date): string {
  const year = String(date.getUTCFullYear()).padStart(4, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** `YYYY-MM-DD` for the local calendar day of `now`. */
export function localExpenseDateKey(now: Date = new Date()): string {
  const year = String(now.getFullYear()).padStart(4, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parses a `YYYY-MM-DD` key to UTC midnight. Returns null for malformed or
 * impossible dates (`2026-02-30`, `20/11/2026`, ...).
 */
export function parseExpenseDate(value: string): Date | null {
  const match = DATE_KEY_PATTERN.exec(value);
  if (!match) return null;

  const [, year, month, day] = match;
  const parsed = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (Number.isNaN(parsed.getTime())) return null;
  if (expenseDateKey(parsed) !== value) return null;

  return parsed;
}

/** `20 Nov 2026` for the UTC calendar day of `date`. */
export function formatExpenseDate(date: Date): string {
  return `${formatExpenseDay(date)} ${date.getUTCFullYear()}`;
}

/** `20 Nov` for the UTC calendar day of `date`. */
export function formatExpenseDay(date: Date): string {
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${day} ${MONTHS[date.getUTCMonth()]}`;
}

/**
 * Upper bound for the date input. New expenses cap at the viewer's local today;
 * editing keeps an existing later date selectable so an unrelated edit does not
 * trip the native range check.
 */
export function expenseDateMax(today: string, existing?: string | null): string {
  if (!today) return existing ?? '';
  return existing && existing > today ? existing : today;
}

/**
 * Relative label for an expense date, measured against the viewer's local day:
 * `Today`, `Yesterday`, `Tomorrow`, `4d ago`, `in 2d`.
 */
export function expenseDateAgo(date: Date, now: Date = new Date()): string {
  const days = Math.round(
    (Date.parse(expenseDateKey(date)) - Date.parse(localExpenseDateKey(now))) / DAY_MS,
  );

  if (days === 0) return 'Today';
  if (days === -1) return 'Yesterday';
  if (days === 1) return 'Tomorrow';
  return days < 0 ? `${Math.abs(days)}d ago` : `in ${days}d`;
}

/**
 * True when `value` is a date beyond tomorrow (UTC). Today and tomorrow are
 * allowed so a viewer in a nearby timezone can still record an expense.
 */
export function isFutureExpenseDate(value: string, now: Date = new Date()): boolean {
  const tomorrow = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
  );
  return value > expenseDateKey(tomorrow);
}
