import type { TaskReadModel } from '../dto.js';
import type { ITaskQueryService } from './queryService.js';

/**
 * タスク取得ユースケースのインターフェース。
 */
export interface IGetTaskUseCase {
  /**
   * 公開IDでタスクを取得する。
   * @param publicId 検索するタスクの公開ID
   * @returns 該当するタスクの読み取りモデル。存在しない場合は `null`
   */
  execute(publicId: string): Promise<TaskReadModel | null>;
}

/**
 * タスク取得ユースケースの実装クラス。
 */
export class GetTaskUseCase implements IGetTaskUseCase {
  /**
   * @param taskQueryService タスククエリサービス
   */
  constructor(private readonly taskQueryService: ITaskQueryService) {}

  /**
   * 公開IDでタスクを取得する。
   * @param publicId 検索するタスクの公開ID
   * @returns 該当するタスクの読み取りモデル。存在しない場合は `null`
   */
  async execute(publicId: string): Promise<TaskReadModel | null> {
    return this.taskQueryService.findByPublicId(publicId);
  }
}
