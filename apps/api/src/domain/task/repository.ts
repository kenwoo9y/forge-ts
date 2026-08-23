import type { Task } from './entity.js';

type Mutable<T> = { -readonly [K in keyof T]: T[K] };

/**
 * タスクの更新データ型。
 * `id`・`publicId`・`createdAt`・`updatedAt` を除くすべてのフィールドを部分的に更新できる。
 */
export type TaskUpdateData = Partial<
  Mutable<Omit<Task, 'id' | 'publicId' | 'createdAt' | 'updatedAt'>>
>;

/**
 * タスクリポジトリのインターフェース。
 * タスクの永続化・更新・削除を抽象化する。
 */
export interface ITaskRepository {
  /**
   * タスクを新規保存する。
   * @param task 保存するタスクエンティティ
   * @returns 保存されたタスクエンティティ
   */
  save(task: Task): Promise<Task>;

  /**
   * タスクを更新する。
   * @param publicId 更新対象のタスクの公開ID
   * @param data 更新するフィールドのデータ
   * @returns 更新後のタスクエンティティ
   * @throws タスクが存在しない場合にエラーをスローする
   */
  update(publicId: string, data: TaskUpdateData): Promise<Task>;

  /**
   * タスクを削除する。
   * @param publicId 削除対象のタスクの公開ID
   * @throws タスクが存在しない場合にエラーをスローする
   */
  delete(publicId: string): Promise<void>;
}
