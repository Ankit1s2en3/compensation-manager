import type { SalaryRecord } from '../domain/compensation/SalaryRecord.js';
import type { Clock } from '../domain/shared/Clock.js';
import { Money } from '../domain/money/Money.js';
import type { SalaryRecordRepository } from './ports/SalaryRecordRepository.js';

export interface CorrectSalaryRecordCommand {
  employeeId: string;
  recordId: string;
  amountMinor: number;
  currency: string;
  note: string;
}

/**
 * Correct a salary record. Load the timeline, let the domain build the writes,
 * persist them. No validation here — I5 / I9 / I10 live in the domain and their
 * errors propagate untouched.
 */
export class CorrectSalaryRecord {
  constructor(
    private readonly salaries: SalaryRecordRepository,
    private readonly clock: Clock,
  ) {}

  async execute(cmd: CorrectSalaryRecordCommand): Promise<SalaryRecord> {
    const timeline = await this.salaries.findTimeline(cmd.employeeId);
    const writes = timeline.correct(
      cmd.recordId,
      Money.of(cmd.amountMinor, cmd.currency),
      cmd.note,
      this.clock,
    );
    return this.salaries.apply(writes);
  }
}
