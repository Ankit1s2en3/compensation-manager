import { describe, expect, it } from 'vitest';

import { Money } from '../domain/money/Money.js';
import { EmployeeNotFoundError } from './errors.js';
import { GetEmployeeProfile } from './GetEmployeeProfile.js';
import { InMemoryEmployeeRepository } from './testing/InMemoryEmployeeRepository.js';
import { InMemorySalaryRecordRepository } from './testing/InMemorySalaryRecordRepository.js';
import { anEmployee, aSalaryRecord } from './testing/builders.js';

describe('GetEmployeeProfile', () => {
  it('marks the superseded record and the current one correctly', async () => {
    const employees = new InMemoryEmployeeRepository([anEmployee({ id: '1' })]);
    const salaries = new InMemorySalaryRecordRepository([
      {
        employeeId: '1',
        hireDate: '2022-01-01',
        records: [
          aSalaryRecord({
            id: '10',
            amount: Money.of(15_000_000, 'USD'),
            effectiveFrom: '2022-01-01',
            effectiveTo: '2023-08-31',
            changeReason: 'HIRE',
          }),
          aSalaryRecord({
            id: '20',
            amount: Money.of(16_500_000, 'USD'),
            effectiveFrom: '2023-09-01',
            changeReason: 'MERIT',
            supersededAt: new Date('2024-01-15T00:00:00.000Z'),
            supersededById: '21',
          }),
          aSalaryRecord({
            id: '21',
            amount: Money.of(17_200_000, 'USD'),
            effectiveFrom: '2023-09-01',
            changeReason: 'MERIT',
            note: 'Corrects #20',
          }),
        ],
      },
    ]);

    const profile = await new GetEmployeeProfile(employees, salaries).execute('1');

    expect(profile.currentRecord?.id).toBe('21');
    expect(profile.history.map((h) => h.record.id)).toEqual(['21', '20', '10']);

    const byId = new Map(profile.history.map((h) => [h.record.id, h]));
    expect(byId.get('20')).toMatchObject({ isSuperseded: true, isCurrent: false });
    expect(byId.get('21')).toMatchObject({ isSuperseded: false, isCurrent: true });
    expect(byId.get('10')).toMatchObject({ isSuperseded: false, isCurrent: false });
  });

  it('throws EmployeeNotFoundError when the employee does not exist', async () => {
    const useCase = new GetEmployeeProfile(
      new InMemoryEmployeeRepository([]),
      new InMemorySalaryRecordRepository([]),
    );

    await expect(useCase.execute('999')).rejects.toThrow(EmployeeNotFoundError);
  });
});
