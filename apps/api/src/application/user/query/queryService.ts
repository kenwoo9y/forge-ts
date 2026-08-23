import type { UserReadModel } from '../dto.js';

export type { UserReadModel };

/**
 * ユーザークエリサービスのインターフェース。
 * 読み取り専用のユーザー検索を抽象化する。
 */
export interface IUserQueryService {
  /**
   * ユーザー名でユーザーを取得する。
   * @param username 検索するユーザー名
   * @returns 該当するユーザーの読み取りモデル。存在しない場合は `null`
   */
  findByUsername(username: string): Promise<UserReadModel | null>;
}
