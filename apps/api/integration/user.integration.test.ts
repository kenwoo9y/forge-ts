import { ErrorCode } from 'error';
import { describe, expect, it } from 'vitest';
import { app } from '../src/app.js';
import { signUpAndSignIn } from './testAuth.js';

describe('User API (integration)', () => {
  describe('POST /users', () => {
    it('ユーザーを作成すると201を返し、DBに保存される', async () => {
      const res = await app.request('/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'alice',
          email: 'alice@example.com',
          password: 'password123',
        }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body).toEqual({
        username: 'alice',
        email: 'alice@example.com',
        firstName: null,
        lastName: null,
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

    it('メールアドレスが重複する場合：409を返す', async () => {
      await app.request('/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'alice',
          email: 'shared@example.com',
          password: 'password123',
        }),
      });

      const res = await app.request('/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'bob',
          email: 'shared@example.com',
          password: 'password123',
        }),
      });

      expect(res.status).toBe(409);
      const body = await res.json();
      expect(body.code).toBe(ErrorCode.EMAIL_DUPLICATE);
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

  describe('PATCH /users/:username', () => {
    it('ユーザーが存在する場合：更新後の情報を返し、DBにも反映される', async () => {
      await app.request('/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'alice', password: 'password123' }),
      });

      const res = await app.request('/users/alice', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName: 'Alice' }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.firstName).toBe('Alice');

      const getRes = await app.request('/users/alice');
      const getBody = await getRes.json();
      expect(getBody.firstName).toBe('Alice');
    });

    it('存在しないユーザーの場合：404を返す', async () => {
      const res = await app.request('/users/nobody', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName: 'x' }),
      });

      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.code).toBe(ErrorCode.USER_NOT_FOUND);
    });
  });

  describe('DELETE /users/:username', () => {
    it('ユーザーが存在する場合：204を返し、DBから削除される', async () => {
      await app.request('/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'alice', password: 'password123' }),
      });

      const res = await app.request('/users/alice', { method: 'DELETE' });
      expect(res.status).toBe(204);

      const getRes = await app.request('/users/alice');
      expect(getRes.status).toBe(404);
    });

    it('存在しないユーザーの場合：404を返す', async () => {
      const res = await app.request('/users/nobody', { method: 'DELETE' });

      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.code).toBe(ErrorCode.USER_NOT_FOUND);
    });
  });

  describe('GET/POST /users/:username/tasks（JWT保護）', () => {
    it('トークンなしでアクセスすると401を返す', async () => {
      await app.request('/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'alice', password: 'password123' }),
      });

      const res = await app.request('/users/alice/tasks');

      expect(res.status).toBe(401);
    });

    it('有効なトークンでタスクを作成し、一覧取得できる', async () => {
      const token = await signUpAndSignIn(app, 'alice');
      const authHeaders = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      const createRes = await app.request('/users/alice/tasks', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ title: 'Buy milk', status: 'todo' }),
      });
      expect(createRes.status).toBe(201);
      const created = await createRes.json();
      expect(created.title).toBe('Buy milk');
      expect(created.publicId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
      );

      const listRes = await app.request('/users/alice/tasks', { headers: authHeaders });
      expect(listRes.status).toBe(200);
      const list = await listRes.json();
      expect(list).toHaveLength(1);
      expect(list[0].publicId).toBe(created.publicId);
    });

    it('存在しないユーザーの場合：404を返す', async () => {
      const token = await signUpAndSignIn(app, 'alice');

      const res = await app.request('/users/nobody/tasks', {
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.code).toBe(ErrorCode.USER_NOT_FOUND);
    });
  });
});
