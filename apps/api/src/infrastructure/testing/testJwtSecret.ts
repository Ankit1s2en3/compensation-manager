/**
 * Shared by every integration test file, so a token issued by one app
 * instance (its own createContainer/createServer call) verifies against
 * another's requireAuth — they're all "the same secret", just like in prod.
 */
export const TEST_JWT_SECRET = 'test-secret-do-not-use-in-production';
