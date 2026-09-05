import { describe, expect, it } from 'vitest';

import { RetroactiveChangeError } from '../domain/compensation/errors.js';
import { SalaryTimeline } from '../domain/compensation/SalaryTimeline.js';
import { Money } from '../domain/money/Money.js';
import { RecordSalaryChange } from './RecordSalaryChange.js';
import { FixedClock } from './testing/FixedClock.js';
import { InMemorySalaryRecordRepository } from './testing/InMemorySalaryRecordRepository.js';
import { aSalaryRecord } from './testing/builders.js';

const hire = aSalaryRecord({
  id: '5',
  amount: Money.of(12_000_000, 'USD'),
  effectiveFrom: '2024-01-01',
});

function seed() {
  return new InMemorySalaryRecordRepository([
    { employeeId: '1', hireDate: '2024-01-01', records: [hire] },
  ]);
}

describe('RecordSalaryChange', () => {
  it('passes the domain writes straight to apply()', async () => {
    const salaries = seed();

    const result = await new RecordSalaryChange(
      salaries,
      new FixedClock('2026-05-01'),
    ).execute({
      employeeId: '1',
      amountMinor: 13_000_000,
      currency: 'USD',
      effectiveFrom: '2025-06-01',
      changeReason: 'MERIT',
      note: null,
    });

    // exactly what the domain produces from the same starting timeline
    const expected = new SalaryTimeline({
      employeeId: '1',
      hireDate: '2024-01-01',
      records: [hire],
    }).recordChange({
      amountMinor: 13_000_000,
      currency: 'USD',
      effectiveFrom: '2025-06-01',
      changeReason: 'MERIT',
      note: null,
    });

    expect(salaries.applyCalls).toHaveLength(1);
    expect(salaries.applyCalls[0]).toEqual(expected);
    expect(result.amount.amountMinor).toBe(13_000_000);
    expect(result.changeReason).toBe('MERIT');
  });

  it('lets RetroactiveChangeError propagate unchanged', async () => {
    const salaries = new InMemorySalaryRecordRepository([
      {
        employeeId: '1',
        hireDate: '2024-01-01',
        records: [aSalaryRecord({ id: '5', effectiveFrom: '2026-04-01' })],
      },
    ]);

    await expect(
      new RecordSalaryChange(salaries, new FixedClock('2026-05-01')).execute({
        employeeId: '1',
        amountMinor: 13_000_000,
        currency: 'USD',
        effectiveFrom: '2026-04-01', // == latest live effective_from -> I8
        changeReason: 'MERIT',
        note: null,
      }),
    ).rejects.toThrow(RetroactiveChangeError);

    expect(salaries.applyCalls).toHaveLength(0);
  });
});
