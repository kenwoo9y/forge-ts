import { ErrorCode } from 'error';
import type { Context } from 'hono';
import type { CreateUserInput, UpdateUserInput } from 'schema';
import type { ICreateUserUseCase } from '../../../application/user/command/createUserUseCase.js';
import type { IDeleteUserUseCase } from '../../../application/user/command/deleteUserUseCase.js';
import type { IUpdateUserUseCase } from '../../../application/user/command/updateUserUseCase.js';
import type { IGetUserUseCase } from '../../../application/user/query/getUserUseCase.js';
import { EmailDuplicateError, UsernameDuplicateError } from '../../../domain/user/error.js';

/**
 * ユーザーハンドラーの依存関係インターフェース。
 * ユーザー操作に必要なすべてのユースケースを保持する。
 */
export interface UserHandlerDeps {
  /** ユーザー作成ユースケース */
  createUserUseCase: ICreateUserUseCase;
  /** ユーザー取得ユースケース */
  getUserUseCase: IGetUserUseCase;
  /** ユーザー更新ユースケース */
  updateUserUseCase: IUpdateUserUseCase;
  /** ユーザー削除ユースケース */
  deleteUserUseCase: IDeleteUserUseCase;
}

/**
 * ユーザー関連のHTTPハンドラーを生成する。
 * @param deps ハンドラーが使用するユースケースの依存関係
 * @returns ユーザー操作のハンドラーオブジェクト
 */
export function createUserHandler(deps: UserHandlerDeps) {
  return {
    /**
     * ユーザーを作成するハンドラー。
     * POST /users に対応する。
     * @param c Honoのコンテキスト
     * @returns 作成されたユーザー情報（201）、またはエラー（400 / 409）
     */
    createUser: async (c: Context) => {
      const validated = await c.req.json<CreateUserInput>();
      const { username } = validated;
      /* c8 ignore next 3 -- Zod validates username before handler */
      if (!username) {
        return c.json({ code: ErrorCode.USERNAME_REQUIRED }, 400);
      }
      try {
        const user = await deps.createUserUseCase.execute({
          username,
          email: validated.email ?? null,
          firstName: validated.firstName ?? null,
          lastName: validated.lastName ?? null,
          password: validated.password,
        });
        return c.json(
          {
            username: user.username,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            createdAt: user.createdAt.toISOString(),
            updatedAt: user.updatedAt.toISOString(),
          },
          201
        );
      } catch (e) {
        if (e instanceof UsernameDuplicateError) {
          return c.json({ code: ErrorCode.USERNAME_DUPLICATE }, 409);
        }
        if (e instanceof EmailDuplicateError) {
          return c.json({ code: ErrorCode.EMAIL_DUPLICATE }, 409);
        }
        /* c8 ignore next */
        throw e;
      }
    },

    /**
     * ユーザーを取得するハンドラー。
     * GET /users/:username に対応する。
     * @param c Honoのコンテキスト
     * @returns ユーザー情報（200）、またはエラー（404）
     */
    getUser: async (c: Context) => {
      const username = c.req.param('username');
      if (!username) {
        return c.json({ code: ErrorCode.USERNAME_REQUIRED }, 400);
      }
      const user = await deps.getUserUseCase.execute(username);
      if (!user) {
        return c.json({ code: ErrorCode.USER_NOT_FOUND }, 404);
      }
      return c.json({
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      });
    },

    /**
     * ユーザー情報を更新するハンドラー。
     * PATCH /users/:username に対応する。
     * @param c Honoのコンテキスト
     * @returns 更新後のユーザー情報（200）、またはエラー（404 / 409）
     */
    updateUser: async (c: Context) => {
      const username = c.req.param('username');
      if (!username) {
        return c.json({ code: ErrorCode.USERNAME_REQUIRED }, 400);
      }
      const validated = await c.req.json<UpdateUserInput>();
      const input: Record<string, unknown> = {};
      if ('username' in validated) input.username = validated.username ?? null;
      if ('email' in validated) input.email = validated.email ?? null;
      if ('firstName' in validated) input.firstName = validated.firstName ?? null;
      if ('lastName' in validated) input.lastName = validated.lastName ?? null;
      if ('password' in validated) input.password = validated.password;

      try {
        const user = await deps.updateUserUseCase.execute(username, input);
        if (!user) {
          return c.json({ code: ErrorCode.USER_NOT_FOUND }, 404);
        }
        return c.json({
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
        });
      } catch (e) {
        if (e instanceof UsernameDuplicateError) {
          return c.json({ code: ErrorCode.USERNAME_DUPLICATE }, 409);
        }
        if (e instanceof EmailDuplicateError) {
          return c.json({ code: ErrorCode.EMAIL_DUPLICATE }, 409);
        }
        /* c8 ignore next */
        throw e;
      }
    },

    /**
     * ユーザーを削除するハンドラー。
     * DELETE /users/:username に対応する。
     * @param c Honoのコンテキスト
     * @returns 空レスポンス（204）、またはエラー（404）
     */
    deleteUser: async (c: Context) => {
      const username = c.req.param('username');
      if (!username) {
        return c.json({ code: ErrorCode.USERNAME_REQUIRED }, 400);
      }
      const deleted = await deps.deleteUserUseCase.execute(username);
      if (!deleted) {
        return c.json({ code: ErrorCode.USER_NOT_FOUND }, 404);
      }
      return c.body(null, 204);
    },
  };
}
