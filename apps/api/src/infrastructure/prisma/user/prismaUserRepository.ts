import type { PrismaClient } from 'db/generated/prisma/index.js';
import { User } from '../../../domain/user/entity.js';
import type { IUserRepository } from '../../../domain/user/repository.js';
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
   * Prismaのレコードをユーザーエンティティに変換する。
   * @param record Prismaから取得したユーザーレコード
   * @returns 変換されたユーザーエンティティ
   */
  private toEntity(record: {
    id: bigint;
    username: string;
    passwordHash: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): User {
    return new User(
      record.id,
      Username.create(record.username),
      record.passwordHash,
      record.createdAt,
      record.updatedAt
    );
  }
}
