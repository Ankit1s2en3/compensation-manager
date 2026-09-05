import type { ChangeReason } from '../domain/compensation/ChangeReason.js';
import type { SalaryRecord } from '../domain/compensation/SalaryRecord.js';
import type { Clock } from '../domain/shared/Clock.js';
import type { SalaryRecordRepository } from './ports/SalaryRecordRepository.js';

export interface RecordSalaryChangeCommand {
  employeeId: string;
  amountMinor: number;
  currency: string;
  /** ISO YYYY-MM-DD. Defaults to today when the change takes effect now. */
  effectiveFrom?: string;
  changeReason: ChangeReason;
  note: string | null;
}

/**
 * Record a raise. Load the timeline, let the domain build the writes, persist
 * them. No validation here — I3 / I4 / I8 / I10 live in the domain and their
 * errors propagate untouched.
 */
export class RecordSalaryChange {
  constructor(
    private readonly salaries: SalaryRecordRepository,
    private readonly clock: Clock,
  ) {}

  async execute(cmd: RecordSalaryChangeCommand): Promise<SalaryRecord> {
    const timeline = await this.salaries.findTimeline(cmd.employeeId);
    const writes = timeline.recordChange({
      amountMinor: cmd.amountMinor,
      currency: cmd.currency,
      effectiveFrom: cmd.effectiveFrom ?? this.clock.today(),
      changeReason: cmd.changeReason,
      note: cmd.note,
    });
    return this.salaries.apply(writes);
  }
}
