import { ValueObject } from '../../shared/valueObject.js';

const VALID_STATUSES = ['todo', 'doing', 'done'] as const;
type TaskStatusValue = (typeof VALID_STATUSES)[number];

/**
 * タスクのステータスを表す値オブジェクト。
 * 有効な値は `'todo'`・`'doing'`・`'done'` のいずれか。
 */
export class TaskStatus extends ValueObject<TaskStatusValue> {
  private constructor(value: TaskStatusValue) {
    super(value);
  }

  /**
   * 文字列から `TaskStatus` 値オブジェクトを生成する。
   * @param value ステータス文字列
   * @returns 生成された `TaskStatus` インスタンス
   * @throws 有効なステータス値でない場合にエラーをスローする
   */
  static create(value: string): TaskStatus {
    /* c8 ignore next 4 -- validated by Zod schema before reaching domain */
    if (!VALID_STATUSES.includes(value as TaskStatusValue)) {
      throw new Error(
        `Invalid task status: ${value}. Must be one of: ${VALID_STATUSES.join(', ')}`
      );
    }
    return new TaskStatus(value as TaskStatusValue);
  }

  /**
   * ステータスの文字列表現を返す。
   * @returns ステータス文字列
   */
  toString(): string {
    return this.value;
  }
}
