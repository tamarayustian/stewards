import { describe, expect, it } from 'vitest';

import { validatePhone } from '@/lib/auth-validation';
import { COUNTRIES, DEFAULT_COUNTRY_CODE } from '@/lib/countries';

describe('COUNTRIES', () => {
  it('defaults to Hong Kong, listed first', () => {
    expect(DEFAULT_COUNTRY_CODE).toBe('+852');
    expect(COUNTRIES[0]).toEqual({ code: '+852', label: 'HK +852' });
  });

  // THE invariant this whole refactor exists for: whatever appears in the
  // dropdown is accepted server-side by validatePhone, forever.
  it('every listed code passes validatePhone — dropdown and server cannot drift', () => {
    for (const { code } of COUNTRIES) {
      expect(validatePhone(code, '91234567')).toEqual({ fullPhone: `${code}91234567` });
    }
  });

  it('labels are unique so select options are distinguishable/keyable', () => {
    const labels = COUNTRIES.map((c) => c.label);
    expect(new Set(labels).size).toBe(labels.length);
  });
});
