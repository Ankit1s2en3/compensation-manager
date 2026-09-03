import { sql } from 'drizzle-orm';

import { client, db } from '../infrastructure/db.js';
import {
  currencies as currencyTable,
  departments as departmentTable,
  employees as employeeTable,
  exchangeRates as exchangeRateTable,
  fxRateSets as fxRateSetTable,
  jobLevels as jobLevelTable,
  salaryRecords as salaryTable,
  users as userTable,
} from '../infrastructure/schema.js';
import {
  currencies,
  departments,
  exchangeRates,
  fxRateSet,
  generate,
  HR_EMAIL,
  HR_PASSWORD_HASH,
  jobLevels,
} from './data.js';

const CHUNK = 1_000;

async function insertChunked<T>(
  rows: readonly T[],
  insert: (slice: T[]) => Promise<unknown>,
): Promise<void> {
  for (let i = 0; i < rows.length; i += CHUNK) {
    await insert(rows.slice(i, i + CHUNK));
  }
}

function ms(from: number): string {
  return `${(performance.now() - from).toFixed(0)} ms`;
}

async function main(): Promise<void> {
  const startedAt = performance.now();

  const { employees, salaries, correctionLinks } = generate();
  console.log(
    `built ${employees.length.toLocaleString()} employees + ` +
      `${salaries.length.toLocaleString()} salary records ` +
      `(${correctionLinks.length} corrections) in ${ms(startedAt)}`,
  );

  const insertStartedAt = performance.now();
  await db.transaction(async (tx) => {
    await tx.execute(sql`
      TRUNCATE salary_records, employees, users, exchange_rates,
               fx_rate_sets, job_levels, departments, currencies
      RESTART IDENTITY CASCADE
    `);

    await tx.insert(currencyTable).values(currencies);
    await tx.insert(departmentTable).values(departments);
    await tx.insert(jobLevelTable).values(jobLevels);
    await tx.insert(fxRateSetTable).values(fxRateSet);
    await tx.insert(exchangeRateTable).values(exchangeRates);
    await tx.insert(userTable).values({
      id: 1,
      email: HR_EMAIL,
      passwordHash: HR_PASSWORD_HASH,
      role: 'HR_MANAGER',
    });

    await insertChunked(employees, (slice) =>
      tx.insert(employeeTable).values(slice),
    );
    await insertChunked(salaries, (slice) =>
      tx.insert(salaryTable).values(slice),
    );

    // Wire superseded_by_id after every row exists (self-FK, one statement).
    if (correctionLinks.length > 0) {
      const pairs = sql.join(
        correctionLinks.map(
          (l) => sql`(${l.originalId}::int, ${l.replacementId}::int)`,
        ),
        sql`, `,
      );
      await tx.execute(sql`
        UPDATE salary_records AS s
        SET superseded_by_id = v.rep
        FROM (VALUES ${pairs}) AS v(orig, rep)
        WHERE s.id = v.orig
      `);
    }

    // Explicit ids were used; move the sequences past them.
    for (const t of [
      'departments',
      'job_levels',
      'fx_rate_sets',
      'users',
      'employees',
      'salary_records',
    ]) {
      await tx.execute(
        sql`SELECT setval(pg_get_serial_sequence(${t}, 'id'), (SELECT max(id) FROM ${sql.identifier(t)}))`,
      );
    }
  });
  console.log(`inserted in ${ms(insertStartedAt)}`);
  console.log(`total ${ms(startedAt)}`);

  // --- proof the seed is realistic, not flat ---
  const byDept = await db.execute(sql`
    SELECT d.name,
           count(*)                                              AS headcount,
           round(avg(s.amount_base_minor) / 100.0)::bigint       AS avg_annual_usd
    FROM employees e
    JOIN departments d    ON d.id = e.department_id
    JOIN salary_records s ON s.employee_id = e.id
                         AND s.superseded_at IS NULL
                         AND s.effective_to IS NULL
    WHERE e.status = 'ACTIVE'
    GROUP BY d.name
    ORDER BY headcount DESC
  `);
  console.log('\nlive salary by department (active employees):');
  console.table(byDept);

  const byCountry = await db.execute(sql`
    SELECT e.country_code,
           count(*)                                        AS headcount,
           round(avg(s.amount_base_minor) / 100.0)::bigint AS avg_annual_usd
    FROM employees e
    JOIN salary_records s ON s.employee_id = e.id
                         AND s.superseded_at IS NULL
                         AND s.effective_to IS NULL
    WHERE e.status = 'ACTIVE'
    GROUP BY e.country_code
    ORDER BY avg_annual_usd DESC
  `);
  console.log('\nlive salary by country (active employees, USD-comparable):');
  console.table(byCountry);

  const [totals] = await db.execute(sql`
    SELECT (SELECT count(*) FROM employees)                                   AS employees,
           (SELECT count(*) FROM employees WHERE status = 'TERMINATED')       AS terminated,
           (SELECT count(*) FROM salary_records)                             AS salary_records,
           (SELECT count(*) FROM salary_records WHERE superseded_at IS NOT NULL) AS corrected
  `);
  console.log('\ntotals:', totals);
}

main()
  .then(() => client.end())
  .catch(async (err: unknown) => {
    console.error(err);
    await client.end();
    process.exitCode = 1;
  });
