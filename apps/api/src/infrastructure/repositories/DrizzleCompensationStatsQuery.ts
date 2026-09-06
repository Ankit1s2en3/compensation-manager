import { sql } from 'drizzle-orm';

import type {
  CompensationStatsQuery,
  GroupBy,
  StatsFilters,
  StatsRow,
} from '../../application/ports/CompensationStatsQuery.js';
import type { Database } from '../db.js';
import { liveAndCovering } from './predicates.js';

interface Row {
  key: string;
  label: string;
  headcount: number;
  total_base_minor: string;
  mean_base_minor: string;
  median_base_minor: string;
  p25_base_minor: string;
  p75_base_minor: string;
}

const DIMENSION: Record<
  GroupBy,
  { join: ReturnType<typeof sql>; key: ReturnType<typeof sql>; label: ReturnType<typeof sql>; order: ReturnType<typeof sql> }
> = {
  department: {
    join: sql`JOIN departments d ON d.id = employees.department_id`,
    key: sql`d.id::text`,
    label: sql`d.name`,
    order: sql`d.name`,
  },
  country: {
    join: sql``,
    key: sql`employees.country_code`,
    label: sql`employees.country_code`,
    order: sql`employees.country_code`,
  },
  jobLevel: {
    join: sql`JOIN job_levels j ON j.id = employees.job_level_id`,
    key: sql`j.id::text`,
    label: sql`j.name`,
    order: sql`j.rank`,
  },
};

export class DrizzleCompensationStatsQuery implements CompensationStatsQuery {
  constructor(private readonly db: Database) {}

  async statsBy(
    groupBy: GroupBy,
    filters: StatsFilters,
    on: string,
  ): Promise<StatsRow[]> {
    const dim = DIMENSION[groupBy];
    const f = filters;

    const where = sql`
      employees.status = 'ACTIVE'
      AND (${f.departmentId ?? null}::int  IS NULL OR employees.department_id = ${f.departmentId ?? null}::int)
      AND (${f.countryCode ?? null}::text IS NULL OR employees.country_code = ${f.countryCode ?? null})
      AND (${f.jobLevelId ?? null}::int  IS NULL OR employees.job_level_id = ${f.jobLevelId ?? null}::int)
    `;

    // Percentiles computed in Postgres — rows are never pulled into Node.
    const rows = (await this.db.execute(sql`
      SELECT
        ${dim.key}   AS key,
        ${dim.label} AS label,
        count(*)::int AS headcount,
        sum(salary_records.amount_base_minor)::bigint AS total_base_minor,
        round(avg(salary_records.amount_base_minor))::bigint AS mean_base_minor,
        round(percentile_cont(0.5)  within group (order by salary_records.amount_base_minor))::bigint AS median_base_minor,
        round(percentile_cont(0.25) within group (order by salary_records.amount_base_minor))::bigint AS p25_base_minor,
        round(percentile_cont(0.75) within group (order by salary_records.amount_base_minor))::bigint AS p75_base_minor
      FROM employees
      JOIN salary_records
        ON salary_records.employee_id = employees.id AND ${liveAndCovering(on)}
      ${dim.join}
      WHERE ${where}
      GROUP BY ${dim.key}, ${dim.label}, ${dim.order}
      ORDER BY ${dim.order}
    `)) as unknown as Row[];

    return rows.map((r) => ({
      key: r.key,
      label: r.label,
      headcount: r.headcount,
      totalBaseMinor: Number(r.total_base_minor),
      meanBaseMinor: Number(r.mean_base_minor),
      medianBaseMinor: Number(r.median_base_minor),
      p25BaseMinor: Number(r.p25_base_minor),
      p75BaseMinor: Number(r.p75_base_minor),
    }));
  }
}
