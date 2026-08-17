export const CURRENCIES = {
  HKD: { name: 'Hong Kong Dollar', symbol: 'HK$', decimals: 2 },
  USD: { name: 'US Dollar', symbol: 'US$', decimals: 2 },
  CNY: { name: 'Chinese Yuan', symbol: '¥', decimals: 2 },
  JPY: { name: 'Japanese Yen', symbol: '¥', decimals: 0 },
  TWD: { name: 'Taiwan Dollar', symbol: 'NT$', decimals: 2 },
  GBP: { name: 'British Pound', symbol: '£', decimals: 2 },
  EUR: { name: 'Euro', symbol: '€', decimals: 2 },
  SGD: { name: 'Singapore Dollar', symbol: 'S$', decimals: 2 },
  AUD: { name: 'Australian Dollar', symbol: 'A$', decimals: 2 },
  KRW: { name: 'South Korean Won', symbol: '₩', decimals: 0 },
  IDR: { name: 'Indonesian Rupiah', symbol: 'Rp', decimals: 0 },
  PHP: { name: 'Philippine Peso', symbol: '₱', decimals: 2 },
} as const;

export type Currency = keyof typeof CURRENCIES;

export function validateCurrency(code: string): Currency | null {
  return code in CURRENCIES ? (code as Currency) : null;
}
