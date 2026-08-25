import { hash } from 'bcryptjs';
import { User } from '../../../domain/user/entity.js';
import { UsernameDuplicateError } from '../../../domain/user/error.js';
import type { IUserRepository } from '../../../domain/user/repository.js';
import { Username } from '../../../domain/user/value/username.js';
import type { CreateUserInput, CreateUserOutput } from '../dto.js';

/**
 * Interface for the create-user use case.
 */
export interface ICreateUserUseCase {
  /**
   * Creates a user.
   * @param input The input data needed to create a user
   * @returns The output data for the created user
   */
  execute(input: CreateUserInput): Promise<CreateUserOutput>;
}

/**
 * Implementation class for the create-user use case.
 * Checks for username/email duplication and saves the user.
 */
export class CreateUserUseCase implements ICreateUserUseCase {
  /**
   * @param userRepository The user repository
   */
  constructor(private readonly userRepository: IUserRepository) {}

  /**
   * Creates a user.
   * @param input The input data needed to create a user
   * @returns The output data for the created user
   * @throws {UsernameDuplicateError} If the username is already in use
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
