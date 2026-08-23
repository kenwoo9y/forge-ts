import type { Email } from './value/email.js';
import type { Username } from './value/username.js';

/**
 * ユーザーエンティティ。
 * システム上のユーザーを表すドメインオブジェクト。
 */
export class User {
  /**
   * @param id 内部的な自動採番ID
   * @param username ユーザー名（値オブジェクト）
   * @param email メールアドレス（値オブジェクト）。未設定の場合は `null`
   * @param firstName 名。未設定の場合は `null`
   * @param lastName 姓。未設定の場合は `null`
   * @param passwordHash パスワードハッシュ。未設定の場合は `null`
   * @param createdAt 作成日時
   * @param updatedAt 更新日時
   */
  constructor(
    public readonly id: bigint,
    public readonly username: Username,
    public readonly email: Email | null,
    public readonly firstName: string | null,
    public readonly lastName: string | null,
    public readonly passwordHash: string | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date
  ) {}
}
