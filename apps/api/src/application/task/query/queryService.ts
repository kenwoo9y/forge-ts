import type { TaskReadModel } from '../dto.js';

export type { TaskReadModel };

/**
 * タスククエリサービスのインターフェース。
 * 読み取り専用のタスク検索を抽象化する。
 */
export interface ITaskQueryService {
  /**
   * 公開IDでタスクを取得する。
   * @param publicId 検索するタスクの公開ID
   * @returns 該当するタスクの読み取りモデル。存在しない場合は `null`
   */
  findByPublicId(publicId: string): Promise<TaskReadModel | null>;

  /**
   * 所有者IDでタスク一覧を取得する。
   * @param ownerId 検索する所有者のユーザーID
   * @returns 該当するタスクの読み取りモデルの配列
   */
  findByOwnerId(ownerId: bigint): Promise<TaskReadModel[]>;
}
