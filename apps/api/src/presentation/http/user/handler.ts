import { ErrorCode } from 'error';
import type { Context } from 'hono';
import type { CreateUserInput } from 'schema';
import type { ICreateUserUseCase } from '../../../application/user/command/createUserUseCase.js';
import type { IGetUserUseCase } from '../../../application/user/query/getUserUseCase.js';
import { UsernameDuplicateError } from '../../../domain/user/error.js';

/**
 * Dependency interface for the user handler.
 * Holds all the use cases needed for user operations.
 */
export interface UserHandlerDeps {
  /** The create-user use case */
  createUserUseCase: ICreateUserUseCase;
  /** The get-user use case */
  getUserUseCase: IGetUserUseCase;
}

/**
 * Creates the HTTP handlers related to users.
 * @param deps The use-case dependencies used by the handlers
 * @returns An object containing the user operation handlers
 */
export function createUserHandler(deps: UserHandlerDeps) {
  return {
    /**
     * Handler for creating a user.
     * Handles POST /users.
     * @param c The Hono context
     * @returns The created user's information (201), or an error (400 / 409)
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
     * Handler for getting a user.
     * Handles GET /users/:username.
     * @param c The Hono context
     * @returns The user's information (200), or an error (404)
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
