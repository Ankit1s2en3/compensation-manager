import { describe, expect, it } from 'vitest';

import { Money } from '../domain/money/Money.js';
import { EmployeeNotFoundError } from './errors.js';
import { GetEmployeeProfile } from './GetEmployeeProfile.js';
import { FixedClock } from './testing/FixedClock.js';
import { InMemoryEmployeeRepository } from './testing/InMemoryEmployeeRepository.js';
import {
  InMemorySalaryRecordRepository,
  type EmployeeTimelineSeed,
} from './testing/InMemorySalaryRecordRepository.js';
import { anEmployee, aSalaryRecord } from './testing/builders.js';

const CLOCK = new FixedClock('2026-06-01');

function profileOf(seed: EmployeeTimelineSeed) {
  return new GetEmployeeProfile(
    new InMemoryEmployeeRepository([anEmployee({ id: seed.employeeId })]),
    new InMemorySalaryRecordRepository([seed]),
    CLOCK,
  );
}

describe('GetEmployeeProfile', () => {
  it('marks the superseded record and the current one correctly', async () => {
    const profile = await profileOf({
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
    }).execute('1');

    expect(profile.currentRecord?.id).toBe('21');
    expect(profile.upcomingRecord).toBeNull();
    expect(profile.history.map((h) => h.record.id)).toEqual(['21', '20', '10']);

    const byId = new Map(profile.history.map((h) => [h.record.id, h]));
    expect(byId.get('20')).toMatchObject({ isSuperseded: true, isCurrent: false });
    expect(byId.get('21')).toMatchObject({ isSuperseded: false, isCurrent: true });
    expect(byId.get('10')).toMatchObject({ isSuperseded: false, isCurrent: false });
  });

  it('current record is the one in force today, not a forward-dated one', async () => {
    const profile = await profileOf({
      employeeId: '1',
      hireDate: '2024-01-01',
      records: [
        aSalaryRecord({
          id: '10',
          amount: Money.of(12_000_000, 'USD'),
          effectiveFrom: '2024-01-01',
          effectiveTo: '2026-08-31',
          changeReason: 'HIRE',
        }),
        aSalaryRecord({
          id: '20',
          amount: Money.of(13_500_000, 'USD'),
          effectiveFrom: '2026-09-01', // approved now, in force in September
          changeReason: 'MERIT',
        }),
      ],
    }).execute('1');

    expect(profile.currentRecord?.id).toBe('10');
    expect(profile.currentRecord?.amount.amountMinor).toBe(12_000_000);
    const byId = new Map(profile.history.map((h) => [h.record.id, h]));
    expect(byId.get('10')?.isCurrent).toBe(true);
    expect(byId.get('20')?.isCurrent).toBe(false);
  });

  it('populates upcomingRecord when a future change exists, null otherwise', async () => {
    const withFuture = await profileOf({
      employeeId: '1',
      hireDate: '2024-01-01',
      records: [
        aSalaryRecord({ id: '10', effectiveFrom: '2024-01-01', effectiveTo: '2026-08-31' }),
        aSalaryRecord({
          id: '20',
          amount: Money.of(13_500_000, 'USD'),
          effectiveFrom: '2026-09-01',
          changeReason: 'MERIT',
        }),
      ],
    }).execute('1');
    expect(withFuture.upcomingRecord?.id).toBe('20');
    expect(withFuture.upcomingRecord?.amount.amountMinor).toBe(13_500_000);

    const noFuture = await profileOf({
      employeeId: '1',
      hireDate: '2024-01-01',
      records: [aSalaryRecord({ id: '10', effectiveFrom: '2024-01-01' })],
    }).execute('1');
    expect(noFuture.upcomingRecord).toBeNull();
  });

  it('agrees with the current-salary read for the same employee and date', async () => {
    const seed: EmployeeTimelineSeed = {
      employeeId: '1',
      hireDate: '2024-01-01',
      records: [
        aSalaryRecord({ id: '10', effectiveFrom: '2024-01-01', effectiveTo: '2026-08-31' }),
        aSalaryRecord({ id: '20', effectiveFrom: '2026-09-01', changeReason: 'MERIT' }),
      ],
    };
    const salaries = new InMemorySalaryRecordRepository([seed]);
    const useCase = new GetEmployeeProfile(
      new InMemoryEmployeeRepository([anEmployee({ id: '1' })]),
      salaries,
      CLOCK,
    );

    const profile = await useCase.execute('1');
    const directory = await salaries.findCurrentSalary('1', CLOCK.today());

    expect(profile.currentRecord?.id).toBe(directory?.id);
    expect(profile.currentRecord?.id).toBe('10');
  });

  it('throws EmployeeNotFoundError when the employee does not exist', async () => {
    const useCase = new GetEmployeeProfile(
      new InMemoryEmployeeRepository([]),
      new InMemorySalaryRecordRepository([]),
      CLOCK,
    );

    await expect(useCase.execute('999')).rejects.toThrow(EmployeeNotFoundError);
  });
});
