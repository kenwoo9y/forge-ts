import type { User } from './entity.js';

/**
 * ユーザーリポジトリのインターフェース。
 * ユーザーの永続化・取得を抽象化する。
 */
export interface IUserRepository {
  /**
   * ユーザーを新規保存する。
   * @param user 保存するユーザーエンティティ
   * @returns 保存されたユーザーエンティティ
   */
  save(user: User): Promise<User>;

  /**
   * ユーザー名でユーザーを取得する。
   * @param username 検索するユーザー名
   * @returns 該当するユーザー。存在しない場合は `null`
   */
  findByUsername(username: string): Promise<User | null>;
}
