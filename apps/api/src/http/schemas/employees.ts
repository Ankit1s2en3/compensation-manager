import { z } from 'zod';

/** GET /api/employees query string -> ListEmployees input shape. */
export const employeeListQuery = z
  .object({
    department: z.string().optional(),
    country: z.string().optional(),
    level: z.string().optional(),
    status: z.enum(['ACTIVE', 'TERMINATED']).optional(),
    q: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(25),
    offset: z.coerce.number().int().min(0).default(0),
  })
  .transform((v) => ({
    criteria: {
      departmentId: v.department,
      countryCode: v.country,
      jobLevelId: v.level,
      status: v.status,
      nameQuery: v.q,
    },
    page: { limit: v.limit, offset: v.offset },
  }));

/** POST /api/employees/:id/salary-changes body. */
export const salaryChangeBody = z.object({
  amountMinor: z.number().int(),
  currency: z.string().regex(/^[A-Z]{3}$/),
  effectiveFrom: z.iso.date(),
  changeReason: z.enum(['HIRE', 'MERIT', 'PROMOTION', 'MARKET_ADJUSTMENT']),
  note: z.string().nullable(),
});
