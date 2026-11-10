import type { Prisma } from '@/lib/generated/prisma/client';
import { CURRENCIES, validateCurrency } from '@/lib/currencies';

export function moneyParts(
  amount: Prisma.Decimal | number,
  currency = 'HKD',
): { symbol: string; value: string } {
  const code = validateCurrency(currency) ?? 'HKD';
  const meta = CURRENCIES[code];
  return {
    symbol: meta.symbol,
    value: Number(amount).toLocaleString('en-HK', {
      minimumFractionDigits: meta.decimals,
      maximumFractionDigits: meta.decimals,
    }),
  };
}

export function formatMoney(amount: Prisma.Decimal | number, currency = 'HKD') {
  const code = validateCurrency(currency) ?? 'HKD';
  const { decimals } = CURRENCIES[code];
  return new Intl.NumberFormat('en-HK', {
    style: 'currency',
    currency: code,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Number(amount));
}
