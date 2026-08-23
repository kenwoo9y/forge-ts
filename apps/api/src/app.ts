import { swaggerUI } from '@hono/swagger-ui';
import { OpenAPIHono } from '@hono/zod-openapi';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from 'db/generated/prisma/index.js';
import { ErrorCode } from 'error';
import { cors } from 'hono/cors';
import { pinoLogger } from 'hono-pino';
import { SignInUseCase } from './application/auth/signInUseCase.js';
import { CreateTaskByUsernameUseCase } from './application/task/command/createTaskByUsernameUseCase.js';
import { CreateTaskUseCase } from './application/task/command/createTaskUseCase.js';
import { DeleteTaskUseCase } from './application/task/command/deleteTaskUseCase.js';
import { UpdateTaskUseCase } from './application/task/command/updateTaskUseCase.js';
import { GetTasksByUsernameUseCase } from './application/task/query/getTasksByUsernameUseCase.js';
import { GetTaskUseCase } from './application/task/query/getTaskUseCase.js';
import { CreateUserUseCase } from './application/user/command/createUserUseCase.js';
import { DeleteUserUseCase } from './application/user/command/deleteUserUseCase.js';
import { UpdateUserUseCase } from './application/user/command/updateUserUseCase.js';
import { GetUserUseCase } from './application/user/query/getUserUseCase.js';
import { jwtAuth } from './infrastructure/auth/jwtMiddleware.js';
import { logger } from './infrastructure/logger/index.js';
import { PrismaTaskQueryService } from './infrastructure/prisma/task/prismaTaskQueryService.js';
import { PrismaTaskRepository } from './infrastructure/prisma/task/prismaTaskRepository.js';
import { PrismaUserQueryService } from './infrastructure/prisma/user/prismaUserQueryService.js';
import { PrismaUserRepository } from './infrastructure/prisma/user/prismaUserRepository.js';
import { createAuthRoutes } from './presentation/http/auth/routes.js';
import { createTaskRoutes } from './presentation/http/task/routes.js';
import { createUserRoutes } from './presentation/http/user/routes.js';

const { DB_HOST, DB_PORT, DB_NAME, DB_USERNAME, DB_PASSWORD } = process.env;
if (!DB_HOST || !DB_PORT || !DB_NAME || !DB_USERNAME || !DB_PASSWORD) {
  throw new Error(
    'DB_HOST, DB_PORT, DB_NAME, DB_USERNAME, DB_PASSWORD environment variables are required'
  );
}
const databaseUrl = `postgresql://${DB_USERNAME}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`;

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  throw new Error('JWT_SECRET environment variable is required');
}
// RDSのpg_hba.confは暗号化接続のみ許可しているが、pgドライバはデフォルトで平文接続を試みるため明示的に有効化する
// ローカルのdocker-compose Postgresはssl未対応のため本番相当(NODE_ENV=production)でのみ有効にする
const adapter = new PrismaPg({
  connectionString: databaseUrl,
  ...(process.env.NODE_ENV === 'production' ? { ssl: { rejectUnauthorized: false } } : {}),
});
const prisma = new PrismaClient({ adapter });

// User - Command side
const userRepository = new PrismaUserRepository(prisma);
const createUserUseCase = new CreateUserUseCase(userRepository);
const updateUserUseCase = new UpdateUserUseCase(userRepository);
const deleteUserUseCase = new DeleteUserUseCase(userRepository);

// User - Query side
const userQueryService = new PrismaUserQueryService(prisma);
const getUserUseCase = new GetUserUseCase(userQueryService);

// Task - Command side
const taskRepository = new PrismaTaskRepository(prisma);
const createTaskUseCase = new CreateTaskUseCase(taskRepository);
const updateTaskUseCase = new UpdateTaskUseCase(taskRepository);
const deleteTaskUseCase = new DeleteTaskUseCase(taskRepository);
const createTaskByUsernameUseCase = new CreateTaskByUsernameUseCase(
  createTaskUseCase,
  userQueryService
);

// Task - Query side
const taskQueryService = new PrismaTaskQueryService(prisma);
const getTaskUseCase = new GetTaskUseCase(taskQueryService);
const getTasksByUsernameUseCase = new GetTasksByUsernameUseCase(taskQueryService, userQueryService);

// Auth
const signInUseCase = new SignInUseCase(userRepository, jwtSecret);

const app = new OpenAPIHono();

// The mobile app (Expo web / react-native-web) runs in a real browser and
// calls the API directly from the client, so it needs CORS. The web app
// calls the API server-side (see apps/web/lib/hono-client.ts), so it never
// hits this middleware from a browser context.
const corsOrigins = process.env.CORS_ORIGIN?.split(',').map((origin) => origin.trim()) ?? [
  'http://localhost:8081',
];

app.use(
  '*',
  cors({
    origin: corsOrigins,
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(pinoLogger({ pino: logger }));

// Hono's default error handling returns a plain "Internal Server Error" text
// response with no logging, which hides the actual cause. Log it and return
// a JSON body matching the shape other error responses use.
app.onError((err, c) => {
  logger.error({ err }, 'Unhandled error');
  return c.json({ code: ErrorCode.INTERNAL_SERVER_ERROR }, 500);
});

app.get('/', (c) => {
  return c.text('Hello Hono!');
});

// JWT middleware for protected routes (must be registered before routes)
app.use('/tasks', jwtAuth(jwtSecret));
app.use('/tasks/*', jwtAuth(jwtSecret));
app.use('/users/:username/tasks', jwtAuth(jwtSecret));

// Public routes, task sub-routes are protected above.
// Chained (rather than repeated app.route() calls) so the merged route
// types are captured for the Hono RPC client (see AppType below).
const routes = app
  .route('/', createAuthRoutes({ signInUseCase }))
  .route(
    '/',
    createUserRoutes({
      createUserUseCase,
      getUserUseCase,
      updateUserUseCase,
      deleteUserUseCase,
      getTasksByUsernameUseCase,
      createTaskByUsernameUseCase,
    })
  )
  .route(
    '/',
    createTaskRoutes({
      createTaskUseCase,
      getTaskUseCase,
      updateTaskUseCase,
      deleteTaskUseCase,
    })
  );

app.doc('/openapi.json', {
  openapi: '3.1.0',
  info: {
    title: 'Task Management API',
    version: '1.0.0',
  },
});

app.get('/docs', swaggerUI({ url: '/openapi.json' }));

export { app };
export type AppType = typeof routes;
