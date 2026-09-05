import { isLive } from '../domain/compensation/SalaryRecord.js';
import type { SalaryRecord } from '../domain/compensation/SalaryRecord.js';
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
  currentRecord: SalaryRecord | null;
  /** Every record, newest first, superseded ones included. */
  history: SalaryHistoryEntry[];
}

export class GetEmployeeProfile {
  constructor(
    private readonly employees: EmployeeRepository,
    private readonly salaries: SalaryRecordRepository,
  ) {}

  async execute(employeeId: string): Promise<EmployeeProfile> {
    const employee = await this.employees.findById(employeeId);
    if (employee === null) {
      throw new EmployeeNotFoundError(employeeId);
    }

    const records = (await this.salaries.findTimeline(employeeId)).records;
    // The current record is the live, still-open one (I2: at most one).
    const currentRecord =
      records.find((r) => isLive(r) && r.effectiveTo === null) ?? null;

    const history: SalaryHistoryEntry[] = [...records]
      .reverse()
      .map((record) => ({
        record,
        isSuperseded: !isLive(record),
        isCurrent: currentRecord !== null && record.id === currentRecord.id,
      }));

    return { employee, currentRecord, history };
  }
}
