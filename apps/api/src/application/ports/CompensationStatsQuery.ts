export type GroupBy = 'department' | 'country' | 'jobLevel';

export interface StatsFilters {
  departmentId?: string;
  countryCode?: string;
  jobLevelId?: string;
}

export interface StatsRow {
  key: string;
  label: string;
  headcount: number;
  totalBaseMinor: number;
  meanBaseMinor: number;
  medianBaseMinor: number;
  p25BaseMinor: number;
  p75BaseMinor: number;
}

/**
 * A read model, not an aggregate store — hence Query, not Repository. Its
 * implementation computes the percentiles in SQL (PERCENTILE_CONT WITHIN GROUP
 * over amount_base_minor), never by loading rows into Node.
 */
export interface CompensationStatsQuery {
  statsBy(
    groupBy: GroupBy,
    filters: StatsFilters,
    on: string,
  ): Promise<StatsRow[]>;
}
