import { scryptSync } from 'node:crypto';

import { faker } from '@faker-js/faker';

/** Fixed seed — same 10,000 employees every run. */
export const SEED = 20260101;

/** The seed's fixed notion of "today", so timelines are reproducible whenever it runs. */
const NOW = new Date('2026-09-01T00:00:00.000Z');

// ---------------------------------------------------------------------------
// Reference data
// ---------------------------------------------------------------------------

export const currencies = [
  { code: 'USD', exponent: 2, name: 'US Dollar' },
  { code: 'EUR', exponent: 2, name: 'Euro' },
  { code: 'GBP', exponent: 2, name: 'Pound Sterling' },
  { code: 'INR', exponent: 2, name: 'Indian Rupee' },
  { code: 'JPY', exponent: 0, name: 'Japanese Yen' },
  { code: 'SGD', exponent: 2, name: 'Singapore Dollar' },
  { code: 'BRL', exponent: 2, name: 'Brazilian Real' },
];

const EXPONENT: Record<string, number> = Object.fromEntries(
  currencies.map((c) => [c.code, c.exponent]),
);

const BASE_CURRENCY = 'USD';

/**
 * Value of one unit of the currency in USD (the base). Deliberately matches the
 * worked examples in data-model.md §4 for INR, EUR and JPY.
 */
const RATE_TO_BASE: Record<string, number> = {
  USD: 1,
  EUR: 1.08,
  GBP: 1.27,
  INR: 0.0115,
  JPY: 0.0068,
  SGD: 0.74,
  BRL: 0.19,
};

export const departments = [
  { id: 1, name: 'Engineering' },
  { id: 2, name: 'Sales' },
  { id: 3, name: 'Support' },
  { id: 4, name: 'Finance' },
  { id: 5, name: 'HR' },
];

export const jobLevels = [
  { id: 1, name: 'L1 Junior', rank: 1 },
  { id: 2, name: 'L2 Associate', rank: 2 },
  { id: 3, name: 'L3 Mid', rank: 3 },
  { id: 4, name: 'L4 Senior', rank: 4 },
  { id: 5, name: 'L5 Staff', rank: 5 },
  { id: 6, name: 'L6 Principal', rank: 6 },
];

export const fxRateSet = {
  id: 1,
  name: 'FY2026 Planning Rates',
  asOfDate: '2026-01-01',
  isActive: true,
};

export const exchangeRates = currencies.map((c) => ({
  rateSetId: fxRateSet.id,
  currencyCode: c.code,
  rateToBase: (RATE_TO_BASE[c.code] ?? 0).toFixed(8),
}));

/** Dev-only. Auth is out of scope; this just lets the app boot with a user. */
export const HR_EMAIL = 'hr.manager@acme.example';
const HR_SALT = 'seed-fixed-salt-0001';
export const HR_PASSWORD_HASH = `scrypt$${HR_SALT}$${scryptSync(
  'compensation-dev',
  HR_SALT,
  64,
).toString('hex')}`;

// ---------------------------------------------------------------------------
// Distributions — realistic, not uniform
// ---------------------------------------------------------------------------

// Engineering >> Sales > Support > Finance > HR
const DEPARTMENTS_W = [
  { weight: 46, value: 1 },
  { weight: 22, value: 2 },
  { weight: 18, value: 3 },
  { weight: 9, value: 4 },
  { weight: 5, value: 5 },
];

const COUNTRIES_W = [
  { weight: 30, value: 'US' },
  { weight: 28, value: 'IN' },
  { weight: 10, value: 'GB' },
  { weight: 9, value: 'DE' },
  { weight: 7, value: 'FR' },
  { weight: 7, value: 'SG' },
  { weight: 5, value: 'JP' },
  { weight: 4, value: 'BR' },
];

const COUNTRY_CURRENCY: Record<string, string> = {
  US: 'USD',
  IN: 'INR',
  GB: 'GBP',
  DE: 'EUR',
  FR: 'EUR',
  JP: 'JPY',
  SG: 'SGD',
  BR: 'BRL',
};

// pyramid — most people are junior/mid
const LEVELS_W = [
  { weight: 15, value: 1 },
  { weight: 26, value: 2 },
  { weight: 30, value: 3 },
  { weight: 18, value: 4 },
  { weight: 8, value: 5 },
  { weight: 3, value: 6 },
];

const EMPLOYMENT_W = [
  { weight: 90, value: 'FULL_TIME' as const },
  { weight: 7, value: 'CONTRACT' as const },
  { weight: 3, value: 'PART_TIME' as const },
];

// Annual gross for a rank-3 (mid) employee, in local major units. Genuinely
// different levels per country.
const COUNTRY_BASE_MAJOR: Record<string, number> = {
  US: 130_000,
  IN: 2_400_000,
  GB: 72_000,
  DE: 84_000,
  FR: 66_000,
  JP: 8_800_000,
  SG: 105_000,
  BR: 190_000,
};

// Pay rises with rank.
const LEVEL_FACTOR: Record<number, number> = {
  1: 0.55,
  2: 0.72,
  3: 1.0,
  4: 1.4,
  5: 2.0,
  6: 3.0,
};

// Departments don't pay the same — so "what does Engineering cost" has an answer.
const DEPARTMENT_FACTOR: Record<number, number> = {
  1: 1.15, // Engineering
  2: 1.05, // Sales
  3: 0.85, // Support
  4: 1.0, // Finance
  5: 0.9, // HR
};

// Round salaries to something that looks offered, not computed.
const STEP_MAJOR: Record<string, number> = {
  USD: 500,
  EUR: 500,
  GBP: 500,
  SGD: 500,
  BRL: 1000,
  INR: 20_000,
  JPY: 50_000,
};

const ROLE: Record<number, string> = {
  1: 'Engineer',
  2: 'Account Executive',
  3: 'Support Specialist',
  4: 'Financial Analyst',
  5: 'People Partner',
};

const LEVEL_PREFIX: Record<number, string> = {
  1: 'Junior ',
  2: 'Associate ',
  3: '',
  4: 'Senior ',
  5: 'Staff ',
  6: 'Principal ',
};

// ---------------------------------------------------------------------------
// Row shapes
// ---------------------------------------------------------------------------

export interface EmployeeRow {
  id: number;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  departmentId: number;
  jobLevelId: number;
  jobTitle: string;
  countryCode: string;
  employmentType: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT';
  hireDate: string;
  status: 'ACTIVE' | 'TERMINATED';
}

export interface SalaryRow {
  id: number;
  employeeId: number;
  amountMinor: number;
  currencyCode: string;
  effectiveFrom: string;
  changeReason: 'HIRE' | 'MERIT' | 'PROMOTION' | 'MARKET_ADJUSTMENT';
  note: string | null;
  effectiveTo: string | null;
  supersededAt: Date | null;
  supersededById: number | null;
  fxRateSetId: number;
  fxRateToBase: string;
  amountBaseMinor: number;
  createdAt: Date;
  createdBy: string;
}

export interface Dataset {
  employees: EmployeeRow[];
  salaries: SalaryRow[];
  correctionLinks: Array<{ originalId: number; replacementId: number }>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isoOf(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addMonths(iso: string, months: number): string {
  const d = new Date(`${iso}T00:00:00.000Z`);
  d.setUTCMonth(d.getUTCMonth() + months);
  return isoOf(d);
}

function previousDay(iso: string): string {
  const d = new Date(`${iso}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return isoOf(d);
}

/** The one place a float is allowed (data-model.md §4). Rounded straight back. */
function toBaseMinor(amountMinor: number, currency: string): number {
  const srcExp = EXPONENT[currency] ?? 2;
  const baseExp = EXPONENT[BASE_CURRENCY] ?? 2;
  const rate = RATE_TO_BASE[currency] ?? 1;
  return Math.round(amountMinor * rate * 10 ** (baseExp - srcExp));
}

function roundToStepMinor(major: number, currency: string): number {
  const step = STEP_MAJOR[currency] ?? 1000;
  const exp = EXPONENT[currency] ?? 2;
  const roundedMajor = Math.max(step, Math.round(major / step) * step);
  return roundedMajor * 10 ** exp;
}

// ---------------------------------------------------------------------------
// Generation
// ---------------------------------------------------------------------------

export function generate(count = 10_000): Dataset {
  faker.seed(SEED);

  const employees: EmployeeRow[] = [];
  const salaries: SalaryRow[] = [];
  const correctionLinks: Array<{ originalId: number; replacementId: number }> =
    [];
  let salaryId = 0;

  for (let id = 1; id <= count; id++) {
    const countryCode = faker.helpers.weightedArrayElement(COUNTRIES_W);
    const departmentId = faker.helpers.weightedArrayElement(DEPARTMENTS_W);
    const rank = faker.helpers.weightedArrayElement(LEVELS_W);
    const currency = COUNTRY_CURRENCY[countryCode] ?? 'USD';

    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const slug = (s: string): string => s.toLowerCase().replace(/[^a-z]/g, '');

    const hireDate = isoOf(
      faker.date.between({ from: '2020-09-01', to: '2026-05-01' }),
    );

    employees.push({
      id,
      employeeCode: `E${1000 + id}`,
      firstName,
      lastName,
      email: `${slug(firstName)}.${slug(lastName)}.${id}@acme.example`,
      departmentId,
      jobLevelId: rank, // job_level ids 1..6 line up with rank 1..6
      jobTitle: `${LEVEL_PREFIX[rank] ?? ''}${ROLE[departmentId] ?? 'Specialist'}`,
      countryCode,
      employmentType: faker.helpers.weightedArrayElement(EMPLOYMENT_W),
      hireDate,
      status: faker.helpers.weightedArrayElement([
        { weight: 95, value: 'ACTIVE' as const },
        { weight: 5, value: 'TERMINATED' as const },
      ]),
    });

    // --- salary timeline: 1–5 records over the last 1–6 years ---
    const startMajor =
      (COUNTRY_BASE_MAJOR[countryCode] ?? 100_000) *
      (LEVEL_FACTOR[rank] ?? 1) *
      (DEPARTMENT_FACTOR[departmentId] ?? 1) *
      faker.number.float({ min: 0.85, max: 1.18 });

    let currentMinor = roundToStepMinor(startMajor, currency);
    let effFrom = hireDate;
    const wanted = faker.number.int({ min: 1, max: 5 });
    const periods: SalaryRow[] = [];

    for (let n = 0; n < wanted; n++) {
      const reason: SalaryRow['changeReason'] =
        n === 0
          ? 'HIRE'
          : faker.helpers.weightedArrayElement([
              { weight: 70, value: 'MERIT' as const },
              { weight: 22, value: 'PROMOTION' as const },
              { weight: 8, value: 'MARKET_ADJUSTMENT' as const },
            ]);

      if (n > 0) {
        const pct =
          reason === 'MERIT'
            ? faker.number.float({ min: 0.03, max: 0.08 })
            : reason === 'PROMOTION'
              ? faker.number.float({ min: 0.12, max: 0.24 })
              : faker.number.float({ min: 0.05, max: 0.11 });
        currentMinor = roundToStepMinor(
          (currentMinor / 10 ** (EXPONENT[currency] ?? 2)) * (1 + pct),
          currency,
        );
      }

      salaryId += 1;
      periods.push({
        id: salaryId,
        employeeId: id,
        amountMinor: currentMinor,
        currencyCode: currency,
        effectiveFrom: effFrom,
        changeReason: reason,
        note: null,
        effectiveTo: null, // closed below
        supersededAt: null,
        supersededById: null,
        fxRateSetId: fxRateSet.id,
        fxRateToBase: (RATE_TO_BASE[currency] ?? 1).toFixed(8),
        amountBaseMinor: toBaseMinor(currentMinor, currency),
        createdAt: new Date(`${effFrom}T09:00:00.000Z`),
        createdBy: HR_EMAIL,
      });

      const nextFrom = addMonths(effFrom, faker.number.int({ min: 10, max: 22 }));
      if (new Date(`${nextFrom}T00:00:00.000Z`) >= NOW) break;
      effFrom = nextFrom;
    }

    for (let i = 0; i < periods.length - 1; i++) {
      const here = periods[i];
      const next = periods[i + 1];
      if (here && next) here.effectiveTo = previousDay(next.effectiveFrom);
    }

    // ~3% carry a correction so the audit view isn't empty
    if (periods.length > 0 && faker.number.float({ min: 0, max: 1 }) < 0.03) {
      const target = faker.helpers.arrayElement(periods);
      const exp = EXPONENT[currency] ?? 2;
      const fixedMinor = roundToStepMinor(
        (target.amountMinor / 10 ** exp) *
          faker.number.float({ min: 0.94, max: 1.09 }),
        currency,
      );
      const supersededAt = faker.date.between({
        from: new Date(`${target.effectiveFrom}T00:00:00.000Z`),
        to: NOW,
      });

      salaryId += 1;
      const replacement: SalaryRow = {
        id: salaryId,
        employeeId: id,
        amountMinor: fixedMinor,
        currencyCode: currency,
        effectiveFrom: target.effectiveFrom, // copied
        changeReason: target.changeReason, // copied — never 'CORRECTION'
        note: `Corrects #${target.id}: ${faker.helpers.arrayElement([
          'transposed digits in the amount',
          'wrong pay band applied',
          'off-cycle adjustment keyed twice',
          'allowance missing from the original',
        ])}`,
        effectiveTo: target.effectiveTo, // copied
        supersededAt: null,
        supersededById: null,
        fxRateSetId: fxRateSet.id,
        fxRateToBase: (RATE_TO_BASE[currency] ?? 1).toFixed(8),
        amountBaseMinor: toBaseMinor(fixedMinor, currency),
        createdAt: supersededAt,
        createdBy: HR_EMAIL,
      };
      target.supersededAt = supersededAt;
      correctionLinks.push({
        originalId: target.id,
        replacementId: replacement.id,
      });
      periods.push(replacement);
    }

    for (const p of periods) salaries.push(p);
  }

  return { employees, salaries, correctionLinks };
}
