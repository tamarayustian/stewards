import { CURRENCIES } from '@/lib/currencies';
import { Select } from '@/components/ui/select';

export function CurrencySelect({
  className,
  variant = 'default',
  ...props
}: React.ComponentProps<'select'> & { variant?: 'default' | 'compact' }) {
  return (
    <Select {...props} variant={variant} className={className}>
      {Object.entries(CURRENCIES).map(([code, info]) => (
        <option key={code} value={code}>
          {info.symbol} — {info.name}
        </option>
      ))}
    </Select>
  );
}
