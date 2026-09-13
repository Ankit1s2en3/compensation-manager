import { scryptSync, timingSafeEqual } from 'node:crypto';

/**
 * Verifies a password against the seed's stored format: `scrypt$<salt>$<hex>`.
 * Re-derives the hash with the stored salt and the stored hash's own byte
 * length (so the two buffers compared are always equal length — the derived
 * one is never trusted as a fixed constant), then compares with
 * timingSafeEqual. Never `===`: a plain string compare short-circuits on the
 * first differing byte, leaking the hash a character at a time through
 * response timing.
 *
 * Malformed stored hashes fail closed (return false) rather than throwing —
 * a corrupt row should read as "wrong password", not crash the request.
 */
export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') {
    return false;
  }
  const [, salt, hex] = parts;
  if (salt === undefined || hex === undefined || salt === '' || hex === '') {
    return false;
  }

  const expected = Buffer.from(hex, 'hex');
  if (expected.length === 0) {
    return false;
  }

  const candidate = scryptSync(password, salt, expected.length);
  return timingSafeEqual(candidate, expected);
}
