import { compare } from 'bcryptjs';
import type { IUserRepository } from '../../domain/user/repository.js';
import { signToken } from '../../infrastructure/auth/jwt.js';

export interface SignInInput {
  username: string;
  password: string;
}

export interface SignInOutput {
  token: string;
  username: string;
}

export interface ISignInUseCase {
  execute(input: SignInInput): Promise<SignInOutput | null>;
}

/**
 * サインインユースケース。
 * ユーザー名・パスワードを検証し、JWT を発行する。
 */
export class SignInUseCase implements ISignInUseCase {
  /**
   * @param userRepository ユーザーリポジトリ
   * @param jwtSecret JWT 署名シークレット
   */
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly jwtSecret: string
  ) {}

  /**
   * 認証を行い JWT を返す。
   * @param input ユーザー名とパスワード
   * @returns JWT とユーザー名。認証失敗時は `null`
   */
  async execute(input: SignInInput): Promise<SignInOutput | null> {
    const user = await this.userRepository.findByUsername(input.username);
    if (!user?.passwordHash) return null;

    const valid = await compare(input.password, user.passwordHash);
    if (!valid) return null;

    const token = await signToken({ username: user.username.toString() }, this.jwtSecret);
    return { token, username: user.username.toString() };
  }
}
