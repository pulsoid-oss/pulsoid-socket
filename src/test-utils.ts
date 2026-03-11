import { vi } from 'vitest';

export const flushPromises = async () => {
  for (let i = 0; i < 10; i++) await Promise.resolve();
};

export const mockFetchSuccess = (scopes: string[] = []) => {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ scopes }),
  });
};

export const mockFetchError = (
  errorCode: number,
  errorMessage: string,
  status = 403
) => {
  global.fetch = vi.fn().mockResolvedValue({
    ok: false,
    status,
    json: () =>
      Promise.resolve({ error_code: errorCode, error_message: errorMessage }),
  });
};

export const mockFetchNetworkError = () => {
  global.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
};
