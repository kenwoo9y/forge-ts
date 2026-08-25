import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

/**
 * Hashes a password.
 * @param password Plain-text password
 * @returns The hashed password
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verifies a plain-text password against a hash.
 * @param password Plain-text password
 * @param hash bcrypt hash
 * @returns `true` if they match
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
