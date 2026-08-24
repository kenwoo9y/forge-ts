import { OpenAPIHono } from '@hono/zod-openapi';
import { ErrorCode } from 'error';
import type { Context } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CreateUserUseCase } from '../../../application/user/command/createUserUseCase.js';
import { DeleteUserUseCase } from '../../../application/user/command/deleteUserUseCase.js';
import { UpdateUserUseCase } from '../../../application/user/command/updateUserUseCase.js';
import { GetUserUseCase } from '../../../application/user/query/getUserUseCase.js';
import type { IUserQueryService } from '../../../application/user/query/queryService.js';
import { User } from '../../../domain/user/entity.js';
import type { IUserRepository } from '../../../domain/user/repository.js';
import { Email } from '../../../domain/user/value/email.js';
import { Username } from '../../../domain/user/value/username.js';
import { createUserHandler } from './handler.js';
import { createUserRoutes } from './routes.js';

const now = new Date('2025-01-01T00:00:00.000Z');

const mockUserRepository: IUserRepository = {
  save: vi.fn(),
  findByUsername: vi.fn(),
  findByEmail: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
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
      updateUserUseCase: new UpdateUserUseCase(mockUserRepository),
      deleteUserUseCase: new DeleteUserUseCase(mockUserRepository),
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
    it('全フィールドを指定してユーザーを作成する場合：201を返しユーザー情報が正しい', async () => {
      vi.mocked(mockUserRepository.findByUsername).mockResolvedValue(null);
      vi.mocked(mockUserRepository.findByEmail).mockResolvedValue(null);
      vi.mocked(mockUserRepository.save).mockResolvedValue(
        new User(
          BigInt(1),
          Username.create('testuser'),
          Email.create('test@example.com'),
          'Test',
          'User',
          null,
          now,
          now
        )
      );

      const res = await app.request('/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'testuser',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          password: 'password123',
        }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body).toEqual({
        username: 'testuser',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
      });
    });

    it('最小限のフィールドでユーザーを作成する場合：201を返しオプション項目がnull', async () => {
      vi.mocked(mockUserRepository.findByUsername).mockResolvedValue(null);
      vi.mocked(mockUserRepository.save).mockResolvedValue(
        new User(BigInt(1), Username.create('testuser'), null, null, null, null, now, now)
      );

      const res = await app.request('/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'testuser', password: 'password123' }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.username).toBe('testuser');
      expect(body.email).toBeNull();
    });

    it('ユーザー名が重複する場合：409を返す', async () => {
      vi.mocked(mockUserRepository.findByUsername).mockResolvedValue(
        new User(BigInt(1), Username.create('testuser'), null, null, null, null, now, now)
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

    it('メールアドレスが重複する場合：409を返す', async () => {
      vi.mocked(mockUserRepository.findByUsername).mockResolvedValue(null);
      vi.mocked(mockUserRepository.findByEmail).mockResolvedValue(
        new User(
          BigInt(2),
          Username.create('otheruser'),
          Email.create('test@example.com'),
          null,
          null,
          null,
          now,
          now
        )
      );

      const res = await app.request('/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'testuser',
          email: 'test@example.com',
          password: 'password123',
        }),
      });

      expect(res.status).toBe(409);
      const body = await res.json();
      expect(body.code).toBe(ErrorCode.EMAIL_DUPLICATE);
    });

    it('重複以外のエラーの場合：エラーが伝播する', async () => {
      vi.mocked(mockUserRepository.findByUsername).mockResolvedValue(null);
      vi.mocked(mockUserRepository.save).mockRejectedValue(new Error('connection lost'));

      const res = await app.request('/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'testuser', password: 'password123' }),
      });

      expect(res.status).toBe(500);
    });

    it('ユーザー名が30文字を超える場合：400を返す', async () => {
      const res = await app.request('/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'a'.repeat(31), password: 'password123' }),
      });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /users/:username', () => {
    it('ユーザーが存在する場合：200を返しユーザー情報を取得できる', async () => {
      vi.mocked(mockUserQueryService.findByUsername).mockResolvedValue({
        id: BigInt(1),
        username: 'testuser',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        createdAt: now,
        updatedAt: now,
      });

      const res = await app.request('/users/testuser');

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.username).toBe('testuser');
      expect(body.email).toBe('test@example.com');
    });

    it('ユーザーが存在しない場合：404を返す', async () => {
      vi.mocked(mockUserQueryService.findByUsername).mockResolvedValue(null);

      const res = await app.request('/users/nonexistent');

      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.code).toBe(ErrorCode.USER_NOT_FOUND);
    });
  });

  describe('PATCH /users/:username', () => {
    it('ユーザーが存在する場合：200を返し更新後のユーザー情報が正しい', async () => {
      const existingUser = new User(
        BigInt(1),
        Username.create('testuser'),
        Email.create('old@example.com'),
        'Test',
        'User',
        null,
        now,
        now
      );
      vi.mocked(mockUserRepository.findByUsername).mockImplementation(async (username) => {
        if (username === 'testuser') return existingUser;
        return null;
      });
      vi.mocked(mockUserRepository.findByEmail).mockResolvedValue(null);
      vi.mocked(mockUserRepository.update).mockResolvedValue(
        new User(
          BigInt(1),
          Username.create('updateduser'),
          Email.create('updated@example.com'),
          'Updated',
          'User',
          null,
          now,
          now
        )
      );

      const res = await app.request('/users/testuser', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'updateduser', email: 'updated@example.com' }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.username).toBe('updateduser');
      expect(body.email).toBe('updated@example.com');
    });

    it('emailをnullでクリアする場合：200を返しemailがnullになる', async () => {
      vi.mocked(mockUserRepository.findByUsername).mockResolvedValue(
        new User(
          BigInt(1),
          Username.create('testuser'),
          Email.create('old@example.com'),
          null,
          null,
          null,
          now,
          now
        )
      );
      vi.mocked(mockUserRepository.update).mockResolvedValue(
        new User(BigInt(1), Username.create('testuser'), null, null, null, null, now, now)
      );

      const res = await app.request('/users/testuser', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: null }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.email).toBeNull();
    });

    it('ユーザーが存在しない場合：404を返す', async () => {
      vi.mocked(mockUserRepository.update).mockRejectedValue(new Error('User not found'));

      const res = await app.request('/users/nonexistent', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName: 'Updated' }),
      });

      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.code).toBe(ErrorCode.USER_NOT_FOUND);
    });

    it('重複するユーザー名に更新する場合：409を返す', async () => {
      vi.mocked(mockUserRepository.findByUsername).mockResolvedValue(
        new User(BigInt(2), Username.create('taken'), null, null, null, null, now, now)
      );

      const res = await app.request('/users/testuser', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'taken' }),
      });

      expect(res.status).toBe(409);
      const body = await res.json();
      expect(body.code).toBe(ErrorCode.USERNAME_DUPLICATE);
    });

    it('重複するメールアドレスに更新する場合：409を返す', async () => {
      vi.mocked(mockUserRepository.findByUsername).mockResolvedValue(
        new User(
          BigInt(1),
          Username.create('testuser'),
          Email.create('old@example.com'),
          null,
          null,
          null,
          now,
          now
        )
      );
      vi.mocked(mockUserRepository.findByEmail).mockResolvedValue(
        new User(
          BigInt(2),
          Username.create('otheruser'),
          Email.create('taken@example.com'),
          null,
          null,
          null,
          now,
          now
        )
      );

      const res = await app.request('/users/testuser', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'taken@example.com' }),
      });

      expect(res.status).toBe(409);
      const body = await res.json();
      expect(body.code).toBe(ErrorCode.EMAIL_DUPLICATE);
    });

    it('パスワードを更新する場合：200を返す', async () => {
      vi.mocked(mockUserRepository.findByUsername).mockResolvedValue(null);
      vi.mocked(mockUserRepository.update).mockResolvedValue(
        new User(BigInt(1), Username.create('testuser'), null, null, null, 'newHash', now, now)
      );

      const res = await app.request('/users/testuser', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: 'new-password123' }),
      });

      expect(res.status).toBe(200);
      expect(mockUserRepository.update).toHaveBeenCalled();
    });

    it('ユーザー名を現在と同じ値に更新する場合：重複チェックをスキップして200を返す', async () => {
      vi.mocked(mockUserRepository.update).mockResolvedValue(
        new User(BigInt(1), Username.create('testuser'), null, 'Updated', null, null, now, now)
      );

      const res = await app.request('/users/testuser', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'testuser', firstName: 'Updated' }),
      });

      expect(res.status).toBe(200);
      expect(mockUserRepository.findByUsername).not.toHaveBeenCalled();
    });

    it('メールアドレスを現在と同じ値に更新する場合：重複チェックをスキップして200を返す', async () => {
      vi.mocked(mockUserRepository.findByUsername).mockResolvedValue(
        new User(
          BigInt(1),
          Username.create('testuser'),
          Email.create('same@example.com'),
          null,
          null,
          null,
          now,
          now
        )
      );
      vi.mocked(mockUserRepository.update).mockResolvedValue(
        new User(
          BigInt(1),
          Username.create('testuser'),
          Email.create('same@example.com'),
          null,
          null,
          null,
          now,
          now
        )
      );

      const res = await app.request('/users/testuser', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'same@example.com' }),
      });

      expect(res.status).toBe(200);
      expect(mockUserRepository.findByEmail).not.toHaveBeenCalled();
    });

    it('メールアドレス未設定のユーザーに新しいメールアドレスを設定する場合：200を返す', async () => {
      vi.mocked(mockUserRepository.findByUsername).mockResolvedValue(
        new User(BigInt(1), Username.create('testuser'), null, null, null, null, now, now)
      );
      vi.mocked(mockUserRepository.findByEmail).mockResolvedValue(null);
      vi.mocked(mockUserRepository.update).mockResolvedValue(
        new User(
          BigInt(1),
          Username.create('testuser'),
          Email.create('new@example.com'),
          null,
          null,
          null,
          now,
          now
        )
      );

      const res = await app.request('/users/testuser', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'new@example.com' }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.email).toBe('new@example.com');
    });

    it('firstName・lastNameをnullでクリアする場合：200を返しnullになる', async () => {
      vi.mocked(mockUserRepository.update).mockResolvedValue(
        new User(BigInt(1), Username.create('testuser'), null, null, null, null, now, now)
      );

      const res = await app.request('/users/testuser', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName: null, lastName: null }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.firstName).toBeNull();
      expect(body.lastName).toBeNull();
    });

    it('ユーザー未検出以外のエラーの場合：エラーが伝播する', async () => {
      vi.mocked(mockUserRepository.update).mockRejectedValue(new Error('connection lost'));

      const res = await app.request('/users/testuser', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName: 'Updated' }),
      });

      expect(res.status).toBe(500);
    });
  });

  describe('DELETE /users/:username', () => {
    it('ユーザーが存在する場合：204を返す', async () => {
      vi.mocked(mockUserRepository.delete).mockResolvedValue(undefined);

      const res = await app.request('/users/testuser', { method: 'DELETE' });

      expect(res.status).toBe(204);
    });

    it('ユーザーが存在しない場合：404を返す', async () => {
      vi.mocked(mockUserRepository.delete).mockRejectedValue(new Error('User not found'));

      const res = await app.request('/users/nonexistent', { method: 'DELETE' });

      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.code).toBe(ErrorCode.USER_NOT_FOUND);
    });

    it('ユーザー未検出以外のエラーの場合：エラーが伝播する', async () => {
      vi.mocked(mockUserRepository.delete).mockRejectedValue(new Error('connection lost'));

      const res = await app.request('/users/testuser', { method: 'DELETE' });

      expect(res.status).toBe(500);
    });
  });
});

describe('User Handler ガード節', () => {
  const mockDeps = {
    createUserUseCase: { execute: vi.fn() },
    getUserUseCase: { execute: vi.fn() },
    updateUserUseCase: { execute: vi.fn() },
    deleteUserUseCase: { execute: vi.fn() },
  };

  function makeMockContext() {
    return {
      req: { param: vi.fn().mockReturnValue(undefined), json: vi.fn() },
      json: vi.fn(),
    } as unknown as Context;
  }

  it('getUser: usernameが未設定の場合：400を返す', async () => {
    const handler = createUserHandler(mockDeps);
    const c = makeMockContext();
    await handler.getUser(c);
    expect(c.json).toHaveBeenCalledWith({ code: ErrorCode.USERNAME_REQUIRED }, 400);
  });

  it('updateUser: usernameが未設定の場合：400を返す', async () => {
    const handler = createUserHandler(mockDeps);
    const c = makeMockContext();
    await handler.updateUser(c);
    expect(c.json).toHaveBeenCalledWith({ code: ErrorCode.USERNAME_REQUIRED }, 400);
  });

  it('deleteUser: usernameが未設定の場合：400を返す', async () => {
    const handler = createUserHandler(mockDeps);
    const c = makeMockContext();
    await handler.deleteUser(c);
    expect(c.json).toHaveBeenCalledWith({ code: ErrorCode.USERNAME_REQUIRED }, 400);
  });
});
