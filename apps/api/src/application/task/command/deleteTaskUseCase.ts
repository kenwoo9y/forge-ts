import type { ITaskRepository } from '../../../domain/task/repository.js';

/**
 * タスク削除ユースケースのインターフェース。
 */
export interface IDeleteTaskUseCase {
  /**
   * タスクを削除する。
   * @param publicId 削除対象のタスクの公開ID
   * @returns 削除に成功した場合は `true`、タスクが存在しない場合は `false`
   */
  execute(publicId: string): Promise<boolean>;
}

/**
 * タスク削除ユースケースの実装クラス。
 */
export class DeleteTaskUseCase implements IDeleteTaskUseCase {
  /**
   * @param taskRepository タスクリポジトリ
   */
  constructor(private readonly taskRepository: ITaskRepository) {}

  /**
   * タスクを削除する。
   * @param publicId 削除対象のタスクの公開ID
   * @returns 削除に成功した場合は `true`、タスクが存在しない場合は `false`
   */
  async execute(publicId: string): Promise<boolean> {
    try {
      await this.taskRepository.delete(publicId);
      return true;
    } catch (e) {
      if (e instanceof Error && e.message === 'Task not found') {
        return false;
      }
      /* c8 ignore next */
      throw e;
    }
  }
}
