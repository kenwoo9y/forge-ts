import { describe, expect, it, vi } from 'vitest';
import { signToken, verifyToken } from './jwt.js';

describe('signToken / verifyToken', () => {
  it('restores the original payload when verifying a signed token with the same secret', async () => {
    const token = await signToken({ username: 'alice' }, 'secret');

    const payload = await verifyToken(token, 'secret');

    expect(payload.username).toBe('alice');
  });

  it('throws an error when verifying with a different secret', async () => {
    const token = await signToken({ username: 'alice' }, 'secret');

    await expect(verifyToken(token, 'wrong-secret')).rejects.toThrow();
  });

  it('throws an error when verifying an expired token', async () => {
    vi.useFakeTimers();
    const token = await signToken({ username: 'alice' }, 'secret', '1s');
    vi.advanceTimersByTime(2000);

    await expect(verifyToken(token, 'secret')).rejects.toThrow();
    vi.useRealTimers();
  });

  it('throws an error when verifying a malformed string', async () => {
    await expect(verifyToken('not-a-jwt', 'secret')).rejects.toThrow();
  });
});
