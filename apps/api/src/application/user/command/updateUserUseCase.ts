import { hash } from 'bcryptjs';
import { EmailDuplicateError, UsernameDuplicateError } from '../../../domain/user/error.js';
import type { IUserRepository, UserUpdateData } from '../../../domain/user/repository.js';
import { Email } from '../../../domain/user/value/email.js';
import { Username } from '../../../domain/user/value/username.js';
import type { UpdateUserInput, UpdateUserOutput } from '../dto.js';

/**
 * ユーザー更新ユースケースのインターフェース。
 */
export interface IUpdateUserUseCase {
  /**
   * ユーザー情報を更新する。
   * @param username 更新対象のユーザー名
   * @param input 更新する内容
   * @returns 更新後のユーザーの出力データ。ユーザーが存在しない場合は `null`
   */
  execute(username: string, input: UpdateUserInput): Promise<UpdateUserOutput | null>;
}

/**
 * ユーザー更新ユースケースの実装クラス。
 * ユーザー名・メールアドレスの重複チェックを行い、ユーザー情報を更新する。
 */
export class UpdateUserUseCase implements IUpdateUserUseCase {
  /**
   * @param userRepository ユーザーリポジトリ
   */
  constructor(private readonly userRepository: IUserRepository) {}

  /**
   * ユーザー情報を更新する。
   * @param username 更新対象のユーザー名
   * @param input 更新する内容
   * @returns 更新後のユーザーの出力データ。ユーザーが存在しない場合は `null`
   * @throws {UsernameDuplicateError} 新しいユーザー名が既に使用されている場合
   * @throws {EmailDuplicateError} 新しいメールアドレスが既に使用されている場合
   */
  async execute(username: string, input: UpdateUserInput): Promise<UpdateUserOutput | null> {
    const data: UserUpdateData = {};

    if ('username' in input && input.username) {
      const newUsername = Username.create(input.username);
      if (input.username !== username) {
        const existing = await this.userRepository.findByUsername(newUsername.toString());
        if (existing) {
          throw new UsernameDuplicateError(newUsername.toString());
        }
      }
      data.username = newUsername;
    }
    if ('email' in input) {
      if (input.email) {
        const newEmail = Email.create(input.email);
        const currentUser = await this.userRepository.findByUsername(username);
        const currentEmail = currentUser?.email?.toString() ?? null;
        if (input.email !== currentEmail) {
          const existingEmail = await this.userRepository.findByEmail(newEmail.toString());
          if (existingEmail) {
            throw new EmailDuplicateError(newEmail.toString());
          }
        }
        data.email = newEmail;
      } else {
        data.email = null;
      }
    }
    if ('firstName' in input) data.firstName = input.firstName ?? null;
    if ('lastName' in input) data.lastName = input.lastName ?? null;
    if ('password' in input && input.password) {
      data.passwordHash = await hash(input.password, 12);
    }

    try {
      const saved = await this.userRepository.update(username, data);
      return {
        username: saved.username.toString(),
        email: saved.email?.toString() ?? null,
        firstName: saved.firstName,
        lastName: saved.lastName,
        createdAt: saved.createdAt,
        updatedAt: saved.updatedAt,
      };
    } catch (e) {
      if (e instanceof Error && e.message === 'User not found') {
        return null;
      }
      /* c8 ignore next */
      throw e;
    }
  }
}
