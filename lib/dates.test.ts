import { describe, expect, it } from 'vitest';
import { formatLedgerDate, formatMonthYear, timeAgo } from './dates';

const at = (iso: string) => new Date(iso);

describe('ledger dates', () => {
  it('formats a ledger date', () =>
    expect(formatLedgerDate(at('2026-11-03T12:00:00Z'))).toBe('03 Nov 2026'));
  it('formats a month heading', () =>
    expect(formatMonthYear(at('2026-11-03T12:00:00Z'))).toBe('November 2026'));
  it('describes recent time', () => {
    const now = at('2026-11-10T12:00:00Z');
    expect(timeAgo(at('2026-11-10T11:59:40Z'), now)).toBe('just now');
    expect(timeAgo(at('2026-11-10T11:55:00Z'), now)).toBe('5m ago');
    expect(timeAgo(at('2026-11-08T12:00:00Z'), now)).toBe('2d ago');
  });
});
