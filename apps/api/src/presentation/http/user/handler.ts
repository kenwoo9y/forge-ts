import { ErrorCode } from 'error';
import type { Context } from 'hono';
import type { CreateUserInput } from 'schema';
import type { ICreateUserUseCase } from '../../../application/user/command/createUserUseCase.js';
import type { IGetUserUseCase } from '../../../application/user/query/getUserUseCase.js';
import { UsernameDuplicateError } from '../../../domain/user/error.js';

/**
 * ユーザーハンドラーの依存関係インターフェース。
 * ユーザー操作に必要なすべてのユースケースを保持する。
 */
export interface UserHandlerDeps {
  /** ユーザー作成ユースケース */
  createUserUseCase: ICreateUserUseCase;
  /** ユーザー取得ユースケース */
  getUserUseCase: IGetUserUseCase;
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
          password: validated.password,
        });
        return c.json(
          {
            username: user.username,
            createdAt: user.createdAt.toISOString(),
            updatedAt: user.updatedAt.toISOString(),
          },
          201
        );
      } catch (e) {
        if (e instanceof UsernameDuplicateError) {
          return c.json({ code: ErrorCode.USERNAME_DUPLICATE }, 409);
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
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      });
    },
  };
}
