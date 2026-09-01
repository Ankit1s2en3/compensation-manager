import type { Money } from '../money/Money.js';
import type { ChangeReason } from './ChangeReason.js';

/**
 * A salary record the domain has produced but not yet persisted: the business
 * facts only. The database assigns the id, and a fresh insert is always live.
 */
export interface NewSalaryRecord {
  amount: Money;
  effectiveFrom: string;
  effectiveTo: string | null;
  changeReason: ChangeReason;
  note: string | null;
}

/**
 * A persisted row of an employee's salary history.
 *
 * The business facts (inherited from NewSalaryRecord) are immutable once
 * written. effectiveTo is set once, when the next period opens. supersededAt /
 * supersededById are set once, when the record is corrected.
 */
export interface SalaryRecord extends NewSalaryRecord {
  id: string;
  supersededAt: Date | null;
  supersededById: string | null;
}
