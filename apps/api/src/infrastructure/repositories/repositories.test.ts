import { sql } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';

import { AlreadyCorrectedError } from '../../domain/compensation/errors.js';
import type { TimelineWrites } from '../../domain/compensation/SalaryTimeline.js';
import type { Clock } from '../../domain/shared/Clock.js';
import { Money } from '../../domain/money/Money.js';
import { CORRECTION, FIXTURES } from '../testing/fixtures.js';
import { testDb } from '../testing/testDb.js';
import { DrizzleEmployeeRepository } from './DrizzleEmployeeRepository.js';
import { DrizzleExchangeRateProvider } from './DrizzleExchangeRateProvider.js';
import { DrizzleSalaryRecordRepository } from './DrizzleSalaryRecordRepository.js';

const fixedClock: Clock = {
  now: () => new Date('2026-06-01T00:00:00.000Z'),
  today: () => '2026-06-01',
};

// The date search() measures "current salary" at — supplied by the caller,
// pinned here so the fixture dates don't rot.
const ON = '2026-06-01';

let employees: DrizzleEmployeeRepository;
let salaries: DrizzleSalaryRecordRepository;

beforeEach(() => {
  const rates = new DrizzleExchangeRateProvider(testDb);
  employees = new DrizzleEmployeeRepository(testDb);
  salaries = new DrizzleSalaryRecordRepository(testDb, rates);
});

describe('SalaryRecordRepository.findTimeline', () => {
  it('returns records carrying Money, not raw numbers', async () => {
    const timeline = await salaries.findTimeline(FIXTURES.threeAcrossYears);

    expect(timeline.records).toHaveLength(3);
    for (const record of timeline.records) {
      expect(record.amount).toBeInstanceOf(Money);
      expect(record).not.toHaveProperty('amountMinor');
      expect(record).not.toHaveProperty('currencyCode');
    }
    expect(timeline.records[0]?.amount.amountMinor).toBe(200_000_000);
    expect(timeline.records[0]?.amount.currency).toBe('INR');
  });
});

describe('SalaryRecordRepository.findCurrentSalary', () => {
  it('ignores superseded records', async () => {
    const current = await salaries.findCurrentSalary(
      FIXTURES.corrected,
      '2024-06-01',
    );

    expect(current?.id).toBe(CORRECTION.replacement);
    expect(current?.id).not.toBe(CORRECTION.superseded);
    expect(current?.amount.amountMinor).toBe(17_200_000);
  });

  it('agrees with SalaryTimeline.currentAt for the corrected employee', async () => {
    const on = '2024-06-01';

    const viaQuery = await salaries.findCurrentSalary(FIXTURES.corrected, on);
    const viaTimeline = (
      await salaries.findTimeline(FIXTURES.corrected)
    ).currentAt(on);

    expect(viaQuery?.id).toBe(viaTimeline?.id);
    expect(viaQuery?.id).toBe(CORRECTION.replacement);
  });
});

describe('SalaryRecordRepository.apply', () => {
  it('commits both writes of a raise — close the period and insert', async () => {
    const timeline = await salaries.findTimeline(FIXTURES.singleHire);
    const writes = timeline.recordChange({
      amountMinor: 13_000_000,
      currency: 'USD',
      effectiveFrom: '2025-06-01',
      changeReason: 'MERIT',
      note: null,
    });

    const inserted = await salaries.apply(writes);
    expect(inserted.amount.amountMinor).toBe(13_000_000);
    expect(inserted.changeReason).toBe('MERIT');

    const after = await salaries.findTimeline(FIXTURES.singleHire);
    expect(after.records).toHaveLength(2);
    expect(
      after.records.find((r) => r.changeReason === 'HIRE')?.effectiveTo,
    ).toBe('2025-05-31');
  });

  it('rolls back completely when the insert fails', async () => {
    // Hand-built to bypass the domain guards: the closePeriod would mutate
    // record 1, then the insert fails on an employee_id that does not exist.
    const bad: TimelineWrites = {
      closePeriod: { recordId: '1', effectiveTo: '2025-05-31' },
      insert: {
        employeeId: '999999',
        amount: Money.of(13_000_000, 'USD'),
        effectiveFrom: '2025-06-01',
        effectiveTo: null,
        changeReason: 'MERIT',
        note: null,
      },
    };

    await expect(salaries.apply(bad)).rejects.toThrow();

    const after = await salaries.findTimeline(FIXTURES.singleHire);
    expect(after.records).toHaveLength(1);
    expect(after.records[0]?.effectiveTo).toBeNull();
  });

  it('sets supersededById to the new record’s id', async () => {
    const timeline = await salaries.findTimeline(FIXTURES.singleHire);
    const writes = timeline.correct(
      '1',
      Money.of(12_500_000, 'USD'),
      'keyed the wrong figure',
      fixedClock,
    );

    const replacement = await salaries.apply(writes);

    const original = (await salaries.findTimeline(FIXTURES.singleHire)).records.find(
      (r) => r.id === '1',
    );
    expect(original?.supersededById).toBe(replacement.id);
    expect(original?.supersededAt).toEqual(
      new Date('2026-06-01T00:00:00.000Z'),
    );
  });

  it('rejects a racing second correction of the same record with AlreadyCorrectedError', async () => {
    // Two corrections built from the same timeline snapshot — the concurrent
    // case. The first commits; the second's supersede UPDATE hits zero rows.
    const timeline = await salaries.findTimeline(FIXTURES.singleHire);
    const first = timeline.correct('1', Money.of(12_400_000, 'USD'), 'first fix', fixedClock);
    const second = timeline.correct('1', Money.of(12_600_000, 'USD'), 'second fix', fixedClock);

    await salaries.apply(first);
    await expect(salaries.apply(second)).rejects.toThrow(AlreadyCorrectedError);

    // and the second attempt left nothing behind
    const after = await salaries.findTimeline(FIXTURES.singleHire);
    expect(after.records.filter((r) => r.supersededAt === null)).toHaveLength(1);
  });
});

describe('EmployeeRepository.search', () => {
  it('filters by department and country, with pagination and the current salary', async () => {
    // Engineering = 1, 2, 5, 6, 7
    const engineering = await employees.search(
      { departmentId: '1' },
      { limit: 50, offset: 0 },
      ON,
    );
    expect(engineering.total).toBe(5);
    expect(engineering.items.map((i) => i.id)).toEqual(['1', '2', '5', '6', '7']);

    // US = 1, 5, 6, 8
    const us = await employees.search(
      { countryCode: 'US' },
      { limit: 50, offset: 0 },
      ON,
    );
    expect(us.total).toBe(4);
    expect(us.items.map((i) => i.id)).toEqual(['1', '5', '6', '8']);

    // Engineering AND US = 1, 5, 6
    const both = await employees.search(
      { departmentId: '1', countryCode: 'US' },
      { limit: 50, offset: 0 },
      ON,
    );
    expect(both.items.map((i) => i.id)).toEqual(['1', '5', '6']);

    // page through Engineering, two at a time
    const p0 = await employees.search({ departmentId: '1' }, { limit: 2, offset: 0 }, ON);
    expect(p0.total).toBe(5);
    expect(p0.items.map((i) => i.id)).toEqual(['1', '2']);
    const p2 = await employees.search({ departmentId: '1' }, { limit: 2, offset: 2 }, ON);
    expect(p2.items.map((i) => i.id)).toEqual(['5', '6']);
    const p4 = await employees.search({ departmentId: '1' }, { limit: 2, offset: 4 }, ON);
    expect(p4.items.map((i) => i.id)).toEqual(['7']);

    // current salary resolved in the same query — and the corrected employee
    // shows the live replacement, not the superseded row
    const ada = p0.items.find((i) => i.id === '1');
    expect(ada?.currentSalary).toBeInstanceOf(Money);
    expect(ada?.currentSalary?.amountMinor).toBe(12_000_000);
    const grace = engineering.items.find((i) => i.id === FIXTURES.corrected);
    expect(grace?.currentSalary?.amountMinor).toBe(17_200_000);
  });
});
