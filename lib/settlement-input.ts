import { type Currency, validateCurrency } from '@/lib/currencies';

/**
 * Settlement form validation.
 *
 * Client-safe by construction: no Prisma runtime import. Money crosses this
 * boundary as integer minor units (`amountCents`) and is converted to the DB's
 * `Decimal(12,2)` exactly once, inside the server action.
 */

export type SettlementInput = {
  toId: string;
  amountCents: number;
  currency: Currency;
  occurredAt: Date;
  note: string | null;
  splitId: string | null;
  requestId: string | null;
};

export type SettlementEditInput = {
  amountCents: number;
  occurredAt: Date;
  note: string | null;
};

const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const AMOUNT_RE = /^(\d{1,10})(?:\.(\d{1,2}))?$/;

function field(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Major units as a string to integer minor units, without floating point.
 * Returns `null` for anything that is not a plain non-negative amount with at
 * most two decimals (no separators, currency symbols, or exponent notation).
 */
function parseAmountCents(raw: string): number | null {
  const match = AMOUNT_RE.exec(raw);
  if (!match) return null;

  const [, whole, fraction = ''] = match;
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
}

/**
 * `YYYY-MM-DD` is read as local midnight so a date-only form field does not
 * shift a day in negative UTC offsets. Other parseable timestamps pass through.
 * Impossible dates (`2026-02-30`) are rejected rather than rolled over.
 */
function parseOccurredAt(raw: string): Date | null {
  const dateOnly = DATE_ONLY_RE.exec(raw);
  if (dateOnly) {
    const year = Number(dateOnly[1]);
    const month = Number(dateOnly[2]);
    const day = Number(dateOnly[3]);
    const date = new Date(year, month - 1, day);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
      return null;
    }
    return date;
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Validation for recording a payment the viewer made to someone else. */
export function validateSettlementInput(
  formData: FormData,
  viewerId: string,
): SettlementInput | { error: string } {
  const toId = field(formData, 'toId');
  if (!toId) return { error: 'Choose who you paid.' };
  if (toId === viewerId) return { error: 'You cannot pay yourself.' };

  const amountCents = parseAmountCents(field(formData, 'amount'));
  if (amountCents === null) return { error: 'Enter a valid amount.' };
  if (amountCents <= 0) return { error: 'Enter an amount greater than zero.' };

  const currency = validateCurrency((field(formData, 'currency') || 'HKD').toUpperCase());
  if (!currency) return { error: 'Unsupported currency.' };

  const rawOccurredAt = field(formData, 'occurredAt');
  const occurredAt = rawOccurredAt ? parseOccurredAt(rawOccurredAt) : new Date();
  if (!occurredAt) return { error: 'Enter a valid date.' };

  return {
    toId,
    amountCents,
    currency,
    occurredAt,
    note: field(formData, 'note') || null,
    splitId: field(formData, 'splitId') || null,
    requestId: field(formData, 'requestId') || null,
  };
}

/**
 * Validation for the editable part of a settlement. The parties and currency
 * are immutable, so they are not read here; the action rejects attempts to
 * change them.
 */
export function validateSettlementEditInput(
  formData: FormData,
): SettlementEditInput | { error: string } {
  const amountCents = parseAmountCents(field(formData, 'amount'));
  if (amountCents === null) return { error: 'Enter a valid amount.' };
  if (amountCents <= 0) return { error: 'Enter an amount greater than zero.' };

  const rawOccurredAt = field(formData, 'occurredAt');
  const occurredAt = rawOccurredAt ? parseOccurredAt(rawOccurredAt) : null;
  if (!occurredAt) return { error: 'Enter a valid date.' };

  return { amountCents, occurredAt, note: field(formData, 'note') || null };
}
