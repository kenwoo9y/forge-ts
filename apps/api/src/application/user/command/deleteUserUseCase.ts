import type { IUserRepository } from '../../../domain/user/repository.js';

/**
 * ユーザー削除ユースケースのインターフェース。
 */
export interface IDeleteUserUseCase {
  /**
   * ユーザーを削除する。
   * @param username 削除対象のユーザー名
   * @returns 削除に成功した場合は `true`、ユーザーが存在しない場合は `false`
   */
  execute(username: string): Promise<boolean>;
}

/**
 * ユーザー削除ユースケースの実装クラス。
 */
export class DeleteUserUseCase implements IDeleteUserUseCase {
  /**
   * @param userRepository ユーザーリポジトリ
   */
  constructor(private readonly userRepository: IUserRepository) {}

  /**
   * ユーザーを削除する。
   * @param username 削除対象のユーザー名
   * @returns 削除に成功した場合は `true`、ユーザーが存在しない場合は `false`
   */
  async execute(username: string): Promise<boolean> {
    try {
      await this.userRepository.delete(username);
      return true;
    } catch (e) {
      if (e instanceof Error && e.message === 'User not found') {
        return false;
      }
      /* c8 ignore next */
      throw e;
    }
  }
}
