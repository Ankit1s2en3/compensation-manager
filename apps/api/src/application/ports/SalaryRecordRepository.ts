import type { SalaryRecord } from '../../domain/compensation/SalaryRecord.js';
import type {
  SalaryTimeline,
  TimelineWrites,
} from '../../domain/compensation/SalaryTimeline.js';

export interface SalaryRecordRepository {
  /** Every record for the employee (superseded ones included), as a timeline. */
  findTimeline(employeeId: string): Promise<SalaryTimeline>;

  /**
   * The timeline of the employee who owns `recordId` — the correction endpoint
   * knows a record id, not an employee id. Throws SalaryRecordNotFoundError.
   */
  findTimelineForRecord(recordId: string): Promise<SalaryTimeline>;

  /** The live record in force on `on` (ISO `YYYY-MM-DD`), or null. */
  findCurrentSalary(employeeId: string, on: string): Promise<SalaryRecord | null>;

  /**
   * Persist a change described by the domain. All of it, or none of it — one
   * transaction. Returns the newly inserted record.
   */
  apply(writes: TimelineWrites): Promise<SalaryRecord>;
}
