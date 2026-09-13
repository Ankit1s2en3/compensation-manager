import { eq } from 'drizzle-orm';

import type {
  User,
  UserRepository,
} from '../../application/ports/UserRepository.js';
import type { Database } from '../db.js';
import { users } from '../schema.js';

export class DrizzleUserRepository implements UserRepository {
  constructor(private readonly db: Database) {}

  async findByEmail(email: string): Promise<User | null> {
    const [row] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    return row === undefined
      ? null
      : {
          id: String(row.id),
          email: row.email,
          passwordHash: row.passwordHash,
          role: row.role,
        };
  }
}
