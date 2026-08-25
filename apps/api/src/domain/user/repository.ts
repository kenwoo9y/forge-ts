import type { User } from './entity.js';

/**
 * Interface for the user repository.
 * Abstracts persistence and retrieval of users.
 */
export interface IUserRepository {
  /**
   * Saves a new user.
   * @param user The user entity to save
   * @returns The saved user entity
   */
  save(user: User): Promise<User>;

  /**
   * Gets a user by username.
   * @param username The username to search for
   * @returns The matching user. `null` if it does not exist
   */
  findByUsername(username: string): Promise<User | null>;
}
