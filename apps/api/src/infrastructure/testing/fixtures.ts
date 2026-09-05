import { sql } from 'drizzle-orm';

import type { Database } from '../db.js';
import { fxToBaseMinor } from '../repositories/fx.js';
import * as schema from '../schema.js';

/** Named handles for the fixture employees the tests lean on. */
export const FIXTURES = {
  singleHire: '1', // one HIRE record, nothing else
  threeAcrossYears: '2', // HIRE -> MERIT -> PROMOTION over 2021..2023
  jpy: '3', // zero-exponent currency
  terminated: '4',
  corrected: '5', // MERIT superseded by a MERIT that shares its dates
} as const;

/** Record ids on the corrected employee's timeline. */
export const CORRECTION = {
  superseded: '9',
  replacement: '10',
} as const;

const RATE: Record<string, number> = {
  USD: 1,
  EUR: 1.08,
  GBP: 1.27,
  INR: 0.0115,
  JPY: 0.0068,
  SGD: 0.74,
  BRL: 0.19,
};

const CURRENCIES = [
  { code: 'USD', exponent: 2, name: 'US Dollar' },
  { code: 'EUR', exponent: 2, name: 'Euro' },
  { code: 'GBP', exponent: 2, name: 'Pound Sterling' },
  { code: 'INR', exponent: 2, name: 'Indian Rupee' },
  { code: 'JPY', exponent: 0, name: 'Japanese Yen' },
  { code: 'SGD', exponent: 2, name: 'Singapore Dollar' },
  { code: 'BRL', exponent: 2, name: 'Brazilian Real' },
];

const DEPARTMENTS = [
  { id: 1, name: 'Engineering' },
  { id: 2, name: 'Sales' },
  { id: 3, name: 'Support' },
  { id: 4, name: 'Finance' },
  { id: 5, name: 'HR' },
];

const JOB_LEVELS = [
  { id: 1, name: 'L1 Junior', rank: 1 },
  { id: 2, name: 'L2 Associate', rank: 2 },
  { id: 3, name: 'L3 Mid', rank: 3 },
  { id: 4, name: 'L4 Senior', rank: 4 },
  { id: 5, name: 'L5 Staff', rank: 5 },
  { id: 6, name: 'L6 Principal', rank: 6 },
];

const FX_RATE_SET = {
  id: 1,
  name: 'Test FY2026 Rates',
  asOfDate: '2026-01-01',
  isActive: true,
};

const EXCHANGE_RATES = CURRENCIES.map((c) => ({
  rateSetId: 1,
  currencyCode: c.code,
  rateToBase: (RATE[c.code] ?? 1).toFixed(8),
}));

const USER = {
  id: 1,
  email: 'hr.manager@acme.test',
  passwordHash: 'not-a-real-hash',
  role: 'HR_MANAGER',
};

interface EmpSpec {
  id: number;
  first: string;
  last: string;
  country: string;
  departmentId: number;
  rank: number;
  hireDate: string;
  status?: 'ACTIVE' | 'TERMINATED';
  employmentType?: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT';
}

const EMP_SPECS: EmpSpec[] = [
  { id: 1, first: 'Ada', last: 'Lovelace', country: 'US', departmentId: 1, rank: 3, hireDate: '2024-01-01' },
  { id: 2, first: 'Priya', last: 'Nair', country: 'IN', departmentId: 1, rank: 4, hireDate: '2021-01-01' },
  { id: 3, first: 'Kenji', last: 'Watanabe', country: 'JP', departmentId: 2, rank: 3, hireDate: '2023-04-01' },
  { id: 4, first: 'Oliver', last: 'Bennett', country: 'GB', departmentId: 3, rank: 2, hireDate: '2022-01-01', status: 'TERMINATED' },
  { id: 5, first: 'Grace', last: 'Hopper', country: 'US', departmentId: 1, rank: 5, hireDate: '2022-03-01' },
  { id: 6, first: 'Diego', last: 'Martinez', country: 'US', departmentId: 1, rank: 2, hireDate: '2025-02-01' },
  { id: 7, first: 'Lena', last: 'Fischer', country: 'DE', departmentId: 1, rank: 3, hireDate: '2023-06-01' },
  { id: 8, first: 'Sam', last: 'Carter', country: 'US', departmentId: 4, rank: 4, hireDate: '2024-07-01' },
  { id: 9, first: 'Anjali', last: 'Rao', country: 'IN', departmentId: 3, rank: 2, hireDate: '2025-01-01' },
  { id: 10, first: 'Ruth', last: 'Clarke', country: 'GB', departmentId: 2, rank: 4, hireDate: '2022-09-01' },
  { id: 11, first: 'Wei', last: 'Lim', country: 'SG', departmentId: 5, rank: 3, hireDate: '2024-03-01' },
  { id: 12, first: 'Bruno', last: 'Alves', country: 'BR', departmentId: 2, rank: 2, hireDate: '2023-01-01', status: 'TERMINATED' },
];

const COUNTRY_CURRENCY: Record<string, string> = {
  US: 'USD', IN: 'INR', GB: 'GBP', DE: 'EUR', JP: 'JPY', SG: 'SGD', BR: 'BRL',
};
const LEVEL_PREFIX = ['', '', '', 'Senior ', 'Staff ', 'Principal '];
const ROLE: Record<number, string> = {
  1: 'Engineer', 2: 'Account Executive', 3: 'Support Specialist',
  4: 'Financial Analyst', 5: 'People Partner',
};

const EMPLOYEES = EMP_SPECS.map((e) => ({
  id: e.id,
  employeeCode: `E${1000 + e.id}`,
  firstName: e.first,
  lastName: e.last,
  email: `${e.first}.${e.last}@acme.test`.toLowerCase(),
  departmentId: e.departmentId,
  jobLevelId: e.rank, // job_level ids line up with rank
  jobTitle: `${LEVEL_PREFIX[e.rank - 1] ?? ''}${ROLE[e.departmentId] ?? 'Specialist'}`,
  countryCode: e.country,
  employmentType: e.employmentType ?? ('FULL_TIME' as const),
  hireDate: e.hireDate,
  status: e.status ?? ('ACTIVE' as const),
}));

interface SalarySpec {
  id: number;
  employeeId: number;
  amountMinor: number;
  currency: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  changeReason: 'HIRE' | 'MERIT' | 'PROMOTION' | 'MARKET_ADJUSTMENT';
  note?: string;
  supersededAt?: string;
}

const SALARY_SPECS: SalarySpec[] = [
  // 1 — single HIRE record
  { id: 1, employeeId: 1, amountMinor: 12_000_000, currency: 'USD', effectiveFrom: '2024-01-01', effectiveTo: null, changeReason: 'HIRE' },
  // 2 — three records over four years
  { id: 2, employeeId: 2, amountMinor: 200_000_000, currency: 'INR', effectiveFrom: '2021-01-01', effectiveTo: '2022-05-31', changeReason: 'HIRE' },
  { id: 3, employeeId: 2, amountMinor: 230_000_000, currency: 'INR', effectiveFrom: '2022-06-01', effectiveTo: '2023-08-31', changeReason: 'MERIT' },
  { id: 4, employeeId: 2, amountMinor: 300_000_000, currency: 'INR', effectiveFrom: '2023-09-01', effectiveTo: null, changeReason: 'PROMOTION' },
  // 3 — JPY (exponent 0)
  { id: 5, employeeId: 3, amountMinor: 9_000_000, currency: 'JPY', effectiveFrom: '2023-04-01', effectiveTo: '2024-09-30', changeReason: 'HIRE' },
  { id: 6, employeeId: 3, amountMinor: 9_600_000, currency: 'JPY', effectiveFrom: '2024-10-01', effectiveTo: null, changeReason: 'MERIT' },
  // 4 — terminated
  { id: 7, employeeId: 4, amountMinor: 5_500_000, currency: 'GBP', effectiveFrom: '2022-01-01', effectiveTo: null, changeReason: 'HIRE' },
  // 5 — a correction: #9 (MERIT) superseded by #10 (MERIT), same dates
  { id: 8, employeeId: 5, amountMinor: 15_000_000, currency: 'USD', effectiveFrom: '2022-03-01', effectiveTo: '2023-08-31', changeReason: 'HIRE' },
  { id: 9, employeeId: 5, amountMinor: 16_500_000, currency: 'USD', effectiveFrom: '2023-09-01', effectiveTo: null, changeReason: 'MERIT', supersededAt: '2024-01-15T00:00:00.000Z' },
  { id: 10, employeeId: 5, amountMinor: 17_200_000, currency: 'USD', effectiveFrom: '2023-09-01', effectiveTo: null, changeReason: 'MERIT', note: 'Corrects #9: transposed digits' },
  // 6..12 — filler for search / pagination
  { id: 11, employeeId: 6, amountMinor: 10_500_000, currency: 'USD', effectiveFrom: '2025-02-01', effectiveTo: null, changeReason: 'HIRE' },
  { id: 12, employeeId: 7, amountMinor: 8_000_000, currency: 'EUR', effectiveFrom: '2023-06-01', effectiveTo: '2024-11-30', changeReason: 'HIRE' },
  { id: 13, employeeId: 7, amountMinor: 8_600_000, currency: 'EUR', effectiveFrom: '2024-12-01', effectiveTo: null, changeReason: 'MERIT' },
  { id: 14, employeeId: 8, amountMinor: 14_000_000, currency: 'USD', effectiveFrom: '2024-07-01', effectiveTo: null, changeReason: 'HIRE' },
  { id: 15, employeeId: 9, amountMinor: 90_000_000, currency: 'INR', effectiveFrom: '2025-01-01', effectiveTo: null, changeReason: 'HIRE' },
  { id: 16, employeeId: 10, amountMinor: 7_000_000, currency: 'GBP', effectiveFrom: '2022-09-01', effectiveTo: '2024-02-29', changeReason: 'HIRE' },
  { id: 17, employeeId: 10, amountMinor: 8_800_000, currency: 'GBP', effectiveFrom: '2024-03-01', effectiveTo: null, changeReason: 'PROMOTION' },
  { id: 18, employeeId: 11, amountMinor: 9_500_000, currency: 'SGD', effectiveFrom: '2024-03-01', effectiveTo: null, changeReason: 'HIRE' },
  { id: 19, employeeId: 12, amountMinor: 14_000_000, currency: 'BRL', effectiveFrom: '2023-01-01', effectiveTo: null, changeReason: 'HIRE' },
];

const SALARY_RECORDS = SALARY_SPECS.map((s) => {
  const rate = RATE[s.currency] ?? 1;
  return {
    id: s.id,
    employeeId: s.employeeId,
    amountMinor: s.amountMinor,
    currencyCode: s.currency,
    effectiveFrom: s.effectiveFrom,
    effectiveTo: s.effectiveTo,
    changeReason: s.changeReason,
    note: s.note ?? null,
    supersededAt: s.supersededAt === undefined ? null : new Date(s.supersededAt),
    supersededById: null,
    fxRateSetId: 1,
    fxRateToBase: rate.toFixed(8),
    amountBaseMinor: fxToBaseMinor(s.amountMinor, s.currency, rate),
    createdAt: new Date(`${s.effectiveFrom}T09:00:00.000Z`),
    createdBy: 'fixtures',
  };
});

/** Load the 12-employee fixture set. Assumes the tables were just truncated. */
export async function loadFixtures(db: Database): Promise<void> {
  await db.insert(schema.currencies).values(CURRENCIES);
  await db.insert(schema.departments).values(DEPARTMENTS);
  await db.insert(schema.jobLevels).values(JOB_LEVELS);
  await db.insert(schema.fxRateSets).values(FX_RATE_SET);
  await db.insert(schema.exchangeRates).values(EXCHANGE_RATES);
  await db.insert(schema.users).values(USER);
  await db.insert(schema.employees).values(EMPLOYEES);
  await db.insert(schema.salaryRecords).values(SALARY_RECORDS);

  // self-FK: wire the correction link now that both rows exist
  await db.execute(
    sql`UPDATE salary_records SET superseded_by_id = 10 WHERE id = 9`,
  );

  // explicit ids were used — move the sequences past them so apply()'s
  // serial inserts don't collide
  for (const t of [
    'departments',
    'job_levels',
    'fx_rate_sets',
    'users',
    'employees',
    'salary_records',
  ]) {
    await db.execute(
      sql`SELECT setval(pg_get_serial_sequence(${t}, 'id'), (SELECT max(id) FROM ${sql.identifier(t)}))`,
    );
  }
}
