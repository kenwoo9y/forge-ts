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
 * Sign-in use case.
 * Verifies the username and password, and issues a JWT.
 */
export class SignInUseCase implements ISignInUseCase {
  /**
   * @param userRepository The user repository
   * @param jwtSecret The JWT signing secret
   */
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly jwtSecret: string
  ) {}

  /**
   * Authenticates and returns a JWT.
   * @param input The username and password
   * @returns The JWT and username. `null` if authentication fails
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
