import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { createUserSchema } from 'schema';
import { createUserHandler, type UserHandlerDeps } from './handler.js';

const userResponseSchema = z.object({
  username: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const errorResponseSchema = z.object({
  error: z.string(),
});

const createUserRoute = createRoute({
  method: 'post',
  path: '/users',
  tags: ['User'],
  summary: 'Create a user',
  request: {
    body: {
      content: {
        'application/json': {
          schema: createUserSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'User created',
      content: {
        'application/json': {
          schema: userResponseSchema,
        },
      },
    },
    409: {
      description: 'Username already exists',
      content: {
        'application/json': {
          schema: errorResponseSchema,
        },
      },
    },
  },
});

const getUserRoute = createRoute({
  method: 'get',
  path: '/users/{username}',
  tags: ['User'],
  summary: 'Get a user by username',
  request: {
    params: z.object({
      username: z.string(),
    }),
  },
  responses: {
    200: {
      description: 'User found',
      content: {
        'application/json': {
          schema: userResponseSchema,
        },
      },
    },
    404: {
      description: 'User not found',
      content: {
        'application/json': {
          schema: errorResponseSchema,
        },
      },
    },
  },
});

export function createUserRoutes(deps: UserHandlerDeps) {
  const handler = createUserHandler(deps);

  return new OpenAPIHono()
    .openapi(createUserRoute, handler.createUser as never)
    .openapi(getUserRoute, handler.getUser as never);
}
