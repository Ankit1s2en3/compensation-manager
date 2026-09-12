import type { EmployeeProfile } from '../../application/GetEmployeeProfile.js';
import type {
  Employee,
  EmployeeListItem,
} from '../../application/ports/EmployeeRepository.js';
import type { SalaryRecord } from '../../domain/compensation/SalaryRecord.js';
import { toMoneyResponse } from './money.js';

export function toEmployeeListItemResponse(item: EmployeeListItem) {
  return {
    id: item.id,
    employeeCode: item.employeeCode,
    firstName: item.firstName,
    lastName: item.lastName,
    departmentId: item.departmentId,
    jobLevelId: item.jobLevelId,
    countryCode: item.countryCode,
    status: item.status,
    currentSalary:
      item.currentSalary === null ? null : toMoneyResponse(item.currentSalary),
  };
}

export function toSalaryRecordResponse(record: SalaryRecord) {
  return {
    id: record.id,
    amount: toMoneyResponse(record.amount),
    effectiveFrom: record.effectiveFrom,
    effectiveTo: record.effectiveTo,
    changeReason: record.changeReason,
    note: record.note,
    supersededAt: record.supersededAt === null ? null : record.supersededAt.toISOString(),
    supersededById: record.supersededById,
  };
}

function toEmployeeResponse(employee: Employee) {
  return { ...employee };
}

export function toEmployeeProfileResponse(profile: EmployeeProfile) {
  return {
    employee: toEmployeeResponse(profile.employee),
    currentRecord:
      profile.currentRecord === null
        ? null
        : toSalaryRecordResponse(profile.currentRecord),
    upcomingRecord:
      profile.upcomingRecord === null
        ? null
        : toSalaryRecordResponse(profile.upcomingRecord),
    history: profile.history.map((entry) => ({
      record: toSalaryRecordResponse(entry.record),
      isSuperseded: entry.isSuperseded,
      isCurrent: entry.isCurrent,
    })),
  };
}
