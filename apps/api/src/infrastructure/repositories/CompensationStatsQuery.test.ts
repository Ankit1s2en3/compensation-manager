import { describe, expect, it } from 'vitest';

import { testDb } from '../testing/testDb.js';
import { DrizzleCompensationStatsQuery } from './DrizzleCompensationStatsQuery.js';

const ON = '2026-06-01';

describe('DrizzleCompensationStatsQuery.statsBy', () => {
  it('aggregates headcount and PERCENTILE_CONT stats per department, active only', async () => {
    const stats = new DrizzleCompensationStatsQuery(testDb);

    const rows = await stats.statsBy('department', {}, ON);
    const byLabel = new Map(rows.map((r) => [r.label, r]));

    // Engineering: active employees 1, 2, 5, 6, 7 — live-open base amounts
    // 12_000_000 / 3_450_000 / 17_200_000 / 10_500_000 / 9_288_000
    expect(byLabel.get('Engineering')).toEqual({
      key: expect.any(String),
      label: 'Engineering',
      headcount: 5,
      totalBaseMinor: 52_438_000,
      meanBaseMinor: 10_487_600,
      medianBaseMinor: 10_500_000,
      p25BaseMinor: 9_288_000,
      p75BaseMinor: 12_000_000,
    });

    // Sales: Bruno (#12) is TERMINATED and must not count.
    const sales = byLabel.get('Sales');
    expect(sales?.headcount).toBe(2);
    expect(sales?.medianBaseMinor).toBe(8_852_000); // interpolated between two rows
  });

  it('filters, and every stat is an integer computed in SQL', async () => {
    const stats = new DrizzleCompensationStatsQuery(testDb);

    const rows = await stats.statsBy('country', { departmentId: '1' }, ON);
    for (const r of rows) {
      for (const v of [
        r.totalBaseMinor,
        r.meanBaseMinor,
        r.medianBaseMinor,
        r.p25BaseMinor,
        r.p75BaseMinor,
      ]) {
        expect(Number.isInteger(v)).toBe(true);
      }
      expect(r.p25BaseMinor).toBeLessThanOrEqual(r.medianBaseMinor);
      expect(r.medianBaseMinor).toBeLessThanOrEqual(r.p75BaseMinor);
    }
    // department 1 spans US, IN, DE among the fixtures
    expect(rows.map((r) => r.label).sort()).toEqual(['DE', 'IN', 'US']);
  });
});
