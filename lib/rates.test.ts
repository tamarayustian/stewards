import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchExchangeRate } from '@/lib/rates';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

afterEach(() => {
  mockFetch.mockReset();
});

describe('fetchExchangeRate', () => {
  it('returns rate 1 for same currency', async () => {
    const result = await fetchExchangeRate('HKD', 'HKD');
    expect(result).toEqual({ rate: 1 });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('parses rate from proxy response', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ rate: 0.055 }),
    });
    const result = await fetchExchangeRate('JPY', 'HKD');
    expect(result).toEqual({ rate: 0.055 });
    expect(mockFetch).toHaveBeenCalledWith('/api/rates?from=JPY&to=HKD', expect.anything());
  });

  it('returns error on HTTP failure', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 503 });
    const result = await fetchExchangeRate('JPY', 'HKD');
    expect(result).toHaveProperty('error');
  });

  it('returns error on network failure', async () => {
    mockFetch.mockRejectedValue(new Error('network'));
    const result = await fetchExchangeRate('JPY', 'HKD');
    expect(result).toHaveProperty('error');
    expect((result as { error: string }).error).toContain('exchange rate');
  });

  it('returns error on missing rate key', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ rates: {} }),
    });
    const result = await fetchExchangeRate('JPY', 'HKD');
    expect(result).toHaveProperty('error');
  });
});
