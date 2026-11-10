import type { Prisma } from '@/lib/generated/prisma/client';
import { moneyParts } from '@/lib/money';
import { cn } from '@/lib/utils';

export function Money({
  amount,
  currency = 'HKD',
  className,
  symbolClassName,
}: {
  amount: Prisma.Decimal | number;
  currency?: string;
  className?: string;
  symbolClassName?: string;
}) {
  const { symbol, value } = moneyParts(amount, currency);
  return (
    <span className={cn('num whitespace-nowrap', className)}>
      <span className={cn(symbolClassName)}>{symbol}</span>
      {value}
    </span>
  );
}
