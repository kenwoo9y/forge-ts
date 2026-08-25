import type { PrismaClient } from 'db/generated/prisma/index.js';
import type {
  IUserQueryService,
  UserReadModel,
} from '../../../application/user/query/queryService.js';

/**
 * Implementation class for the user query service using Prisma.
 * Performs read-only user lookups in accordance with the `IUserQueryService` interface.
 */
export class PrismaUserQueryService implements IUserQueryService {
  /**
   * @param prisma The Prisma client
   */
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Gets a user by username.
   * @param username The username to search for
   * @returns The matching user's read model. `null` if it does not exist
   */
  async findByUsername(username: string): Promise<UserReadModel | null> {
    const found = await this.prisma.user.findUnique({
      where: { username },
    });
    if (!found) return null;
    return {
      id: found.id,
      username: found.username,
      createdAt: found.createdAt,
      updatedAt: found.updatedAt,
    };
  }
}
