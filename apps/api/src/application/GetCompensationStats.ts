import type { Clock } from '../domain/shared/Clock.js';
import type {
  CompensationStatsQuery,
  GroupBy,
  StatsFilters,
  StatsRow,
} from './ports/CompensationStatsQuery.js';

/** Compensation insights. Thin — the query does the aggregation. */
export class GetCompensationStats {
  constructor(
    private readonly stats: CompensationStatsQuery,
    private readonly clock: Clock,
  ) {}

  execute(groupBy: GroupBy, filters: StatsFilters): Promise<StatsRow[]> {
    return this.stats.statsBy(groupBy, filters, this.clock.today());
  }
}
