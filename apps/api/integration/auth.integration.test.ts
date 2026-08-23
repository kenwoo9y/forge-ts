import { ErrorCode } from 'error';
import { describe, expect, it } from 'vitest';
import { app } from '../src/app.js';
import { testPrisma } from './testClient.js';

describe('Auth API (integration)', () => {
  describe('POST /users → POST /auth/signin', () => {
    it('サインアップしたユーザーでサインインするとJWTが発行される', async () => {
      const username = 'alice';
      const password = 'password123';

      const signUpRes = await app.request('/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      expect(signUpRes.status).toBe(201);

      const record = await testPrisma.user.findUnique({ where: { username } });
      expect(record?.passwordHash).not.toBeNull();
      expect(record?.passwordHash).not.toBe(password);

      const signInRes = await app.request('/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      expect(signInRes.status).toBe(200);
      const body = await signInRes.json();
      expect(body.username).toBe(username);
      expect(typeof body.token).toBe('string');
      expect(body.token.split('.')).toHaveLength(3);
    });

    it('パスワードが間違っている場合：401を返す', async () => {
      await app.request('/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'alice', password: 'password123' }),
      });

      const res = await app.request('/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'alice', password: 'wrong-password' }),
      });

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.code).toBe(ErrorCode.INVALID_CREDENTIALS);
    });

    it('存在しないユーザーの場合：401を返す', async () => {
      const res = await app.request('/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'nobody', password: 'password123' }),
      });

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.code).toBe(ErrorCode.INVALID_CREDENTIALS);
    });
  });
});
