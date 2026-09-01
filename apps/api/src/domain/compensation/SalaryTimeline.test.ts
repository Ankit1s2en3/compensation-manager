import { describe, it, expect } from 'vitest';

import type { SalaryRecord } from './SalaryRecord.js';
import {
  EffectiveDateBeforeHireError,
  RetroactiveChangeError,
  SalaryTimeline,
} from './SalaryTimeline.js';

function makeRecord(overrides: Partial<SalaryRecord> = {}): SalaryRecord {
  return {
    id: 'r1',
    amountMinor: 1_500_000,
    currency: 'INR',
    effectiveFrom: '2023-01-01',
    effectiveTo: null,
    changeReason: 'HIRE',
    note: null,
    supersededAt: null,
    supersededById: null,
    ...overrides,
  };
}

describe('SalaryTimeline.recordChange', () => {
  it('accepts the first change for an employee', () => {
    const timeline = new SalaryTimeline({ hireDate: '2023-01-01', records: [] });

    const updated = timeline.recordChange({
      amountMinor: 1_500_000,
      currency: 'INR',
      effectiveFrom: '2023-01-01',
      changeReason: 'HIRE',
      note: null,
    });

    expect(updated.records).toHaveLength(1);
    expect(updated.records[0]).toMatchObject({
      amountMinor: 1_500_000,
      currency: 'INR',
      effectiveFrom: '2023-01-01',
      effectiveTo: null,
      changeReason: 'HIRE',
    });
  });

  it('accepts a change dated after the latest live record', () => {
    const timeline = new SalaryTimeline({
      hireDate: '2023-01-01',
      records: [makeRecord({ id: 'r1', effectiveFrom: '2023-01-01' })],
    });

    const updated = timeline.recordChange({
      amountMinor: 2_000_000,
      currency: 'INR',
      effectiveFrom: '2026-04-01',
      changeReason: 'MERIT',
      note: null,
    });

    expect(updated.records).toHaveLength(2);
    expect(updated.records.map((r) => r.effectiveFrom)).toEqual([
      '2023-01-01',
      '2026-04-01',
    ]);
  });

  it('rejects a change dated on or before the latest live record', () => {
    const timeline = new SalaryTimeline({
      hireDate: '2023-01-01',
      records: [makeRecord({ id: 'r1', effectiveFrom: '2026-04-01' })],
    });

    const change = (effectiveFrom: string) => () =>
      timeline.recordChange({
        amountMinor: 2_200_000,
        currency: 'INR',
        effectiveFrom,
        changeReason: 'MERIT',
        note: null,
      });

    expect(change('2026-04-01')).toThrow(RetroactiveChangeError); // same day
    expect(change('2025-06-01')).toThrow(RetroactiveChangeError); // earlier
  });

  it('rejects a change dated before the employee hire date', () => {
    const timeline = new SalaryTimeline({ hireDate: '2023-01-01', records: [] });

    const change = () =>
      timeline.recordChange({
        amountMinor: 1_500_000,
        currency: 'INR',
        effectiveFrom: '2022-12-01',
        changeReason: 'HIRE',
        note: null,
      });

    expect(change).toThrow(EffectiveDateBeforeHireError);
  });

  it('closes the previous open period at the day before the new effective date', () => {
    const timeline = new SalaryTimeline({
      hireDate: '2023-01-01',
      records: [
        makeRecord({ id: 'r1', effectiveFrom: '2023-01-01', effectiveTo: null }),
      ],
    });

    const updated = timeline.recordChange({
      amountMinor: 2_000_000,
      currency: 'INR',
      effectiveFrom: '2026-04-01',
      changeReason: 'MERIT',
      note: null,
    });

    const previous = updated.records.find((r) => r.id === 'r1');
    expect(previous?.effectiveTo).toBe('2026-03-31');
  });
});
