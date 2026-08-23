import type { ITaskRepository, TaskUpdateData } from '../../../domain/task/repository.js';
import { TaskStatus } from '../../../domain/task/value/taskStatus.js';
import type { UpdateTaskInput, UpdateTaskOutput } from '../dto.js';

/**
 * タスク更新ユースケースのインターフェース。
 */
export interface IUpdateTaskUseCase {
  /**
   * タスクを更新する。
   * @param publicId 更新対象のタスクの公開ID
   * @param input 更新する内容
   * @returns 更新後のタスクの出力データ。タスクが存在しない場合は `null`
   */
  execute(publicId: string, input: UpdateTaskInput): Promise<UpdateTaskOutput | null>;
}

/**
 * タスク更新ユースケースの実装クラス。
 * 入力データをタスク更新用データ型に変換してリポジトリに渡す。
 */
export class UpdateTaskUseCase implements IUpdateTaskUseCase {
  /**
   * @param taskRepository タスクリポジトリ
   */
  constructor(private readonly taskRepository: ITaskRepository) {}

  /**
   * タスクを更新する。
   * @param publicId 更新対象のタスクの公開ID
   * @param input 更新する内容
   * @returns 更新後のタスクの出力データ。タスクが存在しない場合は `null`
   */
  async execute(publicId: string, input: UpdateTaskInput): Promise<UpdateTaskOutput | null> {
    const data: TaskUpdateData = {};

    if ('title' in input) data.title = input.title;
    if ('description' in input) data.description = input.description ?? null;
    if ('dueDate' in input) data.dueDate = input.dueDate ?? null;
    if ('status' in input) data.status = TaskStatus.create(input.status as string);
    if ('ownerId' in input) data.ownerId = input.ownerId;

    try {
      const saved = await this.taskRepository.update(publicId, data);
      return {
        publicId: saved.publicId,
        title: saved.title,
        description: saved.description,
        dueDate: saved.dueDate,
        status: saved.status.toString(),
        ownerId: saved.ownerId,
        createdAt: saved.createdAt,
        updatedAt: saved.updatedAt,
      };
    } catch (e) {
      if (e instanceof Error && e.message === 'Task not found') {
        return null;
      }
      /* c8 ignore next */
      throw e;
    }
  }
}
