import type { EmployeeListItem } from '../../application/ports/EmployeeRepository.js';
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
