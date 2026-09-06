import { isLive } from '../domain/compensation/SalaryRecord.js';
import type { SalaryRecord } from '../domain/compensation/SalaryRecord.js';
import type { Clock } from '../domain/shared/Clock.js';
import { EmployeeNotFoundError } from './errors.js';
import type { Employee, EmployeeRepository } from './ports/EmployeeRepository.js';
import type { SalaryRecordRepository } from './ports/SalaryRecordRepository.js';

export interface SalaryHistoryEntry {
  record: SalaryRecord;
  isSuperseded: boolean;
  isCurrent: boolean;
}

export interface EmployeeProfile {
  employee: Employee;
  /** The record in force today (same rule the directory uses), or null. */
  currentRecord: SalaryRecord | null;
  /** The earliest live record that takes effect after today, or null. */
  upcomingRecord: SalaryRecord | null;
  /** Every record, newest first, superseded ones included. */
  history: SalaryHistoryEntry[];
}

export class GetEmployeeProfile {
  constructor(
    private readonly employees: EmployeeRepository,
    private readonly salaries: SalaryRecordRepository,
    private readonly clock: Clock,
  ) {}

  async execute(employeeId: string): Promise<EmployeeProfile> {
    const employee = await this.employees.findById(employeeId);
    if (employee === null) {
      throw new EmployeeNotFoundError(employeeId);
    }

    const today = this.clock.today();
    const timeline = await this.salaries.findTimeline(employeeId);
    const records = timeline.records;

    // In force today — not just the open period. A forward-dated raise is live
    // and open but not yet current; this agrees with the directory's
    // liveAndCovering(today).
    const currentRecord = timeline.currentAt(today);
    // records are ascending by effective_from, so the first future one is the
    // earliest.
    const upcomingRecord =
      records.find((r) => isLive(r) && r.effectiveFrom > today) ?? null;

    const history: SalaryHistoryEntry[] = [...records]
      .reverse()
      .map((record) => ({
        record,
        isSuperseded: !isLive(record),
        isCurrent: currentRecord !== null && record.id === currentRecord.id,
      }));

    return { employee, currentRecord, upcomingRecord, history };
  }
}
