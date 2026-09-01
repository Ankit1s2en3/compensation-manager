import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  char,
  date,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  smallint,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';

// ---------------------------------------------------------------------------
// Enums (docs/data-model.md §2)
// ---------------------------------------------------------------------------

export const employmentType = pgEnum('employment_type', [
  'FULL_TIME',
  'PART_TIME',
  'CONTRACT',
]);

export const employeeStatus = pgEnum('employee_status', ['ACTIVE', 'TERMINATED']);

/** Why pay changed. Deliberately no CORRECTION — a correction copies the reason. */
export const changeReason = pgEnum('change_reason', [
  'HIRE',
  'MERIT',
  'PROMOTION',
  'MARKET_ADJUSTMENT',
]);

// ---------------------------------------------------------------------------
// Reference data
// ---------------------------------------------------------------------------

export const currencies = pgTable('currencies', {
  code: char('code', { length: 3 }).primaryKey(), // ISO 4217
  exponent: smallint('exponent').notNull(), // JPY 0, USD 2, KWD 3 — table-driven
  name: text('name').notNull(),
});

export const fxRateSets = pgTable(
  'fx_rate_sets',
  {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    asOfDate: date('as_of_date').notNull(),
    isActive: boolean('is_active').notNull().default(false),
  },
  (t) => [
    // Exactly one active rate set (R3).
    uniqueIndex('one_active_rate_set')
      .on(t.isActive)
      .where(sql`${t.isActive}`),
  ],
);

export const exchangeRates = pgTable(
  'exchange_rates',
  {
    rateSetId: integer('rate_set_id')
      .notNull()
      .references(() => fxRateSets.id),
    currencyCode: char('currency_code', { length: 3 })
      .notNull()
      .references(() => currencies.code),
    rateToBase: numeric('rate_to_base', { precision: 18, scale: 8 }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.rateSetId, t.currencyCode] })],
);

export const departments = pgTable('departments', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
});

export const jobLevels = pgTable('job_levels', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  rank: integer('rank').notNull(), // "senior" sorts above "junior"
});

// ---------------------------------------------------------------------------
// Employees
// ---------------------------------------------------------------------------

export const employees = pgTable(
  'employees',
  {
    id: serial('id').primaryKey(),
    employeeCode: text('employee_code').notNull().unique(), // business key, CSV key
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    email: text('email').notNull().unique(),
    departmentId: integer('department_id')
      .notNull()
      .references(() => departments.id),
    jobLevelId: integer('job_level_id')
      .notNull()
      .references(() => jobLevels.id),
    jobTitle: text('job_title').notNull(),
    countryCode: char('country_code', { length: 2 }).notNull(),
    employmentType: employmentType('employment_type').notNull(),
    hireDate: date('hire_date').notNull(),
    managerId: integer('manager_id').references(
      (): AnyPgColumn => employees.id,
    ),
    status: employeeStatus('status').notNull().default('ACTIVE'),
  },
  (t) => [
    index('employees_dept').on(t.departmentId),
    index('employees_country').on(t.countryCode),
    index('employees_level').on(t.jobLevelId),
  ],
);

// ---------------------------------------------------------------------------
// Salary records — the important one (§2)
//
// Business facts (employee_id, amount_minor, currency_code, effective_from,
// change_reason) are immutable: enforced by the reject_fact_update() trigger in
// the hand-written migration, not here. effective_to, superseded_* and the
// derived FX columns are the legitimate mutations.
// ---------------------------------------------------------------------------

export const salaryRecords = pgTable('salary_records', {
  id: serial('id').primaryKey(),
  employeeId: integer('employee_id')
    .notNull()
    .references(() => employees.id),
  amountMinor: bigint('amount_minor', { mode: 'number' }).notNull(),
  currencyCode: char('currency_code', { length: 3 })
    .notNull()
    .references(() => currencies.code),
  effectiveFrom: date('effective_from').notNull(),
  changeReason: changeReason('change_reason').notNull(),
  note: text('note'),
  effectiveTo: date('effective_to'), // null = open
  supersededAt: timestamp('superseded_at', { withTimezone: true }), // null = live
  supersededById: integer('superseded_by_id').references(
    (): AnyPgColumn => salaryRecords.id,
  ),
  fxRateSetId: integer('fx_rate_set_id')
    .notNull()
    .references(() => fxRateSets.id),
  fxRateToBase: numeric('fx_rate_to_base', { precision: 18, scale: 8 }).notNull(),
  amountBaseMinor: bigint('amount_base_minor', { mode: 'number' }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  createdBy: text('created_by').notNull(),
});

// ---------------------------------------------------------------------------
// Users — a single seeded HR manager
// ---------------------------------------------------------------------------

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull(),
});
