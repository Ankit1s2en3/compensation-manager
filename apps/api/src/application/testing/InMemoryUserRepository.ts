import type { User, UserRepository } from '../ports/UserRepository.js';

export class InMemoryUserRepository implements UserRepository {
  readonly #users: User[];

  constructor(users: User[] = []) {
    this.#users = users;
  }

  findByEmail(email: string): Promise<User | null> {
    return Promise.resolve(this.#users.find((u) => u.email === email) ?? null);
  }
}
