import { ValueObject } from '../../shared/valueObject.js';

const USERNAME_MAX_LENGTH = 30;

/**
 * Value object representing a username.
 * Validates that it is at least 1 character and at most 30 characters.
 */
export class Username extends ValueObject<string> {
  private constructor(value: string) {
    super(value);
  }

  /**
   * Creates a `Username` value object from a string.
   * @param value The username string
   * @returns The created `Username` instance
   * @throws An error if the string is empty or exceeds the maximum length
   */
  static create(value: string): Username {
    /* c8 ignore start -- validated by Zod schema before reaching domain */
    if (value.length === 0) {
      throw new Error('Username must not be empty');
    }
    if (value.length > USERNAME_MAX_LENGTH) {
      throw new Error(`Username must be at most ${USERNAME_MAX_LENGTH} characters`);
    }
    /* c8 ignore stop */
    return new Username(value);
  }

  /**
   * Returns the string representation of the username.
   * @returns The username string
   */
  toString(): string {
    return this.value;
  }
}
