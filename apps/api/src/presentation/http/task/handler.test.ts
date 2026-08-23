import { OpenAPIHono } from '@hono/zod-openapi';
import { ErrorCode } from 'error';
import type { Context } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CreateTaskUseCase } from '../../../application/task/command/createTaskUseCase.js';
import { DeleteTaskUseCase } from '../../../application/task/command/deleteTaskUseCase.js';
import { UpdateTaskUseCase } from '../../../application/task/command/updateTaskUseCase.js';
import { GetTaskUseCase } from '../../../application/task/query/getTaskUseCase.js';
import type { ITaskQueryService } from '../../../application/task/query/queryService.js';
import type { ITaskRepository } from '../../../domain/task/repository.js';
import { createTaskHandler } from './handler.js';
import { createTaskRoutes } from './routes.js';

const now = new Date('2025-01-01T00:00:00.000Z');
const taskPublicId = '550e8400-e29b-41d4-a716-446655440000';
const taskPublicId2 = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

const mockTaskRepository: ITaskRepository = {
  save: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

const mockTaskQueryService: ITaskQueryService = {
  findByPublicId: vi.fn(),
  findByOwnerId: vi.fn(),
};

function createApp() {
  const app = new OpenAPIHono();
  app.route(
    '/',
    createTaskRoutes({
      createTaskUseCase: new CreateTaskUseCase(mockTaskRepository),
      getTaskUseCase: new GetTaskUseCase(mockTaskQueryService),
      updateTaskUseCase: new UpdateTaskUseCase(mockTaskRepository),
      deleteTaskUseCase: new DeleteTaskUseCase(mockTaskRepository),
    })
  );
  return app;
}

describe('Task Endpoints', () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    vi.resetAllMocks();
    app = createApp();
  });

  describe('POST /tasks', () => {
    it('全フィールドを指定してタスクを作成する場合：201を返しタスク情報が正しい', async () => {
      const { Task } = await import('../../../domain/task/entity.js');
      const { TaskStatus } = await import('../../../domain/task/value/taskStatus.js');
      vi.mocked(mockTaskRepository.save).mockResolvedValue(
        new Task(
          BigInt(1),
          taskPublicId,
          'Test Task',
          'A test task',
          now,
          TaskStatus.create('todo'),
          BigInt(1),
          now,
          now
        )
      );

      const res = await app.request('/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Test Task',
          description: 'A test task',
          dueDate: '2025-01-01T00:00:00.000Z',
          status: 'todo',
          ownerId: '1',
        }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body).toEqual({
        publicId: taskPublicId,
        title: 'Test Task',
        description: 'A test task',
        dueDate: '2025-01-01T00:00:00.000Z',
        status: 'todo',
        ownerId: '1',
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
      });
    });

    it('最小限のフィールドでタスクを作成する場合：201を返しオプション項目がnull', async () => {
      const { Task } = await import('../../../domain/task/entity.js');
      const { TaskStatus } = await import('../../../domain/task/value/taskStatus.js');
      vi.mocked(mockTaskRepository.save).mockResolvedValue(
        new Task(
          BigInt(1),
          taskPublicId2,
          'Min Task',
          null,
          null,
          TaskStatus.create('todo'),
          BigInt(1),
          now,
          now
        )
      );

      const res = await app.request('/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Min Task', status: 'todo', ownerId: '1' }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.publicId).toBe(taskPublicId2);
      expect(body.title).toBe('Min Task');
      expect(body.description).toBeNull();
      expect(body.ownerId).toBe('1');
    });
  });

  describe('GET /tasks/:publicId', () => {
    it('タスクが存在する場合：200を返しタスク情報を取得できる', async () => {
      vi.mocked(mockTaskQueryService.findByPublicId).mockResolvedValue({
        publicId: taskPublicId,
        title: 'Test Task',
        description: null,
        dueDate: null,
        status: 'doing',
        ownerId: BigInt(1),
        createdAt: now,
        updatedAt: now,
      });

      const res = await app.request(`/tasks/${taskPublicId}`);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.publicId).toBe(taskPublicId);
      expect(body.status).toBe('doing');
    });

    it('全フィールドが設定されたタスクの場合：dueDate・ownerIdが正しく返る', async () => {
      vi.mocked(mockTaskQueryService.findByPublicId).mockResolvedValue({
        publicId: taskPublicId,
        title: 'Test Task',
        description: 'A test task',
        dueDate: now,
        status: 'todo',
        ownerId: BigInt(1),
        createdAt: now,
        updatedAt: now,
      });

      const res = await app.request(`/tasks/${taskPublicId}`);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.dueDate).toBe('2025-01-01T00:00:00.000Z');
      expect(body.ownerId).toBe('1');
      expect(body.description).toBe('A test task');
    });

    it('タスクが存在しない場合：404を返す', async () => {
      vi.mocked(mockTaskQueryService.findByPublicId).mockResolvedValue(null);

      const res = await app.request('/tasks/nonexistent');

      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.code).toBe(ErrorCode.TASK_NOT_FOUND);
    });
  });

  describe('PATCH /tasks/:publicId', () => {
    it('タスクが存在する場合：200を返し更新後のタスク情報が正しい', async () => {
      const { Task } = await import('../../../domain/task/entity.js');
      const { TaskStatus } = await import('../../../domain/task/value/taskStatus.js');
      vi.mocked(mockTaskRepository.update).mockResolvedValue(
        new Task(
          BigInt(1),
          taskPublicId,
          'Updated Task',
          null,
          null,
          TaskStatus.create('done'),
          BigInt(1),
          now,
          now
        )
      );

      const res = await app.request(`/tasks/${taskPublicId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Updated Task', status: 'done' }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.title).toBe('Updated Task');
      expect(body.status).toBe('done');
    });

    it('全フィールドを更新する場合：200を返し全フィールドが正しい', async () => {
      const { Task } = await import('../../../domain/task/entity.js');
      const { TaskStatus } = await import('../../../domain/task/value/taskStatus.js');
      vi.mocked(mockTaskRepository.update).mockResolvedValue(
        new Task(
          BigInt(1),
          taskPublicId,
          'Updated Task',
          'Updated description',
          now,
          TaskStatus.create('doing'),
          BigInt(2),
          now,
          now
        )
      );

      const res = await app.request(`/tasks/${taskPublicId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Updated Task',
          description: 'Updated description',
          dueDate: '2025-01-01T00:00:00.000Z',
          status: 'doing',
          ownerId: '2',
        }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.description).toBe('Updated description');
      expect(body.dueDate).toBe('2025-01-01T00:00:00.000Z');
      expect(body.ownerId).toBe('2');
    });

    it('オプションフィールドをnullでクリアする場合：200を返しnullが設定される', async () => {
      const { Task } = await import('../../../domain/task/entity.js');
      const { TaskStatus } = await import('../../../domain/task/value/taskStatus.js');
      vi.mocked(mockTaskRepository.update).mockResolvedValue(
        new Task(
          BigInt(1),
          taskPublicId,
          'Task',
          null,
          null,
          TaskStatus.create('todo'),
          BigInt(1),
          now,
          now
        )
      );

      const res = await app.request(`/tasks/${taskPublicId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: null,
          dueDate: null,
        }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.description).toBeNull();
      expect(body.dueDate).toBeNull();
    });

    it('タスクが存在しない場合：404を返す', async () => {
      vi.mocked(mockTaskRepository.update).mockRejectedValue(new Error('Task not found'));

      const res = await app.request('/tasks/nonexistent', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Updated' }),
      });

      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.code).toBe(ErrorCode.TASK_NOT_FOUND);
    });

    it('タスク未検出以外のエラーの場合：エラーが伝播する', async () => {
      vi.mocked(mockTaskRepository.update).mockRejectedValue(new Error('connection lost'));

      const res = await app.request(`/tasks/${taskPublicId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Updated' }),
      });

      expect(res.status).toBe(500);
    });
  });

  describe('DELETE /tasks/:publicId', () => {
    it('タスクが存在する場合：204を返す', async () => {
      vi.mocked(mockTaskRepository.delete).mockResolvedValue(undefined);

      const res = await app.request(`/tasks/${taskPublicId}`, {
        method: 'DELETE',
      });

      expect(res.status).toBe(204);
    });

    it('タスクが存在しない場合：404を返す', async () => {
      vi.mocked(mockTaskRepository.delete).mockRejectedValue(new Error('Task not found'));

      const res = await app.request('/tasks/nonexistent', { method: 'DELETE' });

      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.code).toBe(ErrorCode.TASK_NOT_FOUND);
    });

    it('タスク未検出以外のエラーの場合：エラーが伝播する', async () => {
      vi.mocked(mockTaskRepository.delete).mockRejectedValue(new Error('connection lost'));

      const res = await app.request(`/tasks/${taskPublicId}`, { method: 'DELETE' });

      expect(res.status).toBe(500);
    });
  });
});

describe('Task Handler ガード節', () => {
  const mockDeps = {
    createTaskUseCase: { execute: vi.fn() },
    getTaskUseCase: { execute: vi.fn() },
    updateTaskUseCase: { execute: vi.fn() },
    deleteTaskUseCase: { execute: vi.fn() },
  };

  function makeMockContext() {
    return {
      req: { param: vi.fn().mockReturnValue(undefined), json: vi.fn() },
      json: vi.fn(),
    } as unknown as Context;
  }

  it('getTask: publicIdが未設定の場合：400を返す', async () => {
    const handler = createTaskHandler(mockDeps);
    const c = makeMockContext();
    await handler.getTask(c);
    expect(c.json).toHaveBeenCalledWith({ code: ErrorCode.PUBLIC_ID_REQUIRED }, 400);
  });

  it('updateTask: publicIdが未設定の場合：400を返す', async () => {
    const handler = createTaskHandler(mockDeps);
    const c = makeMockContext();
    await handler.updateTask(c);
    expect(c.json).toHaveBeenCalledWith({ code: ErrorCode.PUBLIC_ID_REQUIRED }, 400);
  });

  it('deleteTask: publicIdが未設定の場合：400を返す', async () => {
    const handler = createTaskHandler(mockDeps);
    const c = makeMockContext();
    await handler.deleteTask(c);
    expect(c.json).toHaveBeenCalledWith({ code: ErrorCode.PUBLIC_ID_REQUIRED }, 400);
  });
});
