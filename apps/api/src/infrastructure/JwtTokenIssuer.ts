import jwt from 'jsonwebtoken';

import type { TokenIssuer } from '../application/ports/TokenIssuer.js';

const EIGHT_HOURS_IN_SECONDS = 8 * 60 * 60;

/**
 * The signing algorithm. http/middleware/requireAuth.ts's verify allow-list
 * must match this exactly — an allow-list, not just "whatever we happen to
 * sign with", so a token forged with a different (or "none") algorithm is
 * rejected rather than silently accepted.
 */
const ALGORITHM = 'HS256';

export class JwtTokenIssuer implements TokenIssuer {
  constructor(
    private readonly secret: string,
    /** Seconds. Overridable only so tests can mint an already-expired token. */
    private readonly expiresInSeconds: number = EIGHT_HOURS_IN_SECONDS,
  ) {}

  issue(userId: string, claims: Record<string, unknown>): string {
    return jwt.sign(claims, this.secret, {
      subject: userId,
      expiresIn: this.expiresInSeconds,
      algorithm: ALGORITHM,
    });
  }
}
