import { scryptSync } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { verifyPassword } from './passwordHash.js';

function hashOf(password: string, salt = 'fixed-salt'): string {
  return `scrypt$${salt}$${scryptSync(password, salt, 64).toString('hex')}`;
}

describe('verifyPassword', () => {
  it('accepts the correct password', () => {
    expect(verifyPassword('correct-password', hashOf('correct-password'))).toBe(
      true,
    );
  });

  it('rejects the wrong password', () => {
    expect(verifyPassword('wrong-password', hashOf('correct-password'))).toBe(
      false,
    );
  });

  it('re-derives using the salt from the stored hash, not a fixed one', () => {
    expect(verifyPassword('correct-password', hashOf('correct-password', 'salt-a'))).toBe(
      true,
    );
    expect(verifyPassword('correct-password', hashOf('correct-password', 'salt-b'))).toBe(
      true,
    );
  });

  it('fails closed on a malformed stored hash instead of throwing', () => {
    expect(verifyPassword('anything', 'not-a-real-hash')).toBe(false);
    expect(verifyPassword('anything', 'scrypt$onlytwoparts')).toBe(false);
    expect(verifyPassword('anything', 'bcrypt$salt$hex')).toBe(false);
    expect(verifyPassword('anything', 'scrypt$$deadbeef')).toBe(false);
    expect(verifyPassword('anything', 'scrypt$salt$')).toBe(false);
  });
});
