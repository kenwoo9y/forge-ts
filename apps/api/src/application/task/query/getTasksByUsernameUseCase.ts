import type { IUserQueryService } from '../../user/query/queryService.js';
import type { TaskReadModel } from '../dto.js';
import type { ITaskQueryService } from './queryService.js';

/**
 * ユーザー名でタスク一覧を取得するユースケースのインターフェース。
 */
export interface IGetTasksByUsernameUseCase {
  /**
   * ユーザー名に紐づくタスク一覧を取得する。
   * @param username 検索するユーザーのユーザー名
   * @returns タスクの読み取りモデルの配列。ユーザーが存在しない場合は `null`
   */
  execute(username: string): Promise<TaskReadModel[] | null>;
}

/**
 * ユーザー名でタスク一覧を取得するユースケースの実装クラス。
 * ユーザーの存在確認を行ってからそのユーザーのタスクを返す。
 */
export class GetTasksByUsernameUseCase implements IGetTasksByUsernameUseCase {
  /**
   * @param taskQueryService タスククエリサービス
   * @param userQueryService ユーザークエリサービス
   */
  constructor(
    private readonly taskQueryService: ITaskQueryService,
    private readonly userQueryService: IUserQueryService
  ) {}

  /**
   * ユーザー名に紐づくタスク一覧を取得する。
   * @param username 検索するユーザーのユーザー名
   * @returns タスクの読み取りモデルの配列。ユーザーが存在しない場合は `null`
   */
  async execute(username: string): Promise<TaskReadModel[] | null> {
    const user = await this.userQueryService.findByUsername(username);
    if (!user) {
      return null;
    }
    return this.taskQueryService.findByOwnerId(user.id);
  }
}
