import { Prisma } from '@/lib/generated/prisma/client';

/**
 * Converts an amount stored in an expense's currency to the viewer's home
 * currency using the rate snapshot taken when the expense was created.
 * Same-currency rows and legacy rows without a rate keep the amount as-is.
 */
export function toViewerCurrency(
  amount: Prisma.Decimal,
  expenseCurrency: string,
  rate: string | null,
  viewerCurrency: string,
): Prisma.Decimal {
  if (expenseCurrency === viewerCurrency) return amount;
  return amount.mul(new Prisma.Decimal(rate ?? '1'));
}
