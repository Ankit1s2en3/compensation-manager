import type { SalaryRecord } from '../../domain/compensation/SalaryRecord.js';
import { Money } from '../../domain/money/Money.js';
import type { Employee } from '../ports/EmployeeRepository.js';

export function anEmployee(overrides: Partial<Employee> = {}): Employee {
  return {
    id: '1',
    employeeCode: 'E1001',
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada.lovelace@acme.test',
    departmentId: '1',
    jobLevelId: '3',
    jobTitle: 'Engineer',
    countryCode: 'US',
    employmentType: 'FULL_TIME',
    hireDate: '2024-01-01',
    managerId: null,
    status: 'ACTIVE',
    ...overrides,
  };
}

export function aSalaryRecord(overrides: Partial<SalaryRecord> = {}): SalaryRecord {
  return {
    id: '1',
    amount: Money.of(12_000_000, 'USD'),
    effectiveFrom: '2024-01-01',
    effectiveTo: null,
    changeReason: 'HIRE',
    note: null,
    supersededAt: null,
    supersededById: null,
    ...overrides,
  };
}
