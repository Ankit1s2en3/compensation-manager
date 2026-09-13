import type { TokenIssuer } from '../ports/TokenIssuer.js';

/** Records what it was asked to issue; the "token" is just a readable marker. */
export class FakeTokenIssuer implements TokenIssuer {
  readonly issueCalls: Array<{ userId: string; claims: Record<string, unknown> }> =
    [];

  issue(userId: string, claims: Record<string, unknown>): string {
    this.issueCalls.push({ userId, claims });
    return `fake-token:${userId}`;
  }
}
