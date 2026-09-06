import type { ChangeReason } from '../domain/compensation/ChangeReason.js';
import type { SalaryRecord } from '../domain/compensation/SalaryRecord.js';
import type { SalaryRecordRepository } from './ports/SalaryRecordRepository.js';

export interface RecordSalaryChangeCommand {
  employeeId: string;
  amountMinor: number;
  currency: string;
  /** ISO YYYY-MM-DD. Required — prefilling "today" is the form's job. */
  effectiveFrom: string;
  changeReason: ChangeReason;
  note: string | null;
}

/**
 * Record a raise. Load the timeline, let the domain build the writes, persist
 * them. No validation here — I3 / I4 / I8 / I10 live in the domain and their
 * errors propagate untouched. No clock either: defaulting a missing
 * effectiveFrom to today would quietly turn a malformed request into a valid
 * one.
 */
export class RecordSalaryChange {
  constructor(private readonly salaries: SalaryRecordRepository) {}

  async execute(cmd: RecordSalaryChangeCommand): Promise<SalaryRecord> {
    const timeline = await this.salaries.findTimeline(cmd.employeeId);
    const writes = timeline.recordChange({
      amountMinor: cmd.amountMinor,
      currency: cmd.currency,
      effectiveFrom: cmd.effectiveFrom,
      changeReason: cmd.changeReason,
      note: cmd.note,
    });
    return this.salaries.apply(writes);
  }
}
