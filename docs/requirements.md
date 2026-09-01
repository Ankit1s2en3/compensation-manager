# Compensation Manager — Requirements

*v0.1 · 29 August 2026 · written before any code*

---

## Goal

Replace the spreadsheets ACME's HR team uses to manage salary data for ~10,000 employees
across multiple countries with a web application that:

1. holds an **auditable** record of what every employee is paid, and
2. **answers questions** about how the organisation pays people.

The second point is the product. A table of salaries is easy; the value is in being able to
ask "what does Engineering cost us in India?" without building another pivot table.

---

## User

One persona: the **HR Manager**.

She owns compensation data for the whole organisation. She is not technical. She works in
Excel today, and her three real problems are:

| Problem today | What it costs her |
|---|---|
| A raise overwrites the old salary | She cannot answer "what did we pay her last year?" |
| Salaries sit in INR, USD, EUR, JPY, GBP | She cannot compare or total anything across countries |
| Every question needs a new pivot table | Answering a leadership question takes half a day |

---

## Questions the product must answer

- What is this employee paid now, and what have they been paid over time?
- What does a department / country / job level cost us per year?
- What is the median and the spread of pay within a group?
- How did we arrive at this number — who changed it, when, and why?

---

## In scope

| # | Feature | Why it earns its place |
|---|---|---|
| 1 | **Employee directory** — server-side search, filter (department / country / level / status), sort and pagination over 10,000 records | The scale is the point. Nothing is loaded into the browser that isn't on screen. |
| 2 | **Employee profile** — current compensation plus the full salary timeline | The history is the thing Excel destroys. |
| 3 | **Record a salary change** — effective-dated, with reason and note | The core write. Never an overwrite. |
| 4 | **Correct a salary record** — without destroying the original | HR makes typos. Corrections must be visible, not silent. |
| 5 | **Compensation insights** — headcount, annualised cost, mean / median / p25 / p75 and distribution, grouped by department, country or level | This is the reason the product exists. |
| 6 | **Seeded dataset** — 10,000 employees across 8 countries, deterministic | Required, and it must be realistic or the dashboard is meaningless. |
| 7 | *(stretch)* **CSV import** with dry-run validation | The migration path off Excel. First feature to cut. |

---

## Out of scope — and why

| Excluded | Reasoning |
|---|---|
| **Payroll processing** — payslips, tax, PF/ESI, statutory deductions, bank files | This system is the source of truth for what an employee *should* be paid, not the system that pays them. Payroll is a regulated, per-country engine and a separate product. Monthly amounts are **derivable** from the effective-dated timeline rather than stored — storing them would duplicate a fact the timeline already contains. A real payroll engine would consume this system via an API. |
| **Authentication beyond a single seeded HR user** | The brief specifies one persona. A JWT-gated single user proves the boundary exists; full RBAC, SSO and user management is scaffolding, not signal. |
| **Approval workflows / multi-level sign-off** | Meaningless with one user. Would add state machine complexity for no demonstrated capability. |
| **Bonuses, equity, benefits, allowances** | Base salary is sufficient to prove the effective-dated, multi-currency model works. Adding components multiplies the data model without changing what it demonstrates. |
| **Live FX rate integration** | Rates are seeded as a versioned rate set. Live rates would make every dashboard figure move daily with nobody's pay changing — noise, not information. It would also make tests non-deterministic. |
| **Employee self-service portal** | Different persona, different auth model, different product. |
| **Full-text / fuzzy search, org chart, performance reviews, time-off** | Adjacent HR features that dilute a focused submission. |

---

## Key design decisions

Recorded as ADRs in `docs/adr/`:

1. **Money is stored as integer minor units, never a float.** Currency exponents differ (JPY 0, USD 2, KWD 3), so the conversion is table-driven, not `× 100`.
2. **Salary changes are effective-dated records, not updates.** Business facts on a salary record are immutable and enforced as such by a database trigger. Corrections supersede rather than overwrite.
3. **Cross-country comparison uses one organisation-wide FX rate set**, snapshotted onto each record at write time — so the same report produces the same number every time it is opened.

---

## Non-functional targets

- Directory page (25 rows, filtered, from 10,000) — **< 300 ms**
- Insights aggregation across 10,000 employees — **< 500 ms**
- Seed is deterministic — same data every run
- Local setup is **one command**
- Domain unit tests run with no database and no network

---

## Success criteria

The submission succeeds if a reviewer can:

1. clone, run one command, and have 10,000 employees on screen
2. give someone a raise, then see both the new salary and the old one
3. make a correction, and still see what the mistake was
4. answer "what does Engineering cost us in India?" in two clicks
5. read the test suite and understand the business rules from it alone

---

## Known limitations

- Only one FX rate set is seeded and it never changes. Activating a new set would require
  recomputing the derived base-currency column across all non-superseded records — a single
  batched `UPDATE`, which in production would run as a background job triggered by activation.
- No pay-band / compa-ratio model, so "is this person paid fairly for their level?" is
  answerable only by comparison against the group distribution, not against a target range.
- A salary change must be dated after the most recent existing change. Inserting a forgotten
  change into the middle of an employee's history is rejected; that case is handled by
  correcting the affected record instead. Forward-dated changes ("approved now, effective in
  April") work normally. The general split-the-covering-period implementation is the correct
  long-term model and is recorded as the rejected alternative in `docs/adr/`.
- CSV import defines its own template rather than accepting arbitrary spreadsheet layouts.
  Parsing whatever shape HR happens to have is a heuristics problem, not an engineering one.
- A correction changes the amount and the note only — never the effective dates. Changing a
  record's `effective_from` or `effective_to` shifts the previous record's end date and can
  push later records into overlapping or inverted ranges. That is timeline re-sequencing, a
  larger operation than a correction, and it is out of scope. A genuinely mis-dated record is
  handled by re-recording the change at the right date once the surrounding periods allow it.
