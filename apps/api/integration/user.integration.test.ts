import { ErrorCode } from 'error';
import { describe, expect, it } from 'vitest';
import { app } from '../src/app.js';

describe('User API (integration)', () => {
  describe('POST /users', () => {
    it('returns 201 and persists to the DB when creating a user', async () => {
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

    it('returns 409 when the username is a duplicate', async () => {
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
    it('returns 200 when the user exists', async () => {
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

    it('returns 404 when the user does not exist', async () => {
      const res = await app.request('/users/nobody');

      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.code).toBe(ErrorCode.USER_NOT_FOUND);
    });
  });
});
