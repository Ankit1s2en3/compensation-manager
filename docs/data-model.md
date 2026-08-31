# Data Model

*Companion to `requirements.md`. Everything the schema needs to be re-derived from scratch.*

---

## 1. The three rules everything else follows from

**R1 — Money is an integer count of minor units, plus a currency code.**
Never a float, never a bare number. The number of minor units per major unit varies by
currency, so it is looked up, never assumed.

**R2 — A salary change is a new record, never an update.**
The business facts on a salary record (`employee_id`, `amount_minor`, `currency_code`,
`effective_from`, `change_reason`) are immutable. A mistake is fixed by superseding, not editing.

**R3 — Cross-currency comparison uses one organisation-wide rate set.**
The rate is copied onto the record at write time. Reports do not move when markets do.

---

## 2. Tables

### `currencies`

| column | type | notes |
|---|---|---|
| `code` | `char(3)` PK | ISO 4217 — `INR`, `USD`, `EUR`, `JPY`, `GBP` … |
| `exponent` | `smallint` | decimal places. **JPY = 0, USD = 2, KWD = 3** |
| `name` | `text` | |

> Seed JPY deliberately. Its exponent of 0 breaks the naive `× 100` assumption, and having it
> in the data proves the conversion is actually table-driven.

### `fx_rate_sets`

| column | type | notes |
|---|---|---|
| `id` | PK | |
| `name` | `text` | `"FY2026 Planning Rates"` |
| `as_of_date` | `date` | |
| `is_active` | `boolean` | exactly one row true — enforce with a partial unique index |

```sql
CREATE UNIQUE INDEX one_active_rate_set
  ON fx_rate_sets ((is_active)) WHERE is_active;
```

### `exchange_rates`

| column | type | notes |
|---|---|---|
| `rate_set_id` | FK | |
| `currency_code` | FK | |
| `rate_to_base` | `numeric(18,8)` | **`numeric`, not `real`** — exact decimal |

Unique on `(rate_set_id, currency_code)`. The base currency has a rate of exactly `1.0`.

### `departments`, `job_levels`

Small lookup tables. `job_levels` carries a `rank` so "senior" sorts above "junior".

### `employees`

| column | type | notes |
|---|---|---|
| `id` | PK | |
| `employee_code` | `text` UNIQUE | `E1001` — the business key, and the CSV import key |
| `first_name`, `last_name`, `email` | `text` | email unique |
| `department_id`, `job_level_id` | FK | |
| `job_title` | `text` | |
| `country_code` | `char(2)` | |
| `employment_type` | enum | `FULL_TIME` \| `PART_TIME` \| `CONTRACT` |
| `hire_date` | `date` | |
| `manager_id` | FK self, nullable | |
| `status` | enum | `ACTIVE` \| `TERMINATED` |

### `salary_records` — the important one

| column | type | mutable? | notes |
|---|---|---|---|
| `id` | PK | — | |
| `employee_id` | FK | **never** | |
| `amount_minor` | `bigint` | **never** | 200000000 = ₹20,00,000 |
| `currency_code` | FK | **never** | |
| `effective_from` | `date` | **never** | |
| `change_reason` | enum | **never** | `HIRE` \| `MERIT` \| `PROMOTION` \| `MARKET_ADJUSTMENT`. **Not** a place for `CORRECTION` — see below. |
| `note` | `text` | never | |
| `effective_to` | `date` null | **once** | set when the next period opens. `null` = open |
| `superseded_at` | `timestamptz` null | **once** | set when corrected. `null` = live |
| `superseded_by_id` | FK self null | once | points at the replacement |
| `fx_rate_set_id` | FK | on recompute | which rates were used |
| `fx_rate_to_base` | `numeric(18,8)` | on recompute | the exact rate copied |
| `amount_base_minor` | `bigint` | on recompute | derived. the comparable figure |
| `created_at` | `timestamptz` | never | |
| `created_by` | `text` | never | |

> **This table is not "append-only".** The business facts are immutable; `effective_to`,
> `superseded_at` and the derived FX columns are not. Say it that way — it's the accurate
> description and the imprecise version invites a fair challenge.

> **`CORRECTION` is deliberately not a `change_reason`.** Two orthogonal facts were being
> conflated: *why did pay change* (merit, promotion, …) and *is this record a fix of an
> earlier one*. Putting `CORRECTION` in the reason enum destroys the first to record the
> second — a corrected promotion stops being a promotion, and
> `COUNT(*) WHERE change_reason = 'PROMOTION'` silently under-reports. A correction therefore
> **copies the original record's `change_reason`**, and the `superseded_by_id` link is what
> marks it as a correction. The human explanation goes in `note`.

### `users`

Single seeded HR manager. `id`, `email`, `password_hash`, `role`.

---

## 3. Enforcing immutability in the database

A rule that lives only in the service layer is a habit, not a rule.

```sql
CREATE FUNCTION reject_fact_update() RETURNS trigger AS $$
BEGIN
  IF NEW.amount_minor   IS DISTINCT FROM OLD.amount_minor
  OR NEW.currency_code  IS DISTINCT FROM OLD.currency_code
  OR NEW.effective_from IS DISTINCT FROM OLD.effective_from
  OR NEW.employee_id    IS DISTINCT FROM OLD.employee_id
  OR NEW.change_reason  IS DISTINCT FROM OLD.change_reason THEN
    RAISE EXCEPTION 'salary_records: business facts are immutable (record %)', OLD.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER salary_records_immutable_facts
  BEFORE UPDATE ON salary_records
  FOR EACH ROW EXECUTE FUNCTION reject_fact_update();
```

Note this deliberately permits the two legitimate updates — `effective_to` and
`superseded_at` / `superseded_by_id`.

### Overlap made impossible, not merely tested

Application code enforces I1 so it can return a good error message. The database enforces it
so the rule cannot be broken by any other path:

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE salary_records ADD CONSTRAINT salary_no_overlap
  EXCLUDE USING gist (
    employee_id                                  WITH =,
    daterange(effective_from, effective_to, '[]') WITH &&
  ) WHERE (superseded_at IS NULL);
```

An exclusion constraint is the generalisation of `UNIQUE`: instead of "these columns must not
be equal", it says "these expressions must not *overlap*". The `WHERE` clause is what lets a
superseded row share dates with its replacement.

---

## 4. Currency conversion

```
amount_base_minor = round( amount_minor × rate_to_base × 10^(base_exponent − source_exponent) )
```

The `10^(…)` term is the whole reason the exponent table exists. When both currencies have
2 decimals it collapses to 1 and disappears — which is why the bug it prevents is invisible
until a zero-decimal currency shows up.

**Worked examples**, base = USD (exponent 2), rate set `FY2026`:

| Employee | Salary | `amount_minor` | exp | rate | calculation | `amount_base_minor` |
|---|---|---|---|---|---|---|
| Priya (IN) | ₹20,00,000 | 200,000,000 | 2 | 0.0115 | `× 0.0115 × 10⁰` | 2,300,000 → **$23,000** |
| John (US) | $120,000 | 12,000,000 | 2 | 1.0 | `× 1 × 10⁰` | 12,000,000 → **$120,000** |
| Marie (FR) | €95,000 | 9,500,000 | 2 | 1.08 | `× 1.08 × 10⁰` | 10,260,000 → **$102,600** |
| Kenji (JP) | ¥10,000,000 | 10,000,000 | **0** | 0.0068 | `× 0.0068 × 10²` | 6,800,000 → **$68,000** |

Without the exponent adjustment Kenji comes out at **$680**. Silently.

### Float discipline

JavaScript floats are wrong in the small: `0.1 + 0.2 → 0.30000000000000004`,
`19.99 * 100 → 1998.9999999999998`.

> **Floats are permitted for exactly one operation in this system: the FX multiply. The
> result is `Math.round()`ed straight back to an integer.** Every subsequent operation —
> summing 10,000 salaries, averaging by department — is integer arithmetic and therefore exact.

`Math.round`, never `Math.floor` or `parseInt`.

JS integers are safe to ~9×10¹⁵. Total payroll of 10,000 people is ~2×10¹¹ cents. No `BigInt`
needed; `bigint` in Postgres, plain `number` in TypeScript.

---

## 5. Invariants the tests exist to protect

```
I1  No two LIVE records for the same employee may overlap in date.
    (live = superseded_at IS NULL)
I2  At most one LIVE record per employee may have effective_to = NULL.
I3  effective_from >= the employee's hire_date.
I4  amount_minor > 0 and is a whole number.
I5  A record may be superseded at most once.
I6  A correction copies effective_from, effective_to AND change_reason from the
    record it replaces. Only the amount and the note differ.
I7  Both writes below are atomic. A half-applied change is unrepairable.
I8  A new salary change must start strictly AFTER the latest live record's
    effective_from. Retroactive insertion into the middle of the timeline is
    rejected — that is what corrections are for.
```

> **Why I8 exists.** "Close the currently-open period at `newFrom − 1`" is only correct when
> `newFrom` is after that period's start. Insert a change dated 2025-06-01 while the open
> period began 2026-04-01 and you produce `effective_to < effective_from` — a corrupt row.
> The general fix is to locate the period covering `newFrom`, split it, and bound the new
> record by the next period's start. That is the right long-term model; it is rejected here
> because I8 removes the case entirely for one line of validation, and every realistic HR
> scenario ("approved in August, effective from April") still works so long as April is after
> the previous change. Recorded in `docs/adr/`.

---

## 6. The two writes

### Raise — close the open period, open a new one

```sql
BEGIN;

UPDATE salary_records
SET    effective_to = DATE '2026-04-01' - 1
WHERE  employee_id = 5
  AND  superseded_at IS NULL
  AND  effective_to IS NULL;

INSERT INTO salary_records
  (employee_id, amount_minor, currency_code, effective_from, effective_to,
   change_reason, fx_rate_set_id, fx_rate_to_base, amount_base_minor)
VALUES
  (5, 200000000, 'INR', DATE '2026-04-01', NULL,
   'MERIT', 1, 0.0115, 2300000);

COMMIT;
```

### Correction — insert the replacement, then mark the original

```sql
BEGIN;

INSERT INTO salary_records
  (employee_id, amount_minor, currency_code, effective_from, effective_to,
   change_reason, note, fx_rate_set_id, fx_rate_to_base, amount_base_minor)
SELECT
  employee_id, 220000000, currency_code, effective_from, effective_to,
  change_reason,                                    -- ← keeps MERIT, not 'CORRECTION'
  'Corrects #2: entered as 20L, contract says 22L',
  fx_rate_set_id, fx_rate_to_base, 2530000
FROM   salary_records
WHERE  id = 2
RETURNING id;                       -- → 3

UPDATE salary_records
SET    superseded_at = now(), superseded_by_id = 3
WHERE  id = 2
  AND  superseded_at IS NULL;       -- guard: cannot supersede twice

COMMIT;
```

Resulting timeline:

| id | amount | eff_from | eff_to | reason | note | superseded_at | superseded_by |
|---|---|---|---|---|---|---|---|
| 1 | ₹15,00,000 | 2023-01-01 | 2026-03-31 | HIRE | | `null` | `null` |
| 2 | ₹20,00,000 | 2026-04-01 | `null` | MERIT | | 2026-08-29 | 3 |
| 3 | ₹22,00,000 | 2026-04-01 | `null` | **MERIT** | Corrects #2… | `null` | `null` |

Rows 2 and 3 share dates. Only row 3 is live — and it is still a merit increase, so
"how many merit increases this year" stays correct.

**Is row 3 a correction?** Yes, and you don't need a flag to know it: a row is a correction
if some other row has `superseded_by_id` pointing at it. The timeline query already returns
every row for the employee, so the UI resolves this in memory — no extra query.

---

## 7. Reads

**Current salary**

```sql
SELECT * FROM salary_records
WHERE  employee_id = $1
  AND  superseded_at IS NULL
  AND  effective_from <= CURRENT_DATE
  AND  (effective_to IS NULL OR effective_to >= CURRENT_DATE);
```

**Clean timeline** — the same, minus the date filters.
**Audit view** — no `superseded_at` filter; render superseded rows struck through with
"corrected on …". Ten minutes of UI that makes the whole design visible in the demo.

**Insights** — the payoff of storing `amount_base_minor`:

```sql
SELECT d.name                                       AS department,
       COUNT(*)                                     AS headcount,
       SUM(s.amount_base_minor)                     AS total_cost_cents,
       AVG(s.amount_base_minor)::bigint             AS mean_cents,
       PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY s.amount_base_minor) AS median_cents,
       PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY s.amount_base_minor) AS p25_cents,
       PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY s.amount_base_minor) AS p75_cents
FROM   salary_records s
JOIN   employees   e ON e.id = s.employee_id
JOIN   departments d ON d.id = e.department_id
WHERE  s.superseded_at IS NULL
  AND  s.effective_from <= CURRENT_DATE
  AND  (s.effective_to IS NULL OR s.effective_to >= CURRENT_DATE)
  AND  e.status = 'ACTIVE'
GROUP  BY d.name
ORDER  BY total_cost_cents DESC;
```

`PERCENTILE_CONT` is the specific reason this is Postgres and not SQLite.

---

## 8. Indexes

```sql
-- the hot path: find an employee's live, current record
CREATE INDEX salary_current
  ON salary_records (employee_id, effective_from DESC)
  WHERE superseded_at IS NULL;

-- the aggregation path
CREATE INDEX salary_live_open
  ON salary_records (employee_id)
  INCLUDE (amount_base_minor)
  WHERE superseded_at IS NULL AND effective_to IS NULL;

-- directory filters
CREATE INDEX employees_dept    ON employees (department_id);
CREATE INDEX employees_country ON employees (country_code);
CREATE INDEX employees_level   ON employees (job_level_id);

-- name search
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX employees_name_trgm
  ON employees USING gin ((first_name || ' ' || last_name) gin_trgm_ops);
```

Capture `EXPLAIN ANALYZE` before and after adding these against the 10k seed — that output
is the performance artifact the brief asks for.

---

## 9. Seed data

10,000 employees. Deterministic (fixed faker seed). **Realistic, not uniform** — if the seed
is flat, the dashboard is flat and the demo falls over:

- Department sizes are skewed: Engineering ≫ Sales > Support > Finance > HR
- 8 countries with genuinely different pay levels (US, IN, GB, DE, FR, JP, SG, BR)
- Pay rises with `job_level.rank`, with realistic within-level spread
- 1–5 salary records each, spread over the last 1–6 years
- ~3% of employees carry a `CORRECTION` in their history, so the audit view is not empty
- ~5% `TERMINATED`, so status filtering is exercised

---

## 10. Domain API

Sections 1–9 describe the database. This section describes the `domain/compensation/`
objects, so the code and the schema stay in step.

### `SalaryRecord`

One row, as an object. Immutable. Holds `Money` rather than a bare number:

```ts
class SalaryRecord {
  readonly id: string;
  readonly employeeId: string;
  readonly amount: Money;
  readonly effectiveFrom: LocalDate;
  readonly effectiveTo: LocalDate | null;   // null = open
  readonly changeReason: ChangeReason;
  readonly note: string | null;
  readonly supersededAt: Date | null;       // null = live
  readonly supersededById: string | null;

  get isLive(): boolean;                    // supersededAt === null
  get isOpen(): boolean;                    // effectiveTo === null
  covers(on: LocalDate): boolean;           // effectiveFrom <= on <= (effectiveTo ?? ∞)
}
```

### `SalaryTimeline`

Every record for one employee, plus the rules. **Pure — no I/O, no `new Date()`.**

```ts
class SalaryTimeline {
  constructor(records: readonly SalaryRecord[], hireDate: LocalDate) {}

  live(): SalaryRecord[]                      // not superseded
  currentAt(on: LocalDate): SalaryRecord|null // the live record covering `on`
  latest(): SalaryRecord | null               // live record with the greatest effectiveFrom
  openPeriod(): SalaryRecord | null           // live record with effectiveTo === null

  recordChange(cmd: PendingChange): TimelineWrites   // validates; throws on I3/I8/I4
  correct(recordId, amount: Money, note): TimelineWrites  // throws on I5
}
```

**`currentAt` is invariant §7's "current salary" query, expressed in code.** The repository
also implements it in SQL, because looking up one employee should not load their whole history.
The duplication is deliberate and narrow: the domain version is the specification and is what
the tests cover; the SQL version is an optimisation that must agree with it.

### The domain does not write

`recordChange` and `correct` return a **description** of the writes rather than performing
them, which is what keeps `domain/` free of I/O:

```ts
type TimelineWrites = {
  closePeriod?: { recordId: string; effectiveTo: LocalDate };
  supersede?:   { recordId: string; at: Date };
  insert:       NewSalaryRecord;
};
```

The application layer executes them inside one transaction (I7). The domain decides *what*
must happen; the application decides *how*.

### Dates are calendar dates, not instants

`effective_from` and `effective_to` are days, with no time and no timezone. Using a JavaScript
`Date` invites the classic bug where `2026-04-01` becomes `2026-03-31T18:30:00Z` in IST and an
effective date silently moves a day. Use a `LocalDate` holding a `YYYY-MM-DD` string — ISO
dates compare correctly as plain strings, so ordering and range checks stay trivial.

`Clock` returns `today(): LocalDate` for effective-dating and `now(): Date` for
`superseded_at`, which genuinely is an instant.
