export const AVATAR_COLORS = [
  '#1e2bd6',
  '#5e6b4f',
  '#2f3a8f',
  '#8a6a4f',
  '#6b5b8a',
  '#4f6b6a',
  '#8a4f5f',
  '#12131a',
] as const;

export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  return words
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
}

export function avatarColor(seed: string): string {
  let sum = 0;
  for (let i = 0; i < seed.length; i += 1) sum += seed.charCodeAt(i);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}
