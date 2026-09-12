import { z } from 'zod';

/** GET /api/analytics/compensation query string -> GetCompensationStats input. */
export const compensationStatsQuery = z
  .object({
    groupBy: z.enum(['department', 'country', 'jobLevel']),
    department: z.string().optional(),
    country: z.string().optional(),
    level: z.string().optional(),
  })
  .transform((v) => ({
    groupBy: v.groupBy,
    filters: {
      departmentId: v.department,
      countryCode: v.country,
      jobLevelId: v.level,
    },
  }));
