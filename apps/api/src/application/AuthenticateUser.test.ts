import { scryptSync } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { AuthenticateUser } from './AuthenticateUser.js';
import { InvalidCredentialsError } from './errors.js';
import type { User } from './ports/UserRepository.js';
import { FakeTokenIssuer } from './testing/FakeTokenIssuer.js';
import { InMemoryUserRepository } from './testing/InMemoryUserRepository.js';

const PASSWORD = 'correct-password';
const SALT = 'fixed-salt';

const seededUser: User = {
  id: '1',
  email: 'hr.manager@acme.test',
  passwordHash: `scrypt$${SALT}$${scryptSync(PASSWORD, SALT, 64).toString('hex')}`,
  role: 'HR_MANAGER',
};

describe('AuthenticateUser', () => {
  it('issues a token and returns the user for correct credentials', async () => {
    const tokens = new FakeTokenIssuer();
    const useCase = new AuthenticateUser(
      new InMemoryUserRepository([seededUser]),
      tokens,
    );

    const result = await useCase.execute({
      email: seededUser.email,
      password: PASSWORD,
    });

    expect(result.user).toEqual({
      id: '1',
      email: 'hr.manager@acme.test',
      role: 'HR_MANAGER',
    });
    expect(result.token).toBe('fake-token:1');
    expect(tokens.issueCalls).toEqual([
      { userId: '1', claims: { role: 'HR_MANAGER' } },
    ]);
  });

  it('throws InvalidCredentialsError for an unknown email', async () => {
    const useCase = new AuthenticateUser(
      new InMemoryUserRepository([seededUser]),
      new FakeTokenIssuer(),
    );

    await expect(
      useCase.execute({ email: 'nobody@acme.test', password: PASSWORD }),
    ).rejects.toThrow(InvalidCredentialsError);
  });

  it('throws the identical InvalidCredentialsError for a wrong password', async () => {
    const useCase = new AuthenticateUser(
      new InMemoryUserRepository([seededUser]),
      new FakeTokenIssuer(),
    );

    const unknownEmail = useCase
      .execute({ email: 'nobody@acme.test', password: PASSWORD })
      .catch((err: unknown) => err);
    const wrongPassword = useCase
      .execute({ email: seededUser.email, password: 'wrong' })
      .catch((err: unknown) => err);

    const [a, b] = await Promise.all([unknownEmail, wrongPassword]);
    expect(a).toBeInstanceOf(InvalidCredentialsError);
    expect(b).toBeInstanceOf(InvalidCredentialsError);
    expect((a as Error).message).toBe((b as Error).message);
  });
});
