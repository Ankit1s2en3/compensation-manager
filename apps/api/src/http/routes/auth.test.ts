import supertest from 'supertest';
import { describe, expect, it } from 'vitest';

import { JwtTokenIssuer } from '../../infrastructure/JwtTokenIssuer.js';
import { SEEDED_USER } from '../../infrastructure/testing/fixtures.js';
import { testDb } from '../../infrastructure/testing/testDb.js';
import { TEST_JWT_SECRET } from '../../infrastructure/testing/testJwtSecret.js';
import { createContainer } from '../../container.js';
import { createServer } from '../server.js';

const app = createServer(
  createContainer(testDb, TEST_JWT_SECRET),
  TEST_JWT_SECRET,
);

describe('POST /api/auth/login', () => {
  it('returns a token for the seeded credentials', async () => {
    const response = await supertest(app).post('/api/auth/login').send({
      email: SEEDED_USER.email,
      password: SEEDED_USER.password,
    });

    expect(response.status).toBe(200);
    expect(typeof response.body.token).toBe('string');
    expect(response.body.user).toEqual({
      id: '1',
      email: SEEDED_USER.email,
      role: 'HR_MANAGER',
    });
  });

  it('returns 401 for a wrong password', async () => {
    const response = await supertest(app).post('/api/auth/login').send({
      email: SEEDED_USER.email,
      password: 'not-the-password',
    });

    expect(response.status).toBe(401);
  });

  it('returns 401 with the same message for an unknown email', async () => {
    const wrongPassword = await supertest(app).post('/api/auth/login').send({
      email: SEEDED_USER.email,
      password: 'not-the-password',
    });
    const unknownEmail = await supertest(app).post('/api/auth/login').send({
      email: 'nobody@acme.test',
      password: SEEDED_USER.password,
    });

    expect(unknownEmail.status).toBe(401);
    expect(unknownEmail.body.error).toBe(wrongPassword.body.error);
    expect(unknownEmail.body.code).toBe(wrongPassword.body.code);
  });
});

describe('requireAuth', () => {
  it('returns 401 for a protected route without a token', async () => {
    // Deliberately does NOT use authHeader() — this is the one test that
    // must fail if requireAuth is ever accidentally disabled or bypassed.
    const response = await supertest(app).get('/api/employees');

    expect(response.status).toBe(401);
    expect(response.body.code).toBe('MISSING_TOKEN');
  });

  it('returns 200 for a protected route with a valid token', async () => {
    const login = await supertest(app).post('/api/auth/login').send({
      email: SEEDED_USER.email,
      password: SEEDED_USER.password,
    });

    const response = await supertest(app)
      .get('/api/employees')
      .set('Authorization', `Bearer ${login.body.token}`);

    expect(response.status).toBe(200);
  });

  it('returns 401 for an expired token', async () => {
    // Issued with the same secret requireAuth verifies against, but already
    // expired — the normal login flow can't produce this, so it's minted
    // directly, and only for this one case.
    const expired = new JwtTokenIssuer(TEST_JWT_SECRET, -10).issue('1', {
      role: 'HR_MANAGER',
    });

    const response = await supertest(app)
      .get('/api/employees')
      .set('Authorization', `Bearer ${expired}`);

    expect(response.status).toBe(401);
    expect(response.body.code).toBe('TOKEN_EXPIRED');
  });
});
