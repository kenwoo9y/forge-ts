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
  findByEmail: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
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
    it('正しい認証情報の場合：200を返しtokenとusernameが含まれる', async () => {
      const passwordHash = hashSync('password123', 10);
      vi.mocked(mockUserRepository.findByUsername).mockResolvedValue(
        new User(BigInt(1), Username.create('testuser'), null, null, null, passwordHash, now, now)
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

    it('存在しないユーザー名の場合：401を返しエラーメッセージが含まれる', async () => {
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

    it('パスワードが誤っている場合：401を返しエラーメッセージが含まれる', async () => {
      const passwordHash = hashSync('password123', 10);
      vi.mocked(mockUserRepository.findByUsername).mockResolvedValue(
        new User(BigInt(1), Username.create('testuser'), null, null, null, passwordHash, now, now)
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

    it('passwordHashがnullのユーザーの場合：401を返す', async () => {
      vi.mocked(mockUserRepository.findByUsername).mockResolvedValue(
        new User(BigInt(1), Username.create('testuser'), null, null, null, null, now, now)
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

    it('usernameが空の場合：400または422を返す', async () => {
      const res = await app.request('/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: '', password: 'password123' }),
      });

      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).toBeLessThan(500);
    });

    it('passwordが8文字未満の場合：400または422を返す', async () => {
      const res = await app.request('/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'testuser', password: 'short' }),
      });

      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).toBeLessThan(500);
    });

    it('リクエストボディが空の場合：400または422を返す', async () => {
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
