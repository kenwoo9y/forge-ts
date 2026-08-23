import { describe, expect, it, vi } from 'vitest';
import { signToken, verifyToken } from './jwt.js';

describe('signToken / verifyToken', () => {
  it('署名したトークンを同じシークレットで検証すると、元のペイロードが復元できる', async () => {
    const token = await signToken({ username: 'alice' }, 'secret');

    const payload = await verifyToken(token, 'secret');

    expect(payload.username).toBe('alice');
  });

  it('異なるシークレットで検証すると、エラーがスローされる', async () => {
    const token = await signToken({ username: 'alice' }, 'secret');

    await expect(verifyToken(token, 'wrong-secret')).rejects.toThrow();
  });

  it('期限切れのトークンを検証すると、エラーがスローされる', async () => {
    vi.useFakeTimers();
    const token = await signToken({ username: 'alice' }, 'secret', '1s');
    vi.advanceTimersByTime(2000);

    await expect(verifyToken(token, 'secret')).rejects.toThrow();
    vi.useRealTimers();
  });

  it('不正な形式の文字列を検証すると、エラーがスローされる', async () => {
    await expect(verifyToken('not-a-jwt', 'secret')).rejects.toThrow();
  });
});
