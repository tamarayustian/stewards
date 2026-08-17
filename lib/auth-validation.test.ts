import { describe, expect, it } from 'vitest';
import { validatePhone } from '@/lib/auth-validation';

describe('validatePhone', () => {
  it('returns full E.164 phone for valid input', () => {
    const result = validatePhone('+852', '91234567');
    expect(result).toEqual({ fullPhone: '+85291234567' });
  });

  it('strips spaces from phone input', () => {
    const result = validatePhone('+852', '9123 4567');
    expect(result).toEqual({ fullPhone: '+85291234567' });
  });

  it('rejects empty phone', () => {
    const result = validatePhone('+852', '');
    expect(result).toEqual({ error: 'Phone number is required.' });
  });

  it('rejects phone too short', () => {
    const result = validatePhone('+852', '123');
    expect(result).toEqual({ error: 'Phone number must be 7-15 digits.' });
  });

  it('rejects phone too long', () => {
    const result = validatePhone('+1', '1234567890123456');
    expect(result).toEqual({ error: 'Phone number must be 7-15 digits.' });
  });

  it('rejects non-numeric input', () => {
    const result = validatePhone('+852', 'abc12345');
    expect(result).toEqual({ error: 'Phone number must contain only digits.' });
  });

  it('handles null phone gracefully', () => {
    // @ts-expect-error testing null guard
    const result = validatePhone('+852', null);
    expect(result).toEqual({ error: 'Phone number is required.' });
  });

  it('handles undefined phone gracefully', () => {
    // @ts-expect-error testing null guard
    const result = validatePhone('+852', undefined);
    expect(result).toEqual({ error: 'Phone number is required.' });
  });

  it('rejects invalid country code', () => {
    const result = validatePhone('+000', '91234567');
    expect(result).toEqual({ error: 'Invalid country code.' });
  });
});
