import { ErrorCode } from 'error';
import type { Context } from 'hono';
import type { ISignInUseCase } from '../../../application/auth/signInUseCase.js';

export interface AuthHandlerDeps {
  signInUseCase: ISignInUseCase;
}

/**
 * Creates the HTTP handlers related to authentication.
 */
export function createAuthHandler(deps: AuthHandlerDeps) {
  return {
    /**
     * Sign-in handler.
     * Handles POST /auth/signin.
     * @param c The Hono context
     * @returns The JWT token and username (200), or an authentication error (401)
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
