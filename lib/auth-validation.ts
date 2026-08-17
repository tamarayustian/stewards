export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const VALID_COUNTRY_CODES = new Set([
  '+852', '+1', '+86', '+886', '+44', '+81', '+82', '+65', '+61', '+49', '+33',
]);

export function validateEmail(email: string): string | undefined {
  if (!EMAIL_RE.test(email)) {
    return 'Please enter a valid email address.';
  }
  return undefined;
}

export function validatePassword(password: string): string | undefined {
  if (password.length < 6) {
    return 'Password must be at least 6 characters.';
  }
  return undefined;
}

export function validatePhone(
  countryCode: string,
  phone: string,
): { fullPhone: string } | { error: string } {
  if (!phone?.trim()) {
    return { error: 'Phone number is required.' };
  }

  if (!VALID_COUNTRY_CODES.has(countryCode)) {
    return { error: 'Invalid country code.' };
  }

  if (/[^\d\s]/.test(phone)) {
    return { error: 'Phone number must contain only digits.' };
  }

  const digits = phone.replace(/\D/g, '');

  if (digits.length < 7 || digits.length > 15) {
    return { error: 'Phone number must be 7-15 digits.' };
  }

  return { fullPhone: (countryCode ?? '') + digits };
}
