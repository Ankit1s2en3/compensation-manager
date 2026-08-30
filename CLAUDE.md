# CLAUDE.md

Working agreement for this repository. Read `docs/requirements.md` and `docs/data-model.md`
before making design decisions — they are the source of truth and this file is the summary.

---

## What this is

**Compensation Manager** — salary management for a 10,000-employee, multi-country
organisation. Single persona: an HR manager. It answers *what do we pay people, and how did
we get here*.

It is **not** payroll. See the out-of-scope table in `docs/requirements.md`.

---

## Stack

| Layer | Choice |
|---|---|
| Backend | Node 24 (Active LTS) + TypeScript, Fastify |
| ORM | Drizzle |
| Database | PostgreSQL 16 |
| Validation | Zod at the HTTP boundary |
| Tests | Vitest, Supertest, React Testing Library |
| Frontend | React 19 + Vite, TanStack Query, TanStack Table, shadcn/ui, Recharts |
| Local | Docker Compose |

---

## Architecture

Four layers. **Dependencies point inward only.**

```
http/  ──►  application/  ──►  domain/
                 ▲
        infrastructure/  (implements application/ports/*)
```

```
apps/api/src/
├── domain/          pure. no DB, no framework, no I/O, no `new Date()`.
│   ├── money/       Money, Currency (exponent table)
│   ├── compensation/ SalaryRecord, SalaryTimeline, ChangeReason
│   ├── analytics/   Percentile
│   └── shared/      Clock, DomainError
├── application/     use cases, one class per action
│   └── ports/       interfaces only — EmployeeRepository, SalaryRecordRepository, ExchangeRateProvider
├── infrastructure/  drizzle schema, migrations, repository implementations
├── http/            routes (thin), zod schemas, middleware
├── seed/
└── container.ts     composition root
```

**The test of whether this is right:** delete `infrastructure/` and `http/`. The `domain/`
tests must still pass.

Routes are thin — validate, delegate, respond. If a route has an `if` about business rules,
it belongs in `application/` or `domain/`.

---

## Non-negotiable domain rules

**Money**
- Integer minor units + currency code. Never a float, never a bare number.
- Currency exponents are table-driven. JPY = 0, USD = 2, KWD = 3. **Never hardcode `× 100`.**
- `Money.plus()` throws on currency mismatch.
- `Money` is immutable — operations return new instances.

**Salary records**
- A raise is a new record. Never `UPDATE amount`.
- Immutable facts: `employee_id`, `amount_minor`, `currency_code`, `effective_from`,
  `change_reason`. A DB trigger enforces this.
- Corrections supersede (`superseded_at` + `superseded_by_id`), never overwrite. A correction
  **copies the original's `change_reason`** — `CORRECTION` is not a reason. Conflating the two
  makes a corrected promotion stop counting as a promotion.
- Live records for one employee must never overlap in date. Enforced by a Postgres
  `EXCLUDE USING gist` constraint, not only by application code.
- A new change must start strictly after the latest live record's `effective_from`.
  Retroactive mid-timeline insertion is rejected; that is what corrections are for.
- Raise and correction are each **two writes in one transaction**.

**FX**
- One active `fx_rate_set`. Rate is snapshotted onto the record at write time.
- `base = round(amount_minor × rate × 10^(base_exp − src_exp))`
- **Floats are permitted for exactly one operation: that multiply.** `Math.round` immediately
  after — never `Math.floor` or `parseInt`. Everything downstream is integer arithmetic.
- Postgres rate columns are `numeric`, never `real`.

**Time**
- **Never call `new Date()` inside `domain/` or `application/`.** Inject `Clock`.
  Effective-dated logic depends on "today" and tests must not rot.

---

## Testing

TDD where it's real: write the failing test first for anything in `domain/`.

| Layer | How | Speed |
|---|---|---|
| `domain/` | plain unit tests, no DB | the bulk of the suite, milliseconds |
| `application/` | in-memory fake repositories | fast |
| `infrastructure/` + `http/` | Supertest against Dockerised Postgres, ~12 fixture employees | a handful only |
| React | RTL on the salary-change form | a handful only |

Rules:
- **Never seed 10,000 rows in a test.** Twelve deterministic fixtures.
- Fixed faker seed. Injected clock. No `Date.now()` in assertions.
- Test the deny paths — overlap rejected, currency mismatch rejected, double-correction
  rejected, rollback on partial failure. Those are the ones people skip.
- A reviewer should be able to learn the business rules from the test names alone.

---

## Commits

Small, vertical, conventional. The history is graded — it should read as evolution, not as
one dump.

```
docs: add requirements and data model
feat(domain): Money value object with currency-mismatch guard
test(domain): salary timeline rejects overlapping effective dates
feat(api): paginated employee directory endpoint
```

Commit after each green test or each working vertical slice. Never a single "initial commit"
containing the whole app.

---

## Out of scope — do not build these

Adding any of these is a regression, not a feature. They are excluded deliberately and the
reasoning is in `docs/requirements.md`.

- Payroll: payslips, tax, PF/ESI, deductions, bank files, monthly paid-amount records.
  Monthly figures are **derivable** from the timeline; storing them duplicates a fact.
- Auth beyond one seeded HR user with JWT.
- Approval workflows, bonuses, equity, benefits, allowances.
- Live FX API calls.
- Employee self-service, org chart, performance reviews, time-off.

---

## Commands

```bash
docker compose up -d          # postgres
npm run db:migrate
npm run db:seed               # 10,000 employees, deterministic
npm run dev

npm test                      # everything
npm run test:unit             # domain only — no DB, instant
npm run test:integration      # needs postgres up
```

---

## Artifacts to keep current

These are graded alongside the code — update them as decisions change, don't leave them to
the last hour.

- `docs/requirements.md` — scope and, especially, what was excluded and why
- `docs/data-model.md` — schema, invariants, conversion formula
- `docs/adr/` — one per real decision, **including the option that was rejected and why**.
  An ADR listing only the chosen option isn't an ADR.
- `docs/ai-usage.md` — **where AI was wrong and it was caught.** "I used Claude" scores
  nothing. "The generated service did `UPDATE salary SET amount = ?`, which would have
  destroyed history; rejected and replaced with an append-only effective-dated model" is the
  whole point of the exercise.
- `docs/performance.md` — `EXPLAIN ANALYZE` before and after the indexes, on the 10k seed.
