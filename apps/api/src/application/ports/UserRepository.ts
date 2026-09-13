/** Hand-written, not `typeof users.$inferSelect` — same reason as Employee. */
export interface User {
  id: string;
  email: string;
  passwordHash: string;
  role: string;
}

export interface UserRepository {
  findByEmail(email: string): Promise<User | null>;
}
