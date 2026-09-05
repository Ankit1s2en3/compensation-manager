import { describe, expect, it } from 'vitest';

import { AlreadyCorrectedError } from '../domain/compensation/errors.js';
import { Money } from '../domain/money/Money.js';
import { CorrectSalaryRecord } from './CorrectSalaryRecord.js';
import { FixedClock } from './testing/FixedClock.js';
import { InMemorySalaryRecordRepository } from './testing/InMemorySalaryRecordRepository.js';
import { aSalaryRecord } from './testing/builders.js';

describe('CorrectSalaryRecord', () => {
  it('lets AlreadyCorrectedError propagate unchanged', async () => {
    const salaries = new InMemorySalaryRecordRepository([
      {
        employeeId: '1',
        hireDate: '2022-01-01',
        records: [
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
          }),
        ],
      },
    ]);

    await expect(
      new CorrectSalaryRecord(salaries, new FixedClock('2026-05-01')).execute({
        employeeId: '1',
        recordId: '20', // already superseded -> I5
        amountMinor: 17_000_000,
        currency: 'USD',
        note: 'correcting the correction',
      }),
    ).rejects.toThrow(AlreadyCorrectedError);

    expect(salaries.applyCalls).toHaveLength(0);
  });
});
