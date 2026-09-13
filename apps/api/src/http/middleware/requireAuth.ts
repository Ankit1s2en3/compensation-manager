import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

declare global {
  namespace Express {
    interface Request {
      /** Set by requireAuth once the bearer token verifies. */
      auth?: { userId: string; role: string };
    }
  }
}

const BEARER_PREFIX = 'Bearer ';

/**
 * This allow-list must match JwtTokenIssuer's signing algorithm exactly —
 * see the comment there. Without an explicit allow-list, jwt.verify would
 * accept a token signed with any algorithm the header claims, including
 * "none".
 */
const ALGORITHM = 'HS256';

/**
 * Reads `Authorization: Bearer <token>`, verifies it against `secret`, and
 * sets req.auth = { userId, role }. 401 with a distinct code for each of the
 * three ways this can fail, so a client (or a test) can tell them apart.
 */
export function requireAuth(secret: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const header = req.header('authorization');
    if (header === undefined || !header.startsWith(BEARER_PREFIX)) {
      res
        .status(401)
        .json({ error: 'Missing bearer token', code: 'MISSING_TOKEN' });
      return;
    }

    const token = header.slice(BEARER_PREFIX.length);

    try {
      const decoded = jwt.verify(token, secret, { algorithms: [ALGORITHM] });
      if (typeof decoded === 'string' || typeof decoded.sub !== 'string') {
        res
          .status(401)
          .json({ error: 'Malformed token', code: 'MALFORMED_TOKEN' });
        return;
      }
      req.auth = {
        userId: decoded.sub,
        role: typeof decoded.role === 'string' ? decoded.role : '',
      };
      next();
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
        return;
      }
      res.status(401).json({ error: 'Malformed token', code: 'MALFORMED_TOKEN' });
    }
  };
}
