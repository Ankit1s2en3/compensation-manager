import { and, gte, isNull, lte, or } from 'drizzle-orm';

import { salaryRecords } from '../schema.js';

/**
 * A record is "current" on `on` (ISO YYYY-MM-DD): live, and its period covers
 * that date. One definition, shared by findCurrentSalary and the current-salary
 * join in search() — so a directory listing and a single lookup can never
 * disagree about what "current" means for the same employee and date.
 */
export const liveAndCovering = (on: string) =>
  and(
    isNull(salaryRecords.supersededAt),
    lte(salaryRecords.effectiveFrom, on),
    or(isNull(salaryRecords.effectiveTo), gte(salaryRecords.effectiveTo, on)),
  );
