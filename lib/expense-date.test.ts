import { describe, expect, it } from 'vitest';
import {
  expenseDateAgo,
  expenseDateKey,
  expenseDateMax,
  formatExpenseDate,
  formatExpenseDay,
  isFutureExpenseDate,
  localExpenseDateKey,
  parseExpenseDate,
} from './expense-date';

const at = (iso: string) => new Date(iso);

describe('expenseDateKey', () => {
  it('reads the UTC calendar date', () => {
    expect(expenseDateKey(at('2026-11-20T00:00:00.000Z'))).toBe('2026-11-20');
    expect(expenseDateKey(at('2026-11-20T23:59:59.000Z'))).toBe('2026-11-20');
  });
});

describe('localExpenseDateKey', () => {
  it('uses local calendar parts', () => {
    expect(localExpenseDateKey(new Date(2026, 10, 20, 23, 30))).toBe('2026-11-20');
  });
});

describe('parseExpenseDate', () => {
  it('parses a real date to UTC midnight', () => {
    expect(parseExpenseDate('2026-11-20')?.toISOString()).toBe('2026-11-20T00:00:00.000Z');
  });

  it('rejects malformed and impossible dates', () => {
    expect(parseExpenseDate('')).toBeNull();
    expect(parseExpenseDate('20/11/2026')).toBeNull();
    expect(parseExpenseDate('2026-02-30')).toBeNull();
  });
});

describe('formatExpenseDate', () => {
  it('formats in UTC so the stored day never shifts', () => {
    expect(formatExpenseDate(at('2026-11-20T00:00:00.000Z'))).toBe('20 Nov 2026');
    expect(formatExpenseDay(at('2026-11-20T00:00:00.000Z'))).toBe('20 Nov');
  });
});

describe('expenseDateAgo', () => {
  const now = new Date(2026, 10, 20, 12, 0);

  it('labels calendar days', () => {
    expect(expenseDateAgo(new Date('2026-11-20T00:00:00.000Z'), now)).toBe('Today');
    expect(expenseDateAgo(new Date('2026-11-19T00:00:00.000Z'), now)).toBe('Yesterday');
    expect(expenseDateAgo(new Date('2026-11-16T00:00:00.000Z'), now)).toBe('4d ago');
  });

  it('labels a date ahead of the viewer local day', () => {
    expect(expenseDateAgo(new Date('2026-11-21T00:00:00.000Z'), now)).toBe('Tomorrow');
  });
});

describe('expenseDateMax', () => {
  it('caps a new expense at the viewer local today', () => {
    expect(expenseDateMax('2026-11-20')).toBe('2026-11-20');
    expect(expenseDateMax('2026-11-20', '2026-11-19')).toBe('2026-11-20');
  });

  it('keeps an existing later date selectable when editing', () => {
    expect(expenseDateMax('2026-11-20', '2026-11-21')).toBe('2026-11-21');
  });

  it('falls back to the existing date before hydration supplies today', () => {
    expect(expenseDateMax('', '2026-11-21')).toBe('2026-11-21');
    expect(expenseDateMax('')).toBe('');
  });
});

describe('isFutureExpenseDate', () => {
  const now = at('2026-11-20T12:00:00.000Z');

  it('allows today and tomorrow UTC for timezone tolerance', () => {
    expect(isFutureExpenseDate('2026-11-20', now)).toBe(false);
    expect(isFutureExpenseDate('2026-11-21', now)).toBe(false);
  });

  it('rejects beyond tomorrow UTC', () => {
    expect(isFutureExpenseDate('2026-11-22', now)).toBe(true);
  });
});
