import { describe, expect, it } from 'vitest';

import type {
  CompensationStatsQuery,
  GroupBy,
  StatsFilters,
  StatsRow,
} from './ports/CompensationStatsQuery.js';
import { GetCompensationStats } from './GetCompensationStats.js';
import { FixedClock } from './testing/FixedClock.js';

class SpyStatsQuery implements CompensationStatsQuery {
  readonly calls: Array<{
    groupBy: GroupBy;
    filters: StatsFilters;
    on: string;
  }> = [];

  async statsBy(
    groupBy: GroupBy,
    filters: StatsFilters,
    on: string,
  ): Promise<StatsRow[]> {
    this.calls.push({ groupBy, filters, on });
    return [];
  }
}

describe('GetCompensationStats', () => {
  it('passes clock.today() through to statsBy', async () => {
    const stats = new SpyStatsQuery();
    const useCase = new GetCompensationStats(stats, new FixedClock('2026-07-20'));

    await useCase.execute('department', { countryCode: 'IN' });

    expect(stats.calls).toEqual([
      { groupBy: 'department', filters: { countryCode: 'IN' }, on: '2026-07-20' },
    ]);
  });
});
