import { describe, it, expect } from 'vitest';

import { Money } from '../money/Money.js';
import type { Clock } from '../shared/Clock.js';
import type { SalaryRecord } from './SalaryRecord.js';
import {
  AlreadyCorrectedError,
  CorrectionCurrencyMismatchError,
  EffectiveDateBeforeHireError,
  RetroactiveChangeError,
} from './errors.js';
import { SalaryTimeline } from './SalaryTimeline.js';

const clockAt = (iso: string): Clock => ({
  now: () => new Date(iso),
  today: () => iso.slice(0, 10),
});

function makeRecord(overrides: Partial<SalaryRecord> = {}): SalaryRecord {
  return {
    id: 'r1',
    amount: Money.of(1_500_000, 'INR'),
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
    const timeline = new SalaryTimeline({ employeeId: 'e1', hireDate: '2023-01-01', records: [] });

    const writes = timeline.recordChange({
      amountMinor: 1_500_000,
      currency: 'INR',
      effectiveFrom: '2023-01-01',
      changeReason: 'HIRE',
      note: null,
    });

    expect(writes.closePeriod).toBeUndefined();
    expect(writes.insert).toEqual({
      employeeId: 'e1',
      amount: Money.of(1_500_000, 'INR'),
      effectiveFrom: '2023-01-01',
      effectiveTo: null,
      changeReason: 'HIRE',
      note: null,
    });
  });

  it('rejects a change whose amount is not a whole number of minor units', () => {
    const timeline = new SalaryTimeline({ employeeId: 'e1', hireDate: '2023-01-01', records: [] });

    const change = () =>
      timeline.recordChange({
        amountMinor: 1234.5,
        currency: 'INR',
        effectiveFrom: '2023-01-01',
        changeReason: 'HIRE',
        note: null,
      });

    expect(change).toThrow(/whole number/i);
  });

  it('accepts a change dated after the latest live record', () => {
    const timeline = new SalaryTimeline({
      employeeId: 'e1',
      hireDate: '2023-01-01',
      records: [makeRecord({ id: 'r1', effectiveFrom: '2023-01-01' })],
    });

    const writes = timeline.recordChange({
      amountMinor: 2_000_000,
      currency: 'INR',
      effectiveFrom: '2026-04-01',
      changeReason: 'MERIT',
      note: null,
    });

    // the prior record is closed, not dropped; the new one is inserted
    expect(writes.closePeriod?.recordId).toBe('r1');
    expect(writes.insert.effectiveFrom).toBe('2026-04-01');
  });

  it('rejects a change dated on or before the latest live record', () => {
    const timeline = new SalaryTimeline({
      employeeId: 'e1',
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
    const timeline = new SalaryTimeline({ employeeId: 'e1', hireDate: '2023-01-01', records: [] });

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
      employeeId: 'e1',
      hireDate: '2023-01-01',
      records: [
        makeRecord({ id: 'r1', effectiveFrom: '2023-01-01', effectiveTo: null }),
      ],
    });

    const writes = timeline.recordChange({
      amountMinor: 2_000_000,
      currency: 'INR',
      effectiveFrom: '2026-04-01',
      changeReason: 'MERIT',
      note: null,
    });

    expect(writes.closePeriod).toEqual({
      recordId: 'r1',
      effectiveTo: '2026-03-31',
    });
  });
});

describe('SalaryTimeline.currentAt', () => {
  it('returns the record whose period covers the given date', () => {
    const timeline = new SalaryTimeline({
      employeeId: 'e1',
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
      employeeId: 'e1',
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

describe('SalaryTimeline.correct', () => {
  it('copies the original effective dates and change_reason onto the replacement', () => {
    const timeline = new SalaryTimeline({
      employeeId: 'e1',
      hireDate: '2023-01-01',
      records: [
        makeRecord({
          id: 'r2',
          amount: Money.of(2_000_000, 'INR'),
          effectiveFrom: '2026-04-01',
          effectiveTo: null,
          changeReason: 'PROMOTION',
          note: null,
        }),
      ],
    });

    const writes = timeline.correct(
      'r2',
      Money.of(2_200_000, 'INR'),
      'Corrects #r2: contract says 22L',
      clockAt('2026-08-29T00:00:00Z'),
    );

    expect(writes.insert).toEqual({
      employeeId: 'e1',
      amount: Money.of(2_200_000, 'INR'),
      effectiveFrom: '2026-04-01', // copied
      effectiveTo: null, // copied
      changeReason: 'PROMOTION', // copied — never 'CORRECTION'
      note: 'Corrects #r2: contract says 22L',
    });
    expect(writes.supersede).toEqual({
      recordId: 'r2',
      at: new Date('2026-08-29T00:00:00Z'),
    });
  });

  it('rejects correcting a record that has already been superseded', () => {
    const timeline = new SalaryTimeline({
      employeeId: 'e1',
      hireDate: '2023-01-01',
      records: [
        makeRecord({
          id: 'r2',
          changeReason: 'MERIT',
          supersededAt: new Date('2026-08-01T00:00:00Z'),
          supersededById: 'r3',
        }),
        makeRecord({ id: 'r3', changeReason: 'MERIT' }),
      ],
    });

    expect(() =>
      timeline.correct(
        'r2',
        Money.of(2_500_000, 'INR'),
        'a second correction',
        clockAt('2026-09-01T00:00:00Z'),
      ),
    ).toThrow(AlreadyCorrectedError);
  });

  it('correcting a record cannot change its currency', () => {
    const timeline = new SalaryTimeline({
      employeeId: 'e1',
      hireDate: '2023-01-01',
      records: [
        makeRecord({
          id: 'r2',
          amount: Money.of(2_000_000, 'INR'),
          effectiveFrom: '2026-04-01',
          changeReason: 'MERIT',
        }),
      ],
    });

    expect(() =>
      timeline.correct(
        'r2',
        Money.of(24_000, 'USD'),
        'entered against the wrong record',
        clockAt('2026-09-01T00:00:00Z'),
      ),
    ).toThrow(CorrectionCurrencyMismatchError);
  });
});
