import { type JWTPayload, jwtVerify, SignJWT } from 'jose';

export interface TokenPayload extends JWTPayload {
  username: string;
}

/**
 * JWT トークンを署名して発行する。
 * Hono API の認証エンドポイントで使用する。
 * @param payload トークンに含めるペイロード
 * @param secret 署名シークレット
 * @param expiresIn 有効期限（例: '7d', '1h'）
 * @returns 署名済み JWT 文字列
 */
export async function signToken(
  payload: TokenPayload,
  secret: string,
  expiresIn = '24h'
): Promise<string> {
  const key = new TextEncoder().encode(secret);
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(key);
}

/**
 * JWT トークンを検証してペイロードを返す。
 * Hono の認証ミドルウェアで使用する。
 * @param token JWT 文字列
 * @param secret 署名シークレット
 * @returns 検証済みペイロード
 * @throws トークンが無効または期限切れの場合にエラーをスローする
 */
export async function verifyToken(token: string, secret: string): Promise<TokenPayload> {
  const key = new TextEncoder().encode(secret);
  const { payload } = await jwtVerify<TokenPayload>(token, key);
  return payload;
}
