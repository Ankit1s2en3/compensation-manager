/**
 * Issues an opaque bearer token for `userId`, carrying `claims`. The
 * application layer doesn't know or care that this is a JWT — that detail
 * belongs to infrastructure/JwtTokenIssuer.
 */
export interface TokenIssuer {
  issue(userId: string, claims: Record<string, unknown>): string;
}
