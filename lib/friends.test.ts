import { describe, expect, it } from 'vitest';
import { buildAddFriendFormData, buildInviteUrl } from './friends';

const BASE = 'https://stewards.app/dashboard';

describe('buildAddFriendFormData', () => {
  it('always sets name', () => {
    const fd = buildAddFriendFormData({ name: 'Amy' });
    expect(fd.get('name')).toBe('Amy');
    expect(fd.get('email')).toBeNull();
    expect(fd.get('phone')).toBeNull();
  });

  it('omits missing optional fields', () => {
    const fd = buildAddFriendFormData({
      name: 'Amy',
      email: 'amy@example.com',
      phone: '+852 9123 4567',
    });
    expect(fd.get('name')).toBe('Amy');
    expect(fd.get('email')).toBe('amy@example.com');
    expect(fd.get('phone')).toBe('+852 9123 4567');
  });

  it('omits blank optional fields and trims kept values', () => {
    const fd = buildAddFriendFormData({ name: ' Amy ', email: '   ', phone: ' +852 9123 4567 ' });
    expect(fd.get('name')).toBe(' Amy ');
    expect(fd.get('email')).toBeNull();
    expect(fd.get('phone')).toBe('+852 9123 4567');
  });
});

describe('buildInviteUrl', () => {
  it('joins /register on the given base with trimmed email then name params', () => {
    const url = buildInviteUrl(' Amy Tan ', ' amy@example.com ', BASE);
    expect(url.origin).toBe('https://stewards.app');
    expect(url.pathname).toBe('/register');
    expect(url.searchParams.get('email')).toBe('amy@example.com');
    expect(url.searchParams.get('name')).toBe('Amy Tan');
  });

  it('omits params for blank inputs', () => {
    const url = buildInviteUrl('   ', '', BASE);
    expect(url.searchParams.get('email')).toBeNull();
    expect(url.searchParams.get('name')).toBeNull();
  });
});
