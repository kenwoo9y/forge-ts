import type { UserReadModel } from '../dto.js';
import type { IUserQueryService } from './queryService.js';

/**
 * ユーザー取得ユースケースのインターフェース。
 */
export interface IGetUserUseCase {
  /**
   * ユーザー名でユーザーを取得する。
   * @param username 検索するユーザー名
   * @returns 該当するユーザーの読み取りモデル。存在しない場合は `null`
   */
  execute(username: string): Promise<UserReadModel | null>;
}

/**
 * ユーザー取得ユースケースの実装クラス。
 */
export class GetUserUseCase implements IGetUserUseCase {
  /**
   * @param userQueryService ユーザークエリサービス
   */
  constructor(private readonly userQueryService: IUserQueryService) {}

  /**
   * ユーザー名でユーザーを取得する。
   * @param username 検索するユーザー名
   * @returns 該当するユーザーの読み取りモデル。存在しない場合は `null`
   */
  async execute(username: string): Promise<UserReadModel | null> {
    return this.userQueryService.findByUsername(username);
  }
}
