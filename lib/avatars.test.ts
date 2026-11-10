import { describe, expect, it } from 'vitest';
import { AVATAR_COLORS, avatarColor, initials } from './avatars';

describe('avatars', () => {
  it('takes at most two initials', () => expect(initials('Tamara Yustian')).toBe('TY'));
  it('uppercases a single name', () => expect(initials('alex')).toBe('A'));
  it('falls back for an empty name', () => expect(initials('  ')).toBe('?'));
  it('picks a stable palette colour', () => {
    expect(AVATAR_COLORS).toContain(avatarColor('Alex'));
    expect(avatarColor('Alex')).toBe(avatarColor('Alex'));
  });
});
