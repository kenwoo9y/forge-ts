import { ErrorCode } from 'error';
import { describe, expect, it } from 'vitest';
import { app } from '../src/app.js';

describe('User API (integration)', () => {
  describe('POST /users', () => {
    it('ユーザーを作成すると201を返し、DBに保存される', async () => {
      const res = await app.request('/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'alice', password: 'password123' }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body).toEqual({
        username: 'alice',
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });
    });

    it('ユーザー名が重複する場合：409を返す', async () => {
      await app.request('/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'alice', password: 'password123' }),
      });

      const res = await app.request('/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'alice', password: 'password123' }),
      });

      expect(res.status).toBe(409);
      const body = await res.json();
      expect(body.code).toBe(ErrorCode.USERNAME_DUPLICATE);
    });
  });

  describe('GET /users/:username', () => {
    it('ユーザーが存在する場合：200を返す', async () => {
      await app.request('/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'alice', password: 'password123' }),
      });

      const res = await app.request('/users/alice');

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.username).toBe('alice');
    });

    it('ユーザーが存在しない場合：404を返す', async () => {
      const res = await app.request('/users/nobody');

      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.code).toBe(ErrorCode.USER_NOT_FOUND);
    });
  });
});
