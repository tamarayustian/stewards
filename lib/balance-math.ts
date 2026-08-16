import type { Prisma } from '@/lib/generated/prisma/client';
import { Prisma as PrismaValue } from '@/lib/generated/prisma/browser';
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
  amount: Prisma.Decimal;
  currency: string;
  myShare: Prisma.Decimal;
  theirShare: Prisma.Decimal;
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
    entry.amountOwedToMe = entry.amountOwedToMe.plus(row.splitAmount);
    entry.unsettledCount += 1;
  }
  for (const row of iOwe) {
    const entry = upsert(row.party);
    entry.amountIOwe = entry.amountIOwe.plus(row.splitAmount);
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
      amount: row.amount,
      currency: row.currency,
      myShare: new PrismaValue.Decimal(0),
      theirShare: row.splitAmount,
      direction: 'theyOweMe' as const,
    })),
    ...iOwe.map((row) => ({
      id: row.splitId,
      date: row.date,
      note: row.note,
      amount: row.amount,
      currency: row.currency,
      myShare: row.splitAmount,
      theirShare: new PrismaValue.Decimal(0),
      direction: 'iOweThem' as const,
    })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  const amountOwedToMe = owedToMe.reduce(
    (sum, row) => sum.plus(row.splitAmount),
    new PrismaValue.Decimal(0),
  );
  const amountIOwe = iOwe.reduce(
    (sum, row) => sum.plus(row.splitAmount),
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

export function buildWhatsAppDraft(name: string, items: PairItem[], origin: string) {
  const owedToMe = items.filter((item) => item.direction === 'theyOweMe');
  const total = owedToMe.reduce(
    (sum, item) => sum.plus(item.theirShare),
    new PrismaValue.Decimal(0),
  );
  const count = owedToMe.length;
  const lines = owedToMe.map(
    (item) =>
      `${formatDay(item.date)} · ${item.note ?? 'Expense'} · ${formatMoney(item.theirShare, item.currency)}`,
  );
  return [
    `${name} — you owe me ${formatMoney(total)} across ${count} ${count === 1 ? 'expense' : 'expenses'}`,
    ...lines,
    `Settle up in Stewards: ${origin}/balances`,
  ].join('\n');
}

export function waMeNumber(phone: string) {
  return phone.replace(/\D/g, '');
}
