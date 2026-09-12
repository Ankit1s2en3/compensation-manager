import { z } from 'zod';

/** POST /api/salary-records/:id/corrections body. */
export const correctionBody = z.object({
  amountMinor: z.number().int(),
  currency: z.string().regex(/^[A-Z]{3}$/),
  note: z.string(),
});
