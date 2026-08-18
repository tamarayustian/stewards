import { type Currency } from '@/lib/currencies';

export async function fetchExchangeRate(
  from: Currency,
  to: Currency,
): Promise<{ rate: number } | { error: string }> {
  if (from === to) {
    return { rate: 1 };
  }

  try {
    const res = await fetch(`/api/rates?from=${from}&to=${to}`, {
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      return { error: `Exchange rate API returned ${res.status}.` };
    }

    const data = await res.json();
    const rate = data.rate;

    if (typeof rate !== 'number' || rate <= 0) {
      return { error: `Unexpected rate response for ${to}.` };
    }

    return { rate };
  } catch {
    return { error: 'Could not fetch exchange rate. Please try again.' };
  }
}
