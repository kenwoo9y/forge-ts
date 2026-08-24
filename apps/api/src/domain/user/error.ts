/**
 * ユーザー名が既に使用されている場合にスローされるエラー。
 */
export class UsernameDuplicateError extends Error {
  /**
   * @param username 重複したユーザー名
   */
  constructor(username: string) {
    super(`Username '${username}' is already taken`);
    this.name = 'UsernameDuplicateError';
  }
}
