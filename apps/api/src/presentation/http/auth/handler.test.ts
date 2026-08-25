import { OpenAPIHono } from '@hono/zod-openapi';
import { hashSync } from 'bcryptjs';
import { ErrorCode } from 'error';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SignInUseCase } from '../../../application/auth/signInUseCase.js';
import { User } from '../../../domain/user/entity.js';
import type { IUserRepository } from '../../../domain/user/repository.js';
import { Username } from '../../../domain/user/value/username.js';
import { createAuthRoutes } from './routes.js';

const JWT_SECRET = 'test-secret';
const now = new Date('2025-01-01T00:00:00.000Z');

const mockUserRepository: IUserRepository = {
  save: vi.fn(),
  findByUsername: vi.fn(),
};

function createApp() {
  const app = new OpenAPIHono();
  app.route(
    '/',
    createAuthRoutes({
      signInUseCase: new SignInUseCase(mockUserRepository, JWT_SECRET),
    })
  );
  return app;
}

describe('Auth Endpoints', () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    vi.resetAllMocks();
    app = createApp();
  });

  describe('POST /auth/signin', () => {
    it('returns 200 with token and username when credentials are correct', async () => {
      const passwordHash = hashSync('password123', 10);
      vi.mocked(mockUserRepository.findByUsername).mockResolvedValue(
        new User(BigInt(1), Username.create('testuser'), passwordHash, now, now)
      );

      const res = await app.request('/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'testuser', password: 'password123' }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.token).toBeTruthy();
      expect(body.username).toBe('testuser');
    });

    it('returns 401 with an error message when the username does not exist', async () => {
      vi.mocked(mockUserRepository.findByUsername).mockResolvedValue(null);

      const res = await app.request('/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'nonexistent', password: 'password123' }),
      });

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.code).toBe(ErrorCode.INVALID_CREDENTIALS);
    });

    it('returns 401 with an error message when the password is incorrect', async () => {
      const passwordHash = hashSync('password123', 10);
      vi.mocked(mockUserRepository.findByUsername).mockResolvedValue(
        new User(BigInt(1), Username.create('testuser'), passwordHash, now, now)
      );

      const res = await app.request('/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'testuser', password: 'wrong-password' }),
      });

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.code).toBe(ErrorCode.INVALID_CREDENTIALS);
    });

    it('returns 401 when the user has a null passwordHash', async () => {
      vi.mocked(mockUserRepository.findByUsername).mockResolvedValue(
        new User(BigInt(1), Username.create('testuser'), null, now, now)
      );

      const res = await app.request('/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'testuser', password: 'password123' }),
      });

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.code).toBe(ErrorCode.INVALID_CREDENTIALS);
    });

    it('returns 400 or 422 when username is empty', async () => {
      const res = await app.request('/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: '', password: 'password123' }),
      });

      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).toBeLessThan(500);
    });

    it('returns 400 or 422 when password is fewer than 8 characters', async () => {
      const res = await app.request('/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'testuser', password: 'short' }),
      });

      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).toBeLessThan(500);
    });

    it('returns 400 or 422 when the request body is empty', async () => {
      const res = await app.request('/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).toBeLessThan(500);
    });
  });
});
