import type { Money } from '../money/Money.js';
import type { ChangeReason } from './ChangeReason.js';

/**
 * One row of an employee's salary history.
 *
 * The business facts — amount, effectiveFrom, changeReason — are immutable once
 * written. effectiveTo is set once (when the next period opens); supersededAt /
 * supersededById are set once (when the record is corrected).
 *
 * `id` is null for a record the domain has produced but not yet persisted.
 */
export interface SalaryRecord {
  id: string | null;
  amount: Money;
  effectiveFrom: string;
  effectiveTo: string | null;
  changeReason: ChangeReason;
  note: string | null;
  supersededAt: Date | null;
  supersededById: string | null;
}
