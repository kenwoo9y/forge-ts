import { ErrorCode } from 'error';
import type { Context } from 'hono';
import type { ISignInUseCase } from '../../../application/auth/signInUseCase.js';

export interface AuthHandlerDeps {
  signInUseCase: ISignInUseCase;
}

/**
 * 認証関連の HTTP ハンドラーを生成する。
 */
export function createAuthHandler(deps: AuthHandlerDeps) {
  return {
    /**
     * サインインハンドラー。
     * POST /auth/signin に対応する。
     * @param c Hono コンテキスト
     * @returns JWT トークンとユーザー名（200）、または認証エラー（401）
     */
    signIn: async (c: Context) => {
      const body = await c.req.json<{ username: string; password: string }>();
      const result = await deps.signInUseCase.execute(body);
      if (!result) {
        return c.json({ code: ErrorCode.INVALID_CREDENTIALS }, 401);
      }
      return c.json({ token: result.token, username: result.username });
    },
  };
}
