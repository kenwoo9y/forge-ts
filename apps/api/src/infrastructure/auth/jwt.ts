import { type JWTPayload, jwtVerify, SignJWT } from 'jose';

export interface TokenPayload extends JWTPayload {
  username: string;
}

/**
 * Signs and issues a JWT token.
 * Used by the Hono API's authentication endpoints.
 * @param payload The payload to include in the token
 * @param secret The signing secret
 * @param expiresIn The expiration time (e.g. '7d', '1h')
 * @returns The signed JWT string
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
 * Verifies a JWT token and returns its payload.
 * Used by Hono's authentication middleware.
 * @param token The JWT string
 * @param secret The signing secret
 * @returns The verified payload
 * @throws An error if the token is invalid or expired
 */
export async function verifyToken(token: string, secret: string): Promise<TokenPayload> {
  const key = new TextEncoder().encode(secret);
  const { payload } = await jwtVerify<TokenPayload>(token, key);
  return payload;
}
