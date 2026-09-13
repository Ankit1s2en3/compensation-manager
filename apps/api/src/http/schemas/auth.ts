import { z } from 'zod';

/** POST /api/auth/login body. */
export const loginBody = z.object({
  email: z.string(),
  password: z.string(),
});
