import type { PrismaClient } from 'db/generated/prisma/index.js';
import type {
  IUserQueryService,
  UserReadModel,
} from '../../../application/user/query/queryService.js';

/**
 * Prismaを使ったユーザークエリサービスの実装クラス。
 * `IUserQueryService` インターフェースに従い、読み取り専用のユーザー検索を行う。
 */
export class PrismaUserQueryService implements IUserQueryService {
  /**
   * @param prisma Prismaクライアント
   */
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * ユーザー名でユーザーを取得する。
   * @param username 検索するユーザー名
   * @returns 該当するユーザーの読み取りモデル。存在しない場合は `null`
   */
  async findByUsername(username: string): Promise<UserReadModel | null> {
    const found = await this.prisma.user.findUnique({
      where: { username },
    });
    if (!found) return null;
    return {
      id: found.id, // kept for internal use (e.g. task lookup by ownerId)
      username: found.username,
      email: found.email,
      firstName: found.firstName,
      lastName: found.lastName,
      createdAt: found.createdAt,
      updatedAt: found.updatedAt,
    };
  }
}
