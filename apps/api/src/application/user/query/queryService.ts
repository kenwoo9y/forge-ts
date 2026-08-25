import type { UserReadModel } from '../dto.js';

export type { UserReadModel };

/**
 * Interface for the user query service.
 * Abstracts read-only user lookups.
 */
export interface IUserQueryService {
  /**
   * Gets a user by username.
   * @param username The username to search for
   * @returns The matching user's read model. `null` if it does not exist
   */
  findByUsername(username: string): Promise<UserReadModel | null>;
}
