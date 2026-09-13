/** The value shipped in .env.example — fine for local dev, never in production. */
const DEV_PLACEHOLDER = 'dev-only-change-me';

/**
 * Reads and validates JWT_SECRET. Throws at startup — not on the first
 * request — if it's missing outright, or if it's still the dev placeholder
 * while NODE_ENV is production.
 */
export function loadJwtSecret(env: NodeJS.ProcessEnv = process.env): string {
  const secret = env.JWT_SECRET;
  if (secret === undefined || secret.length === 0) {
    throw new Error('JWT_SECRET is not set');
  }
  if (env.NODE_ENV === 'production' && secret === DEV_PLACEHOLDER) {
    throw new Error(
      `JWT_SECRET is still the development placeholder ("${DEV_PLACEHOLDER}") — set a real secret before running in production`,
    );
  }
  return secret;
}
