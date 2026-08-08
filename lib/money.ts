import type { Prisma } from '@/lib/generated/prisma/client';

export function formatMoney(amount: Prisma.Decimal, currency = 'HKD') {
  return new Intl.NumberFormat('en-HK', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount));
}
