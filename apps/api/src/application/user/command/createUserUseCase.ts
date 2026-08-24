import { hash } from 'bcryptjs';
import { User } from '../../../domain/user/entity.js';
import { UsernameDuplicateError } from '../../../domain/user/error.js';
import type { IUserRepository } from '../../../domain/user/repository.js';
import { Username } from '../../../domain/user/value/username.js';
import type { CreateUserInput, CreateUserOutput } from '../dto.js';

/**
 * ユーザー作成ユースケースのインターフェース。
 */
export interface ICreateUserUseCase {
  /**
   * ユーザーを作成する。
   * @param input ユーザー作成に必要な入力データ
   * @returns 作成されたユーザーの出力データ
   */
  execute(input: CreateUserInput): Promise<CreateUserOutput>;
}

/**
 * ユーザー作成ユースケースの実装クラス。
 * ユーザー名・メールアドレスの重複チェックを行い、ユーザーを保存する。
 */
export class CreateUserUseCase implements ICreateUserUseCase {
  /**
   * @param userRepository ユーザーリポジトリ
   */
  constructor(private readonly userRepository: IUserRepository) {}

  /**
   * ユーザーを作成する。
   * @param input ユーザー作成に必要な入力データ
   * @returns 作成されたユーザーの出力データ
   * @throws {UsernameDuplicateError} ユーザー名が既に使用されている場合
   */
  async execute(input: CreateUserInput): Promise<CreateUserOutput> {
    const username = Username.create(input.username);
    const existing = await this.userRepository.findByUsername(username.toString());
    if (existing) {
      throw new UsernameDuplicateError(username.toString());
    }
    const passwordHash = await hash(input.password, 12);
    const user = new User(BigInt(0), username, passwordHash, new Date(), new Date());
    const saved = await this.userRepository.save(user);
    return {
      username: saved.username.toString(),
      createdAt: saved.createdAt,
      updatedAt: saved.updatedAt,
    };
  }
}
