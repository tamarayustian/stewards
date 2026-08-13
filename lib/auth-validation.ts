export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
