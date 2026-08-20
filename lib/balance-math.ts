import type { Prisma } from '@/lib/generated/prisma/client';
import { Prisma as PrismaValue } from '@/lib/generated/prisma/browser';
import { CURRENCIES, type Currency } from '@/lib/currencies';
import { formatMoney } from '@/lib/money';

export type Direction = 'theyOweMe' | 'iOweThem';

export interface Counterparty {
  id: string;
  name: string;
  phone: string | null;
  isRegistered: boolean;
}

export interface ShareRow {
  splitId: string;
  date: Date;
  note: string | null;
  amount: Prisma.Decimal;
  currency: string;
  splitAmount: Prisma.Decimal;
  convertedAmount: Prisma.Decimal;
  party: Counterparty;
}

export interface PairSummary {
  counterparty: Counterparty;
  amountOwedToMe: Prisma.Decimal;
  amountIOwe: Prisma.Decimal;
  net: Prisma.Decimal;
  unsettledCount: number;
  iOweCount: number;
}

export interface PairItem {
  id: string;
  date: Date;
  note: string | null;
  amount: number;
  currency: string;
  myShare: number;
  theirShare: number;
  convertedAmount: number;
  direction: Direction;
}

export interface PairDetail {
  counterparty: Counterparty;
  items: PairItem[];
  amountOwedToMe: Prisma.Decimal;
  amountIOwe: Prisma.Decimal;
  net: Prisma.Decimal;
}

export function computePairSummaries(owedToMe: ShareRow[], iOwe: ShareRow[]): PairSummary[] {
  const byParty = new Map<string, PairSummary>();

  const upsert = (party: Counterparty): PairSummary => {
    let entry = byParty.get(party.id);
    if (!entry) {
      entry = {
        counterparty: party,
        amountOwedToMe: new PrismaValue.Decimal(0),
        amountIOwe: new PrismaValue.Decimal(0),
        net: new PrismaValue.Decimal(0),
        unsettledCount: 0,
        iOweCount: 0,
      };
      byParty.set(party.id, entry);
    }
    return entry;
  };

  for (const row of owedToMe) {
    const entry = upsert(row.party);
    entry.amountOwedToMe = entry.amountOwedToMe.plus(row.convertedAmount);
    entry.unsettledCount += 1;
  }
  for (const row of iOwe) {
    const entry = upsert(row.party);
    entry.amountIOwe = entry.amountIOwe.plus(row.convertedAmount);
    entry.iOweCount += 1;
  }

  const summaries = [...byParty.values()];
  for (const entry of summaries) {
    entry.net = entry.amountOwedToMe.minus(entry.amountIOwe);
  }
  return summaries;
}

export function buildPairDetail(
  counterparty: Counterparty,
  owedToMe: ShareRow[],
  iOwe: ShareRow[],
): PairDetail {
  const items: PairItem[] = [
    ...owedToMe.map((row) => ({
      id: row.splitId,
      date: row.date,
      note: row.note,
      amount: Number(row.amount),
      currency: row.currency,
      myShare: 0,
      theirShare: Number(row.splitAmount),
      convertedAmount: Number(row.convertedAmount),
      direction: 'theyOweMe' as const,
    })),
    ...iOwe.map((row) => ({
      id: row.splitId,
      date: row.date,
      note: row.note,
      amount: Number(row.amount),
      currency: row.currency,
      myShare: Number(row.splitAmount),
      theirShare: 0,
      convertedAmount: Number(row.convertedAmount),
      direction: 'iOweThem' as const,
    })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  const amountOwedToMe = owedToMe.reduce(
    (sum, row) => sum.plus(row.convertedAmount),
    new PrismaValue.Decimal(0),
  );
  const amountIOwe = iOwe.reduce(
    (sum, row) => sum.plus(row.convertedAmount),
    new PrismaValue.Decimal(0),
  );

  return {
    counterparty,
    items,
    amountOwedToMe,
    amountIOwe,
    net: amountOwedToMe.minus(amountIOwe),
  };
}

const dayFormatter = new Intl.DateTimeFormat('en-HK', { day: 'numeric', month: 'short' });

export function formatDay(date: Date) {
  return dayFormatter.format(date);
}

function formatRate(rate: number): string {
  if (rate < 0.01) return rate.toFixed(4);
  if (rate < 1) return rate.toFixed(3);
  return rate.toFixed(2);
}

export function buildWhatsAppDraft(
  name: string,
  items: PairItem[],
  origin: string,
  viewerCurrency: Currency = 'HKD',
) {
  const owedToMe = items.filter((item) => item.direction === 'theyOweMe');
  const total = owedToMe.reduce((sum, item) => sum + item.convertedAmount, 0);
  const count = owedToMe.length;
  const lines = owedToMe.map((item) => {
    const original = formatMoney(item.theirShare, item.currency);
    if (item.currency === viewerCurrency) {
      return `${formatDay(item.date)} · ${item.note ?? 'Expense'} · ${original}`;
    }
    const rate = item.convertedAmount / item.theirShare;
    const converted = formatMoney(item.convertedAmount, viewerCurrency);
    return `${formatDay(item.date)} · ${item.note ?? 'Expense'} · ${original} ≈ ${converted} (rate ${formatRate(rate)})`;
  });
  return [
    `${name} — you owe me ${formatMoney(total, viewerCurrency)} across ${count} ${count === 1 ? 'expense' : 'expenses'}`,
    ...lines,
    `Settle up in Stewards: ${origin}/balances`,
  ].join('\n');
}

export function waMeNumber(phone: string) {
  return phone.replace(/\D/g, '');
}
