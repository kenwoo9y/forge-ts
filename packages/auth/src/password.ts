import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

/**
 * パスワードをハッシュ化する。
 * @param password 平文パスワード
 * @returns ハッシュ化されたパスワード
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * 平文パスワードとハッシュを照合する。
 * @param password 平文パスワード
 * @param hash bcrypt ハッシュ
 * @returns 一致する場合 `true`
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
