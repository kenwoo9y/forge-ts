import type { MiddlewareHandler } from 'hono';
import { verifyToken } from './jwt.js';

/**
 * JWT 認証ミドルウェアファクトリー。
 * Authorization: Bearer <token> ヘッダーを検証し、
 * 検証済みペイロードを `c.set('jwtPayload', payload)` で後続に渡す。
 * @param secret JWT 署名シークレット
 */
export function jwtAuth(secret: string): MiddlewareHandler {
  return async (c, next) => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    const token = authHeader.slice(7);
    try {
      const payload = await verifyToken(token, secret);
      c.set('jwtPayload', payload);
      await next();
    } catch {
      return c.json({ error: 'Unauthorized' }, 401);
    }
  };
}
