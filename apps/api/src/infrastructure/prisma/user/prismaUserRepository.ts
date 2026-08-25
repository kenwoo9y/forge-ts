import type { PrismaClient } from 'db/generated/prisma/index.js';
import { User } from '../../../domain/user/entity.js';
import type { IUserRepository } from '../../../domain/user/repository.js';
import { Username } from '../../../domain/user/value/username.js';

/**
 * Implementation class for the user repository using Prisma.
 * Performs database CRUD operations in accordance with the `IUserRepository` interface.
 */
export class PrismaUserRepository implements IUserRepository {
  /**
   * @param prisma The Prisma client
   */
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Saves a new user to the database.
   * @param user The user entity to save
   * @returns The saved user entity
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
   * Gets a user by username.
   * @param username The username to search for
   * @returns The matching user entity. `null` if it does not exist
   */
  async findByUsername(username: string): Promise<User | null> {
    const found = await this.prisma.user.findUnique({ where: { username } });
    if (!found) return null;
    return this.toEntity(found);
  }

  /**
   * Converts a Prisma record into a user entity.
   * @param record The user record fetched from Prisma
   * @returns The converted user entity
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
