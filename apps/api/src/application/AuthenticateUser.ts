import { InvalidCredentialsError } from './errors.js';
import { verifyPassword } from './passwordHash.js';
import type { TokenIssuer } from './ports/TokenIssuer.js';
import type { UserRepository } from './ports/UserRepository.js';

export interface AuthenticateUserCommand {
  email: string;
  password: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
}

export interface AuthenticationResult {
  token: string;
  user: AuthenticatedUser;
}

/**
 * One seeded HR user, no signup. "No such email" and "wrong password" are
 * indistinguishable to the caller — both throw the same InvalidCredentialsError.
 */
export class AuthenticateUser {
  constructor(
    private readonly users: UserRepository,
    private readonly tokens: TokenIssuer,
  ) {}

  async execute(cmd: AuthenticateUserCommand): Promise<AuthenticationResult> {
    const user = await this.users.findByEmail(cmd.email);
    if (user === null || !verifyPassword(cmd.password, user.passwordHash)) {
      throw new InvalidCredentialsError();
    }

    const token = this.tokens.issue(user.id, { role: user.role });
    return {
      token,
      user: { id: user.id, email: user.email, role: user.role },
    };
  }
}
