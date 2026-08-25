import type { UserReadModel } from '../dto.js';
import type { IUserQueryService } from './queryService.js';

/**
 * Interface for the get-user use case.
 */
export interface IGetUserUseCase {
  /**
   * Gets a user by username.
   * @param username The username to search for
   * @returns The matching user's read model. `null` if it does not exist
   */
  execute(username: string): Promise<UserReadModel | null>;
}

/**
 * Implementation class for the get-user use case.
 */
export class GetUserUseCase implements IGetUserUseCase {
  /**
   * @param userQueryService The user query service
   */
  constructor(private readonly userQueryService: IUserQueryService) {}

  /**
   * Gets a user by username.
   * @param username The username to search for
   * @returns The matching user's read model. `null` if it does not exist
   */
  async execute(username: string): Promise<UserReadModel | null> {
    return this.userQueryService.findByUsername(username);
  }
}
