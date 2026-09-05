import type { SalaryRecord } from '../../domain/compensation/SalaryRecord.js';
import { Money } from '../../domain/money/Money.js';
import type { Employee } from '../../application/ports/EmployeeRepository.js';
import { employees, salaryRecords } from '../schema.js';

/**
 * The single mapper into the domain: amount_minor + currency_code become a
 * Money here, and the domain never handles a raw amount again. The row type
 * is Drizzle-inferred — fine here, this file is the only place allowed to
 * know the schema shape.
 */
export function toSalaryRecord(
  row: typeof salaryRecords.$inferSelect,
): SalaryRecord {
  return {
    id: String(row.id),
    amount: Money.of(row.amountMinor, row.currencyCode),
    effectiveFrom: row.effectiveFrom,
    effectiveTo: row.effectiveTo,
    changeReason: row.changeReason,
    note: row.note,
    supersededAt: row.supersededAt,
    supersededById:
      row.supersededById === null ? null : String(row.supersededById),
  };
}

export function toEmployee(row: typeof employees.$inferSelect): Employee {
  return {
    id: String(row.id),
    employeeCode: row.employeeCode,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    departmentId: String(row.departmentId),
    jobLevelId: String(row.jobLevelId),
    jobTitle: row.jobTitle,
    countryCode: row.countryCode,
    employmentType: row.employmentType,
    hireDate: row.hireDate,
    managerId: row.managerId === null ? null : String(row.managerId),
    status: row.status,
  };
}
