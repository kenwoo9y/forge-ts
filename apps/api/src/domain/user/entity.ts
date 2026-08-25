import type { Username } from './value/username.js';

/**
 * User entity.
 * A domain object representing a user in the system.
 */
export class User {
  /**
   * @param id Internal auto-incremented ID
   * @param username Username (value object)
   * @param passwordHash Password hash. `null` if not set
   * @param createdAt Creation timestamp
   * @param updatedAt Update timestamp
   */
  constructor(
    public readonly id: bigint,
    public readonly username: Username,
    public readonly passwordHash: string | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date
  ) {}
}
