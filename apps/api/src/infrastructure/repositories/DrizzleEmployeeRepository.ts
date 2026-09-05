import { eq, sql } from 'drizzle-orm';

import type {
  Employee,
  EmployeeListItem,
  EmployeeRepository,
  EmployeeSearchCriteria,
  Page,
  Paged,
} from '../../application/ports/EmployeeRepository.js';
import { Money } from '../../domain/money/Money.js';
import type { Database } from '../db.js';
import { employees } from '../schema.js';
import { toEmployee } from './mappers.js';
import { liveAndCovering } from './predicates.js';

interface SearchRow {
  id: number;
  employee_code: string;
  first_name: string;
  last_name: string;
  department_id: number;
  job_level_id: number;
  country_code: string;
  status: 'ACTIVE' | 'TERMINATED';
  amount_minor: string | null;
  currency_code: string | null;
}

export class DrizzleEmployeeRepository implements EmployeeRepository {
  constructor(private readonly db: Database) {}

  async findById(id: string): Promise<Employee | null> {
    const [row] = await this.db
      .select()
      .from(employees)
      .where(eq(employees.id, Number(id)))
      .limit(1);

    return row === undefined ? null : toEmployee(row);
  }

  async search(
    criteria: EmployeeSearchCriteria,
    page: Page,
  ): Promise<Paged<EmployeeListItem>> {
    const c = criteria;
    // "Current" for the directory means today — computed here (infrastructure,
    // not domain/application, so `new Date()` is allowed) and fed through the
    // same liveAndCovering predicate findCurrentSalary uses.
    const today = new Date().toISOString().slice(0, 10);

    // Each nullable filter is skipped when its parameter is null.
    const where = sql`
      (${c.departmentId ?? null}::int  IS NULL OR e.department_id = ${c.departmentId ?? null}::int)
      AND (${c.countryCode ?? null}::text IS NULL OR e.country_code = ${c.countryCode ?? null})
      AND (${c.jobLevelId ?? null}::int  IS NULL OR e.job_level_id = ${c.jobLevelId ?? null}::int)
      AND (${c.status ?? null}::text     IS NULL OR e.status = (${c.status ?? null})::employee_status)
      AND (${c.nameQuery ?? null}::text  IS NULL OR (e.first_name || ' ' || e.last_name) ILIKE '%' || ${c.nameQuery ?? null} || '%')
    `;

    const rows = (await this.db.execute(sql`
      SELECT e.id, e.employee_code, e.first_name, e.last_name,
             e.department_id, e.job_level_id, e.country_code, e.status,
             cur.amount_minor, cur.currency_code
      FROM employees e
      LEFT JOIN LATERAL (
        SELECT amount_minor, currency_code
        FROM salary_records
        WHERE ${liveAndCovering(today)} AND employee_id = e.id
        ORDER BY effective_from DESC
        LIMIT 1
      ) cur ON true
      WHERE ${where}
      ORDER BY e.id
      LIMIT ${page.limit} OFFSET ${page.offset}
    `)) as unknown as SearchRow[];

    const countRows = (await this.db.execute(sql`
      SELECT count(*)::int AS total FROM employees e WHERE ${where}
    `)) as unknown as Array<{ total: number }>;

    const items: EmployeeListItem[] = rows.map((r) => ({
      id: String(r.id),
      employeeCode: r.employee_code,
      firstName: r.first_name,
      lastName: r.last_name,
      departmentId: String(r.department_id),
      jobLevelId: String(r.job_level_id),
      countryCode: r.country_code,
      status: r.status,
      currentSalary:
        r.amount_minor === null || r.currency_code === null
          ? null
          : Money.of(Number(r.amount_minor), r.currency_code),
    }));

    return {
      items,
      total: countRows[0]?.total ?? 0,
      limit: page.limit,
      offset: page.offset,
    };
  }
}
