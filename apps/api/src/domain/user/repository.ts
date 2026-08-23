import type { User } from './entity.js';

type Mutable<T> = { -readonly [K in keyof T]: T[K] };

/**
 * ユーザーの更新データ型。
 * `id`・`createdAt`・`updatedAt` を除くすべてのフィールドを部分的に更新できる。
 */
export type UserUpdateData = Partial<Mutable<Omit<User, 'id' | 'createdAt' | 'updatedAt'>>>;

/**
 * ユーザーリポジトリのインターフェース。
 * ユーザーの永続化・取得・更新・削除を抽象化する。
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

  /**
   * メールアドレスでユーザーを取得する。
   * @param email 検索するメールアドレス
   * @returns 該当するユーザー。存在しない場合は `null`
   */
  findByEmail(email: string): Promise<User | null>;

  /**
   * ユーザー情報を更新する。
   * @param username 更新対象のユーザー名
   * @param data 更新するフィールドのデータ
   * @returns 更新後のユーザーエンティティ
   * @throws ユーザーが存在しない場合にエラーをスローする
   */
  update(username: string, data: UserUpdateData): Promise<User>;

  /**
   * ユーザーを削除する。
   * @param username 削除対象のユーザー名
   * @throws ユーザーが存在しない場合にエラーをスローする
   */
  delete(username: string): Promise<void>;
}
