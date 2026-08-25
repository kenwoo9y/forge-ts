import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from './api-client';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function mockResponse(options: { ok: boolean; status?: number; json?: () => Promise<unknown> }) {
  return {
    ok: options.ok,
    status: options.status ?? (options.ok ? 200 : 400),
    json: options.json ?? vi.fn().mockResolvedValue({}),
  };
}

describe('api.get', () => {
  beforeEach(() => {
    mockFetch.mockResolvedValue(mockResponse({ ok: true, json: () => Promise.resolve({ id: 1 }) }));
  });

  it('sends a GET request to the correct URL', async () => {
    await api.get('/users');
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/users',
      expect.objectContaining({ method: 'GET' })
    );
  });

  it('attaches a Content-Type: application/json header', async () => {
    await api.get('/users');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      })
    );
  });

  it('attaches extra headers to the request', async () => {
    await api.get('/users', { headers: { Authorization: 'Bearer token' } });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer token' }),
      })
    );
  });

  it('returns the response JSON', async () => {
    const result = await api.get('/users');
    expect(result).toEqual({ id: 1 });
  });
});

describe('api.post', () => {
  beforeEach(() => {
    mockFetch.mockResolvedValue(mockResponse({ ok: true, json: () => Promise.resolve({ id: 1 }) }));
  });

  it('sends a POST request with a JSON body', async () => {
    await api.post('/users', { name: 'test' });
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/users',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ name: 'test' }) })
    );
  });

  it('when body is undefined: sends without a body', async () => {
    await api.post('/users');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ body: undefined })
    );
  });
});

describe('api.patch', () => {
  beforeEach(() => {
    mockFetch.mockResolvedValue(mockResponse({ ok: true, json: () => Promise.resolve({ id: 1 }) }));
  });

  it('sends a PATCH request with a JSON body', async () => {
    await api.patch('/users/1', { name: 'updated' });
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/users/1',
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ name: 'updated' }) })
    );
  });
});

describe('api.delete', () => {
  beforeEach(() => {
    mockFetch.mockResolvedValue(mockResponse({ ok: true, status: 204 }));
  });

  it('sends a DELETE request to the correct URL', async () => {
    await api.delete('/users/1');
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/users/1',
      expect.objectContaining({ method: 'DELETE' })
    );
  });

  it('when the response is 204: returns undefined', async () => {
    const result = await api.delete('/users/1');
    expect(result).toBeUndefined();
  });
});

describe('error handling', () => {
  it.each([
    ['INVALID_CREDENTIALS', 'Incorrect username or password'],
    ['USERNAME_REQUIRED', 'Username is required'],
    ['USERNAME_DUPLICATE', 'This username is already taken'],
    ['USER_NOT_FOUND', 'User not found'],
    ['INTERNAL_SERVER_ERROR', 'An unexpected error occurred'],
  ])('when the error code is "%s": throws "%s"', async (code, message) => {
    mockFetch.mockResolvedValue(mockResponse({ ok: false, json: () => Promise.resolve({ code }) }));
    await expect(api.get('/test')).rejects.toThrow(message);
  });

  it('when the error code is unknown: throws the default message', async () => {
    mockFetch.mockResolvedValue(
      mockResponse({ ok: false, json: () => Promise.resolve({ code: 'UNKNOWN_CODE' }) })
    );
    await expect(api.get('/test')).rejects.toThrow('An unexpected error occurred');
  });

  it('when parsing the response JSON fails: throws the default message', async () => {
    mockFetch.mockResolvedValue(
      mockResponse({ ok: false, json: () => Promise.reject(new Error('invalid json')) })
    );
    await expect(api.get('/test')).rejects.toThrow('An unexpected error occurred');
  });
});
