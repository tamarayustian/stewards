import { COUNTRIES } from '@/lib/countries';
import { Select } from '@/components/ui/select';

export function CountrySelect(props: React.ComponentProps<'select'>) {
  return (
    <Select {...props}>
      {COUNTRIES.map((c) => (
        <option key={`${c.code}-${c.label}`} value={c.code}>
          {c.label}
        </option>
      ))}
    </Select>
  );
}
