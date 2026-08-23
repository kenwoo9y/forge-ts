import { ErrorCode } from 'error';
import type { Context } from 'hono';
import type { CreateTaskInput, UpdateTaskInput } from 'schema';
import type { ICreateTaskUseCase } from '../../../application/task/command/createTaskUseCase.js';
import type { IDeleteTaskUseCase } from '../../../application/task/command/deleteTaskUseCase.js';
import type { IUpdateTaskUseCase } from '../../../application/task/command/updateTaskUseCase.js';
import type { IGetTaskUseCase } from '../../../application/task/query/getTaskUseCase.js';

/**
 * タスクハンドラーの依存関係インターフェース。
 * タスク操作に必要なすべてのユースケースを保持する。
 */
export interface TaskHandlerDeps {
  /** タスク作成ユースケース */
  createTaskUseCase: ICreateTaskUseCase;
  /** タスク取得ユースケース */
  getTaskUseCase: IGetTaskUseCase;
  /** タスク更新ユースケース */
  updateTaskUseCase: IUpdateTaskUseCase;
  /** タスク削除ユースケース */
  deleteTaskUseCase: IDeleteTaskUseCase;
}

/**
 * タスク関連のHTTPハンドラーを生成する。
 * @param deps ハンドラーが使用するユースケースの依存関係
 * @returns タスク操作のハンドラーオブジェクト
 */
export function createTaskHandler(deps: TaskHandlerDeps) {
  return {
    /**
     * タスクを作成するハンドラー。
     * POST /tasks に対応する。
     * @param c Honoのコンテキスト
     * @returns 作成されたタスク情報（201）
     */
    createTask: async (c: Context) => {
      const validated = await c.req.json<CreateTaskInput>();
      const task = await deps.createTaskUseCase.execute({
        title: validated.title,
        description: validated.description ?? null,
        dueDate: validated.dueDate ? new Date(validated.dueDate) : null,
        status: validated.status,
        ownerId: BigInt(validated.ownerId),
      });
      return c.json(
        {
          publicId: task.publicId,
          title: task.title,
          description: task.description,
          dueDate: task.dueDate?.toISOString() ?? null,
          status: task.status,
          ownerId: task.ownerId.toString(),
          createdAt: task.createdAt.toISOString(),
          updatedAt: task.updatedAt.toISOString(),
        },
        201
      );
    },

    /**
     * タスクを取得するハンドラー。
     * GET /tasks/:publicId に対応する。
     * @param c Honoのコンテキスト
     * @returns タスク情報（200）、またはエラー（404）
     */
    getTask: async (c: Context) => {
      const publicId = c.req.param('publicId');
      if (!publicId) {
        return c.json({ code: ErrorCode.PUBLIC_ID_REQUIRED }, 400);
      }
      const task = await deps.getTaskUseCase.execute(publicId);
      if (!task) {
        return c.json({ code: ErrorCode.TASK_NOT_FOUND }, 404);
      }
      return c.json({
        publicId: task.publicId,
        title: task.title,
        description: task.description,
        dueDate: task.dueDate?.toISOString() ?? null,
        status: task.status,
        ownerId: task.ownerId.toString(),
        createdAt: task.createdAt.toISOString(),
        updatedAt: task.updatedAt.toISOString(),
      });
    },

    /**
     * タスクを更新するハンドラー。
     * PATCH /tasks/:publicId に対応する。
     * @param c Honoのコンテキスト
     * @returns 更新後のタスク情報（200）、またはエラー（404）
     */
    updateTask: async (c: Context) => {
      const publicId = c.req.param('publicId');
      if (!publicId) {
        return c.json({ code: ErrorCode.PUBLIC_ID_REQUIRED }, 400);
      }
      const validated = await c.req.json<UpdateTaskInput>();
      const input: Record<string, unknown> = {};
      if ('title' in validated) input.title = validated.title;
      if ('description' in validated) input.description = validated.description ?? null;
      if ('dueDate' in validated)
        input.dueDate = validated.dueDate ? new Date(validated.dueDate) : null;
      if ('status' in validated) input.status = validated.status;
      if ('ownerId' in validated) input.ownerId = BigInt(validated.ownerId as string | number);

      const task = await deps.updateTaskUseCase.execute(publicId, input);
      if (!task) {
        return c.json({ code: ErrorCode.TASK_NOT_FOUND }, 404);
      }
      return c.json({
        publicId: task.publicId,
        title: task.title,
        description: task.description,
        dueDate: task.dueDate?.toISOString() ?? null,
        status: task.status,
        ownerId: task.ownerId.toString(),
        createdAt: task.createdAt.toISOString(),
        updatedAt: task.updatedAt.toISOString(),
      });
    },

    /**
     * タスクを削除するハンドラー。
     * DELETE /tasks/:publicId に対応する。
     * @param c Honoのコンテキスト
     * @returns 空レスポンス（204）、またはエラー（404）
     */
    deleteTask: async (c: Context) => {
      const publicId = c.req.param('publicId');
      if (!publicId) {
        return c.json({ code: ErrorCode.PUBLIC_ID_REQUIRED }, 400);
      }
      const deleted = await deps.deleteTaskUseCase.execute(publicId);
      if (!deleted) {
        return c.json({ code: ErrorCode.TASK_NOT_FOUND }, 404);
      }
      return c.body(null, 204);
    },
  };
}
