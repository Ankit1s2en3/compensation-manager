import type { Money } from '../money/Money.js';
import type { ChangeReason } from './ChangeReason.js';

/**
 * The immutable business facts of a salary record, shared by the not-yet-persisted
 * and persisted shapes.
 */
interface SalaryFacts {
  amount: Money;
  effectiveFrom: string;
  effectiveTo: string | null;
  changeReason: ChangeReason;
  note: string | null;
}

/**
 * A salary change the domain has produced but not yet persisted. Standalone: it
 * carries employeeId so the repository can run the INSERT with nothing extra.
 * The database assigns the id, and a fresh insert is always live.
 */
export interface NewSalaryRecord extends SalaryFacts {
  employeeId: string;
}

/**
 * A persisted row of an employee's salary history.
 *
 * The business facts are immutable once written. effectiveTo is set once, when
 * the next period opens. supersededAt / supersededById are set once, when the
 * record is corrected. employeeId is deliberately absent: a SalaryRecord is only
 * ever handled inside a SalaryTimeline, which is already scoped to one employee.
 *
 * Hand-written, not `typeof salaryRecords.$inferSelect`. domain/ cannot import
 * Drizzle — deriving this from the schema would make the domain depend on
 * infrastructure, exactly backwards. infrastructure/repositories/mappers.ts
 * builds one of these from a schema row; keep the two shapes in sync by hand.
 */
export interface SalaryRecord extends SalaryFacts {
  id: string;
  supersededAt: Date | null;
  supersededById: string | null;
}

/** Live = not superseded by a correction (docs/data-model.md I1). */
export function isLive(record: SalaryRecord): boolean {
  return record.supersededAt === null;
}

/**
 * Whether `record`'s period covers `date` (ISO `YYYY-MM-DD`), both ends
 * inclusive. A null effectiveTo means the period is still open.
 */
export function covers(record: SalaryRecord, date: string): boolean {
  return (
    record.effectiveFrom <= date &&
    (record.effectiveTo === null || date <= record.effectiveTo)
  );
}
