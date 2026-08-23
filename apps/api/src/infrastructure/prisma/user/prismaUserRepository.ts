import type { PrismaClient } from 'db/generated/prisma/index.js';
import { User } from '../../../domain/user/entity.js';
import type { IUserRepository, UserUpdateData } from '../../../domain/user/repository.js';
import { Email } from '../../../domain/user/value/email.js';
import { Username } from '../../../domain/user/value/username.js';

/**
 * Prismaを使ったユーザーリポジトリの実装クラス。
 * `IUserRepository` インターフェースに従い、データベースへのCRUD操作を行う。
 */
export class PrismaUserRepository implements IUserRepository {
  /**
   * @param prisma Prismaクライアント
   */
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * ユーザーをデータベースに新規保存する。
   * @param user 保存するユーザーエンティティ
   * @returns 保存されたユーザーエンティティ
   */
  async save(user: User): Promise<User> {
    const created = await this.prisma.user.create({
      data: {
        username: user.username.toString(),
        email: user.email?.toString() ?? null,
        firstName: user.firstName,
        lastName: user.lastName,
        passwordHash: user.passwordHash,
      },
    });
    return this.toEntity(created);
  }

  /**
   * ユーザー名でユーザーを取得する。
   * @param username 検索するユーザー名
   * @returns 該当するユーザーエンティティ。存在しない場合は `null`
   */
  async findByUsername(username: string): Promise<User | null> {
    const found = await this.prisma.user.findUnique({ where: { username } });
    if (!found) return null;
    return this.toEntity(found);
  }

  /**
   * メールアドレスでユーザーを取得する。
   * @param email 検索するメールアドレス
   * @returns 該当するユーザーエンティティ。存在しない場合は `null`
   */
  async findByEmail(email: string): Promise<User | null> {
    const found = await this.prisma.user.findUnique({ where: { email } });
    if (!found) return null;
    return this.toEntity(found);
  }

  /**
   * ユーザー情報を更新する。
   * @param username 更新対象のユーザー名
   * @param data 更新するフィールドのデータ
   * @returns 更新後のユーザーエンティティ
   * @throws ユーザーが存在しない場合にエラーをスローする
   */
  async update(username: string, data: UserUpdateData): Promise<User> {
    const found = await this.prisma.user.findUnique({ where: { username } });
    if (!found) {
      throw new Error('User not found');
    }

    const prismaData: Record<string, unknown> = {};
    if ('username' in data) prismaData.username = data.username?.toString();
    if ('email' in data) prismaData.email = data.email?.toString() ?? null;
    if ('firstName' in data) prismaData.firstName = data.firstName;
    if ('lastName' in data) prismaData.lastName = data.lastName;
    if ('passwordHash' in data) prismaData.passwordHash = data.passwordHash;

    const updated = await this.prisma.user.update({
      where: { username },
      data: prismaData,
    });
    return this.toEntity(updated);
  }

  /**
   * ユーザーを削除する。
   * @param username 削除対象のユーザー名
   * @throws ユーザーが存在しない場合にエラーをスローする
   */
  async delete(username: string): Promise<void> {
    const found = await this.prisma.user.findUnique({ where: { username } });
    if (!found) {
      throw new Error('User not found');
    }
    await this.prisma.user.delete({ where: { username } });
  }

  /**
   * Prismaのレコードをユーザーエンティティに変換する。
   * @param record Prismaから取得したユーザーレコード
   * @returns 変換されたユーザーエンティティ
   */
  private toEntity(record: {
    id: bigint;
    username: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    passwordHash: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): User {
    return new User(
      record.id,
      Username.create(record.username),
      record.email ? Email.create(record.email) : null,
      record.firstName,
      record.lastName,
      record.passwordHash,
      record.createdAt,
      record.updatedAt
    );
  }
}
