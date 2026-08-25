import type { MiddlewareHandler } from 'hono';
import { verifyToken } from './jwt.js';

/**
 * JWT authentication middleware factory.
 * Verifies the Authorization: Bearer <token> header, and
 * passes the verified payload downstream via `c.set('jwtPayload', payload)`.
 * @param secret The JWT signing secret
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
