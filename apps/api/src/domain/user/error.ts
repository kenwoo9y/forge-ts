/**
 * Error thrown when a username is already in use.
 */
export class UsernameDuplicateError extends Error {
  /**
   * @param username The duplicated username
   */
  constructor(username: string) {
    super(`Username '${username}' is already taken`);
    this.name = 'UsernameDuplicateError';
  }
}
