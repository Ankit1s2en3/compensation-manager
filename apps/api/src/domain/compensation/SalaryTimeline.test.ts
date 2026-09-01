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

describe('SalaryTimeline.currentAt', () => {
  it('returns the record whose period covers the given date', () => {
    const timeline = new SalaryTimeline({
      hireDate: '2023-01-01',
      records: [
        makeRecord({
          id: 'r1',
          effectiveFrom: '2023-01-01',
          effectiveTo: '2026-03-31',
        }),
        makeRecord({
          id: 'r2',
          effectiveFrom: '2026-04-01',
          effectiveTo: null,
          changeReason: 'MERIT',
        }),
      ],
    });

    expect(timeline.currentAt('2024-06-15')?.id).toBe('r1');
    expect(timeline.currentAt('2026-09-01')?.id).toBe('r2');
  });

  it('ignores superseded records when more than one period covers the date', () => {
    const timeline = new SalaryTimeline({
      hireDate: '2023-01-01',
      records: [
        makeRecord({
          id: 'r2',
          effectiveFrom: '2026-04-01',
          effectiveTo: null,
          changeReason: 'MERIT',
          supersededAt: new Date('2026-08-29T00:00:00Z'),
          supersededById: 'r3',
        }),
        makeRecord({
          id: 'r3',
          effectiveFrom: '2026-04-01',
          effectiveTo: null,
          changeReason: 'MERIT',
        }),
      ],
    });

    expect(timeline.currentAt('2026-09-01')?.id).toBe('r3');
  });
});
