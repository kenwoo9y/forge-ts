import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { type AuthHandlerDeps, createAuthHandler } from './handler.js';

const signInRequestSchema = z.object({
  username: z.string().min(1).max(30),
  password: z.string().min(8).max(128),
});

const signInResponseSchema = z.object({
  token: z.string(),
  username: z.string(),
});

const errorResponseSchema = z.object({
  error: z.string(),
});

const signInRoute = createRoute({
  method: 'post',
  path: '/auth/signin',
  tags: ['Auth'],
  summary: 'Sign in with username and password',
  request: {
    body: {
      content: {
        'application/json': {
          schema: signInRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Sign in successful',
      content: {
        'application/json': {
          schema: signInResponseSchema,
        },
      },
    },
    401: {
      description: 'Invalid credentials',
      content: {
        'application/json': {
          schema: errorResponseSchema,
        },
      },
    },
  },
});

export function createAuthRoutes(deps: AuthHandlerDeps) {
  const handler = createAuthHandler(deps);

  return new OpenAPIHono().openapi(signInRoute, handler.signIn as never);
}
