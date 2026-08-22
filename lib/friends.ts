export interface FriendInput {
  name: string;
  email?: string;
  phone?: string;
}

export function buildAddFriendFormData(input: FriendInput): FormData {
  const fd = new FormData();
  fd.set('name', input.name);
  if (input.email?.trim()) fd.set('email', input.email.trim());
  if (input.phone?.trim()) fd.set('phone', input.phone.trim());
  return fd;
}

export function buildInviteUrl(name: string, email: string, base: string): URL {
  const url = new URL('/register', base);
  if (email.trim()) url.searchParams.set('email', email.trim());
  if (name.trim()) url.searchParams.set('name', name.trim());
  return url;
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
