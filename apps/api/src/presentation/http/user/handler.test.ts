import { OpenAPIHono } from '@hono/zod-openapi';
import { ErrorCode } from 'error';
import type { Context } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CreateUserUseCase } from '../../../application/user/command/createUserUseCase.js';
import { GetUserUseCase } from '../../../application/user/query/getUserUseCase.js';
import type { IUserQueryService } from '../../../application/user/query/queryService.js';
import { User } from '../../../domain/user/entity.js';
import type { IUserRepository } from '../../../domain/user/repository.js';
import { Username } from '../../../domain/user/value/username.js';
import { createUserHandler } from './handler.js';
import { createUserRoutes } from './routes.js';

const now = new Date('2025-01-01T00:00:00.000Z');

const mockUserRepository: IUserRepository = {
  save: vi.fn(),
  findByUsername: vi.fn(),
};

const mockUserQueryService: IUserQueryService = {
  findByUsername: vi.fn(),
};

function createApp() {
  const app = new OpenAPIHono();
  app.route(
    '/',
    createUserRoutes({
      createUserUseCase: new CreateUserUseCase(mockUserRepository),
      getUserUseCase: new GetUserUseCase(mockUserQueryService),
    })
  );
  return app;
}

describe('User Endpoints', () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    vi.resetAllMocks();
    app = createApp();
  });

  describe('POST /users', () => {
    it('returns 201 with correct user information when creating a user', async () => {
      vi.mocked(mockUserRepository.findByUsername).mockResolvedValue(null);
      vi.mocked(mockUserRepository.save).mockResolvedValue(
        new User(BigInt(1), Username.create('testuser'), null, now, now)
      );

      const res = await app.request('/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'testuser', password: 'password123' }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body).toEqual({
        username: 'testuser',
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
      });
    });

    it('returns 409 when the username is a duplicate', async () => {
      vi.mocked(mockUserRepository.findByUsername).mockResolvedValue(
        new User(BigInt(1), Username.create('testuser'), null, now, now)
      );

      const res = await app.request('/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'testuser', password: 'password123' }),
      });

      expect(res.status).toBe(409);
      const body = await res.json();
      expect(body.code).toBe(ErrorCode.USERNAME_DUPLICATE);
    });

    it('propagates the error for errors other than duplication', async () => {
      vi.mocked(mockUserRepository.findByUsername).mockResolvedValue(null);
      vi.mocked(mockUserRepository.save).mockRejectedValue(new Error('connection lost'));

      const res = await app.request('/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'testuser', password: 'password123' }),
      });

      expect(res.status).toBe(500);
    });

    it('returns 400 when the username exceeds 30 characters', async () => {
      const res = await app.request('/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'a'.repeat(31), password: 'password123' }),
      });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /users/:username', () => {
    it('returns 200 and retrieves the user information when the user exists', async () => {
      vi.mocked(mockUserQueryService.findByUsername).mockResolvedValue({
        id: BigInt(1),
        username: 'testuser',
        createdAt: now,
        updatedAt: now,
      });

      const res = await app.request('/users/testuser');

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.username).toBe('testuser');
    });

    it('returns 404 when the user does not exist', async () => {
      vi.mocked(mockUserQueryService.findByUsername).mockResolvedValue(null);

      const res = await app.request('/users/nonexistent');

      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.code).toBe(ErrorCode.USER_NOT_FOUND);
    });
  });
});

describe('User Handler guard clauses', () => {
  const mockDeps = {
    createUserUseCase: { execute: vi.fn() },
    getUserUseCase: { execute: vi.fn() },
  };

  function makeMockContext() {
    return {
      req: { param: vi.fn().mockReturnValue(undefined), json: vi.fn() },
      json: vi.fn(),
    } as unknown as Context;
  }

  it('getUser: returns 400 when username is not set', async () => {
    const handler = createUserHandler(mockDeps);
    const c = makeMockContext();
    await handler.getUser(c);
    expect(c.json).toHaveBeenCalledWith({ code: ErrorCode.USERNAME_REQUIRED }, 400);
  });
});
